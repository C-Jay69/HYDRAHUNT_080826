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
  n          — results per site (default 10, max 50)
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
"""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

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

DEFAULT_PORT = int(os.environ.get("JOBSPY_PORT", "3001"))

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


def scrape_site(site: str, keywords: str, location: str | None, n: int, hours_old: int | None) -> tuple[list[dict], str | None]:
    """Scrape a single site. Returns (jobs, error)."""
    try:
        kwargs: dict = {
            "site_name": site,
            "search_term": keywords,
            "results_wanted": min(max(n, 1), 50),
            "verbose": 0,
            "is_remote": None,
        }
        if location:
            kwargs["location"] = location
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


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, payload: dict):
        body = json.dumps(payload, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):  # CORS preflight
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/scrape":
            self._send(404, {"success": False, "error": f"unknown path: {parsed.path}"})
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

        n = int(qs.get("n", ["10"])[0])
        try:
            hours_old = int(qs.get("hours_old", [None])[0]) if qs.get("hours_old", [None])[0] else None
        except (TypeError, ValueError):
            hours_old = None

        all_jobs: list[dict] = []
        errors: list[str] = []
        for site in sites:
            jobs, err = scrape_site(site, keywords, location, n, hours_old)
            all_jobs.extend(jobs)
            if err:
                errors.append(err)

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
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"[jobspy-svc] listening on :{port}", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
