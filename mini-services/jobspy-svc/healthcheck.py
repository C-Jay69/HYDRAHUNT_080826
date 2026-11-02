#!/usr/bin/env python3
"""Container health check: hit /health on the worker's configured port."""
import os
import sys
import urllib.request

port = os.environ.get("JOBSPY_PORT") or os.environ.get("PORT") or "3001"
try:
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=3) as res:
        sys.exit(0 if res.status == 200 else 1)
except Exception as exc:  # noqa: BLE001 - report and fail the probe
    print(f"[jobspy-svc] health check failed: {exc}", file=sys.stderr)
    sys.exit(1)
