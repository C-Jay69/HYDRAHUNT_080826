#!/usr/bin/env python3
"""Keep the Render free-tier JobSpy worker warm.

Render spins free instances down after ~15 minutes without traffic. This pings
the public /health endpoint every INTERVAL seconds so the worker stays warm.

Run it on an always-on host (a small VM, Raspberry Pi, or a scheduled GitHub
Action). A laptop that sleeps will not keep the worker awake.

Usage:
  python3 keep_warm.py [worker-url]
  WORKER_URL=https://... python3 keep_warm.py

Environment:
  WORKER_URL          worker base URL or /scrape URL (default: this repo's Render service)
  KEEP_WARM_INTERVAL  seconds between pings (default: 120)
  KEEP_WARM_TIMEOUT   per-request timeout in seconds (default: 90; cold starts are slow)
"""
import os
import sys
import time
import urllib.error
import urllib.request

DEFAULT_URL = "https://hydrahunt-jobspy.onrender.com"
INTERVAL = max(30, int(os.environ.get("KEEP_WARM_INTERVAL", "120")))
TIMEOUT = max(5, int(os.environ.get("KEEP_WARM_TIMEOUT", "90")))


def health_url() -> str:
    raw = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("WORKER_URL", DEFAULT_URL)).strip().rstrip("/")
    if raw.endswith("/scrape"):
        raw = raw[: -len("/scrape")]
    return raw + "/health"


def main() -> None:
    url = health_url()
    print(f"[keep-warm] pinging {url} every {INTERVAL}s (timeout {TIMEOUT}s)", flush=True)
    while True:
        started = time.monotonic()
        stamp = time.strftime("%Y-%m-%d %H:%M:%S")
        try:
            with urllib.request.urlopen(url, timeout=TIMEOUT) as res:
                print(f"[keep-warm] {stamp} {res.status} ({time.monotonic() - started:.1f}s)", flush=True)
        except urllib.error.HTTPError as exc:
            print(f"[keep-warm] {stamp} HTTP {exc.code}", flush=True)
        except Exception as exc:  # noqa: BLE001 - keep the loop alive
            print(f"[keep-warm] {stamp} error: {exc}", flush=True)
        time.sleep(max(1, INTERVAL - (time.monotonic() - started)))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[keep-warm] stopped", flush=True)
