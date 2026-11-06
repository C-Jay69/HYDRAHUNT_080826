#!/usr/bin/env python3
"""
JobSpy micro-service (stdlib only — no FastAPI/uvicorn runtime required).

Exposes a single endpoint consumed by the HydraHunt Next.js app:

  GET /scrape?keywords=software+engineer&location=Remote&site=linkedin&n=10
  GET /scrape?keywords=...&site=glassdoor,indeed&n=10   (comma-separated sites)

Query params:
  keywords   — search term (required)
  location   — optional location filter (omit for global)
  site       — one JobSpy site or comma list:
               linkedin, indeed, glassdoor, zip_recruiter, google, naukri, bayt, bdjobs
               (default: indeed,glassdoor,zip_recruiter,google)
  n          — results per site (default 10, max 100)
  hours_old  — optional recency filter (e.g. 24, 72, 168)

Returns JSON:
  {"success": true, "jobs": [{...normalized...}], "total": N, "errors": [...]}

The service normalizes every board into the canonical HydraHunt JobOpportunity
shape (title/company/location/job_url/salary/apply_url) so the Node.js side
doesn't need per-board logic. Per-site failures are captured in `errors` and
don't kill the whole request (e.g. Glassdoor 400 on "Remote" location still
returns results from the other boards).

Run:
  python3 mini-services/jobspy-svc/app.py
Or via the wrapper:
  ./mini-services/jobspy-svc/serve.sh

Environment:
  JOBSPY_HOST   bind address (default 127.0.0.1; set 0.0.0.0 in a container)
  JOBSPY_PORT   listen port (default 3001; falls back to PORT for cloud hosts)
  JOBSPY_TOKEN  optional shared secret; REQUIRED when JOBSPY_HOST is not loopback.
                Callers send `Authorization: Bearer <token>` (or X-JobSpy-Token).
                /health stays public for platform health checks.
  JOBSPY_SCRAPE_TIMEOUT  wall-clock seconds allowed per /scrape request (default 60).
  JOBSPY_MAX_WORKERS     concurrent boards scraped per request (default 4).
"""

from __future__ import annotations

import hmac
import json
import os
import queue
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

# Location text -> JobSpy country string. Order matters: longer/more specific
# regions first ("northern ireland" must resolve to the UK, not Ireland).
COUNTRY_HINTS = (
    ("united states", ("usa", "u.s.", "u.s.a.", "us", "united states")),
    ("canada", ("canada",)),
    ("united kingdom", ("uk", "u.k.", "united kingdom", "england", "scotland", "wales", "northern ireland", "great britain", "britain")),
    ("ireland", ("ireland", "eire", "éire")),
    ("australia", ("australia",)),
    ("new zealand", ("new zealand", "aotearoa")),
    ("germany", ("germany", "deutschland")),
    ("france", ("france",)),
    ("netherlands", ("netherlands", "holland")),
    ("spain", ("spain", "españa")),
    ("italy", ("italy", "italia")),
    ("portugal", ("portugal",)),
    ("poland", ("poland",)),
    ("switzerland", ("switzerland",)),
    ("austria", ("austria",)),
    ("belgium", ("belgium",)),
    ("denmark", ("denmark",)),
    ("sweden", ("sweden",)),
    ("norway", ("norway",)),
    ("finland", ("finland",)),
    ("czech republic", ("czech republic", "czechia")),
    ("greece", ("greece",)),
    ("hungary", ("hungary",)),
    ("romania", ("romania",)),
    ("ukraine", ("ukraine",)),
    ("croatia", ("croatia",)),
    ("slovenia", ("slovenia",)),
    ("slovakia", ("slovakia",)),
    ("bulgaria", ("bulgaria",)),
    ("cyprus", ("cyprus",)),
    ("malta", ("malta",)),
    ("luxembourg", ("luxembourg",)),
    ("latvia", ("latvia",)),
    ("lithuania", ("lithuania",)),
    ("estonia", ("estonia",)),
    ("brazil", ("brazil", "brasil")),
    ("mexico", ("mexico", "méxico")),
    ("argentina", ("argentina",)),
    ("chile", ("chile",)),
    ("colombia", ("colombia",)),
    ("peru", ("peru", "perú")),
    ("uruguay", ("uruguay",)),
    ("ecuador", ("ecuador",)),
    ("venezuela", ("venezuela",)),
    ("costa rica", ("costa rica",)),
    ("panama", ("panama", "panamá")),
    ("india", ("india",)),
    ("pakistan", ("pakistan",)),
    ("bangladesh", ("bangladesh",)),
    ("singapore", ("singapore",)),
    ("malaysia", ("malaysia",)),
    ("indonesia", ("indonesia",)),
    ("philippines", ("philippines",)),
    ("thailand", ("thailand",)),
    ("vietnam", ("vietnam",)),
    ("japan", ("japan",)),
    ("china", ("china",)),
    ("south korea", ("south korea", "korea")),
    ("taiwan", ("taiwan",)),
    ("hong kong", ("hong kong",)),
    ("turkey", ("türkiye", "turkey")),
    ("israel", ("israel",)),
    ("united arab emirates", ("united arab emirates", "uae", "u.a.e.", "dubai", "abu dhabi")),
    ("saudi arabia", ("saudi arabia", "saudi")),
    ("qatar", ("qatar",)),
    ("kuwait", ("kuwait",)),
    ("oman", ("oman",)),
    ("bahrain", ("bahrain",)),
    ("south africa", ("south africa",)),
    ("nigeria", ("nigeria",)),
    ("egypt", ("egypt",)),
    ("morocco", ("morocco",)),
)

try:
    from jobspy import scrape_jobs
except Exception as _imp_err:  # pragma: no cover
    print(f"[jobspy-svc] FATAL: cannot import jobspy: {_imp_err}", file=sys.stderr)
    print("[jobspy-svc] Install: pip install python-jobspy", file=sys.stderr)
    sys.exit(1)

# JobSpy's supported site names. We only expose the boards ChocoData can't do
# well, but LinkedIn/Indeed/etc. are available here too as failover.
ALLOWED_SITES = {
    "linkedin",
    "indeed",
    "glassdoor",
    "zip_recruiter",
    "google",
    "naukri",
    "bayt",
    "bdjobs",
}

JOBSPY_HOST = (os.environ.get("JOBSPY_HOST") or "127.0.0.1").strip()
JOBSPY_TOKEN = (os.environ.get("JOBSPY_TOKEN") or "").strip()
DEFAULT_PORT = int(os.environ.get("JOBSPY_PORT") or os.environ.get("PORT") or "3001")
LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost"}

# Bound total work per request: a single wedged board must not hold the request
# (or a client) open indefinitely. Sites are scraped concurrently, so this is a
# wall-clock ceiling for the whole request, not per site.
SCRAPE_TIMEOUT = float(os.environ.get("JOBSPY_SCRAPE_TIMEOUT") or "60")
# Caps concurrent scraper threads spawned by one request.
MAX_SCRAPE_WORKERS = int(os.environ.get("JOBSPY_MAX_WORKERS") or "4")

# Observable state for /health so a busy-but-alive worker can be told apart
# from a wedged one.
_INFLIGHT = 0
_INFLIGHT_LOCK = threading.Lock()
_LAST_COMPLETED_AT = None

SALARY_FIELDS = [
    "min_amount",
    "max_amount",
    "currency",
    "job_type",
    "interval",
    "salary_source",
    "pay_period",
]


def _to(value, default=""):
    """Stringify a cell that may be NaN/None."""
    if value is None:
        return default
    try:
        import math

        if isinstance(value, float) and math.isnan(value):
            return default
    except TypeError:
        pass
    return str(value).strip() or default


def normalize_row(row: dict) -> dict:
    """Map a JobSpy DataFrame row (as dict) to the canonical JobOpportunity shape."""
    salary = None
    min_amt = _to(row.get("min_amount"), "")
    max_amt = _to(row.get("max_amount"), "")
    currency = _to(row.get("currency"), "")
    interval = _to(row.get("interval"), "")
    if min_amt or max_amt:
        parts = [p for p in [min_amt, max_amt] if p]
        salary = " / ".join(parts)
        if currency:
            salary = f"{salary} {currency}".strip()
        if interval:
            salary = f"{salary} ({interval})".strip()

    return {
        "title": _to(row.get("title"), "Untitled"),
        "company": _to(row.get("company")),
        "location": _to(row.get("location")),
        "jobUrl": _to(row.get("job_url")),
        "postedDate": _to(row.get("date_posted")),
        "salary": salary,
        "jobType": _to(row.get("job_type")),
        "applyUrl": _to(row.get("job_url")),
        "raw": json.dumps(
            {k: v for k, v in row.items() if k not in ("description",)}
            if isinstance(row, dict)
            else {},
            default=str,
        ),
    }


def infer_country(location: str) -> str | None:
    """Map a free-text location to a JobSpy country string.

    Indeed defaults to the USA when `country_indeed` is omitted, so a search
    for "Dublin, Ireland" quietly returns zero jobs. Match the country name (or
    a common alias) anywhere in the location text and pass it through.
    """
    text = location.lower()
    for country, aliases in COUNTRY_HINTS:
        for alias in aliases:
            # Letter lookarounds instead of \b so aliases with dots ("u.s.")
            # work and "india" does not match "indianapolis".
            if re.search(rf"(?<![a-z]){re.escape(alias)}(?![a-z])", text):
                return country
    return None


def scrape_site(site: str, keywords: str, location: str | None, n: int, hours_old: int | None) -> tuple[list[dict], str | None]:
    """Scrape a single site. Returns (jobs, error)."""
    try:
        kwargs: dict = {
            "site_name": site,
            "search_term": keywords,
            "results_wanted": min(max(n, 1), 100),
            "verbose": 0,
        }
        if location:
            # Treat "Remote" (or any remote-flavored location) as a remote
            # filter rather than a city string — boards like Indeed/Glassdoor
            # expect is_remote and 400/0-result on location="Remote".
            if any(term in location.lower() for term in ("remote", "anywhere", "worldwide", "work from home", "wfh", "global")):
                kwargs["is_remote"] = True
            else:
                kwargs["location"] = location
                # Add distance parameter for location filtering (in miles)
                # Controls how far from the specified location to search
                kwargs["distance"] = 50
                # Filter Indeed to the country named in the location. Without
                # this it searches the US and non-US locations return nothing.
                country = infer_country(location)
                if country:
                    kwargs["country_indeed"] = country
        if hours_old is not None:
            kwargs["hours_old"] = hours_old

        df = scrape_jobs(**kwargs)
        if df is None or len(df) == 0:
            return [], None
        records = []
        for _, r in df.iterrows():
            records.append(normalize_row(r.to_dict()))
        return records, None
    except Exception as e:
        msg = f"{site}: {type(e).__name__}: {str(e)[:300]}"
        # Non-fatal: Glassdoor often 400s on fuzzy locations.
        print(f"[jobspy-svc] {msg}", file=sys.stderr)
        return [], msg


def scrape_sites(
    sites: list[str],
    keywords: str,
    location: str | None,
    n: int,
    hours_old: int | None,
    timeout: float | None = None,
) -> tuple[list[dict], list[str]]:
    """Scrape several boards concurrently with a wall-clock deadline.

    Each board runs on a daemon thread so a wedged provider cannot keep the
    process alive, and no more than MAX_SCRAPE_WORKERS call JobSpy at once.
    Boards that miss the deadline are reported as errors instead of silently
    vanishing.
    """
    timeout = SCRAPE_TIMEOUT if timeout is None else timeout
    results: queue.Queue = queue.Queue()
    semaphore = threading.Semaphore(MAX_SCRAPE_WORKERS)

    def worker(site: str) -> None:
        with semaphore:
            results.put((site, *scrape_site(site, keywords, location, n, hours_old)))

    for site in sites:
        threading.Thread(target=worker, args=(site,), daemon=True, name=f"jobspy-{site}").start()

    jobs: list[dict] = []
    errors: list[str] = []
    received: set[str] = set()
    deadline = time.monotonic() + timeout
    while len(received) < len(sites):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        try:
            site, site_jobs, err = results.get(timeout=remaining)
        except queue.Empty:
            break
        received.add(site)
        jobs.extend(site_jobs)
        if err:
            errors.append(err)

    for site in sites:
        if site not in received:
            errors.append(f"{site}: timed out after {timeout:.0f}s")

    return jobs, errors


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, payload: dict):
        body = json.dumps(payload, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self) -> bool:
        """Check the shared secret. Auth is disabled when JOBSPY_TOKEN is unset."""
        if not JOBSPY_TOKEN:
            return True
        expected = f"Bearer {JOBSPY_TOKEN}".encode()
        auth = self.headers.get("Authorization", "").encode("utf-8", "ignore")
        if hmac.compare_digest(auth, expected):
            return True
        alt = self.headers.get("X-JobSpy-Token", "").encode("utf-8", "ignore")
        return hmac.compare_digest(alt, JOBSPY_TOKEN.encode())

    def do_OPTIONS(self):  # CORS preflight
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-JobSpy-Token")
        self.end_headers()

    def do_GET(self):
        global _INFLIGHT, _LAST_COMPLETED_AT
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            with _INFLIGHT_LOCK:
                inflight = _INFLIGHT
                last_completed = _LAST_COMPLETED_AT
            self._send(
                200,
                {
                    "success": True,
                    "service": "jobspy",
                    # "busy" still means healthy: it distinguishes a working
                    # worker under load from one that has stopped answering.
                    "status": "busy" if inflight else "ok",
                    "inFlight": inflight,
                    "lastCompletedAt": last_completed,
                    "scrapeTimeoutSeconds": SCRAPE_TIMEOUT,
                },
            )
            return
        if parsed.path != "/scrape":
            self._send(404, {"success": False, "error": f"unknown path: {parsed.path}"})
            return
        if not self._authorized():
            self._send(401, {"success": False, "error": "unauthorized"})
            return

        qs = parse_qs(parsed.query)
        keywords = qs.get("keywords", [None])[0]
        if not keywords:
            self._send(400, {"success": False, "error": "keywords is required"})
            return

        location = qs.get("location", [None])[0] or None
        site_param = qs.get("site", ["indeed,glassdoor,zip_recruiter,google"])[0]
        sites = sorted({s.strip().lower() for s in site_param.split(",") if s.strip() in ALLOWED_SITES})
        if not sites:
            self._send(400, {"success": False, "error": f"invalid site(s): {site_param}"})
            return

        try:
            n = min(max(int(qs.get("n", ["10"])[0]), 1), 100)
        except ValueError:
            self._send(400, {"success": False, "error": "n must be an integer"})
            return
        try:
            hours_old = int(qs.get("hours_old", [None])[0]) if qs.get("hours_old", [None])[0] else None
        except (TypeError, ValueError):
            hours_old = None

        with _INFLIGHT_LOCK:
            _INFLIGHT += 1
        try:
            all_jobs, errors = scrape_sites(sites, keywords, location, n, hours_old)
        finally:
            with _INFLIGHT_LOCK:
                _INFLIGHT -= 1
                _LAST_COMPLETED_AT = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # De-duplicate by job_url keeping the first (best-ranked) hit.
        seen: set[str] = set()
        unique: list[dict] = []
        for j in all_jobs:
            key = j.get("jobUrl") or f"{j.get('company')}:{j.get('title')}"
            if key and key in seen:
                continue
            if key:
                seen.add(key)
            unique.append(j)

        self._send(
            200,
            {
                "success": True,
                "jobs": unique,
                "total": len(unique),
                "errors": errors,
            },
        )

    def log_message(self, fmt, *args):  # quieter logs
        sys.stderr.write(f"[jobspy-svc] {self.address_string()} {fmt % args}\n")


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    if JOBSPY_HOST not in LOOPBACK_HOSTS and not JOBSPY_TOKEN:
        print(
            "[jobspy-svc] FATAL: JOBSPY_TOKEN is required when binding to a non-loopback host",
            file=sys.stderr,
        )
        sys.exit(1)
    server = ThreadingHTTPServer((JOBSPY_HOST, port), Handler)
    # A stuck scraper thread must never hold up shutdown/restart.
    server.daemon_threads = True
    auth_state = "enabled" if JOBSPY_TOKEN else "disabled (loopback only)"
    print(f"[jobspy-svc] listening on {JOBSPY_HOST}:{port}; auth {auth_state}", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
