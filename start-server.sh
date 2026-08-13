#!/bin/bash
# Starts the dev stack: the JobSpy Python micro-service (port 3001) + Next.js.
set -euo pipefail

# Resolve project root (works from any cwd).
ROOT="$(cd "$(dirname "$0")" && pwd)"
export JOBSPY_URL="${JOBSPY_URL:-http://127.0.0.1:3001/scrape}"

JOBSPY_PID=""
NEXT_PID=""

cleanup() {
  if [ -n "${NEXT_PID:-}" ]; then
    kill "$NEXT_PID" 2>/dev/null || true
  fi
  if [ -n "${JOBSPY_PID:-}" ]; then
    kill "$JOBSPY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Start the JobSpy service (used for indeed/glassdoor/zip_recruiter/google).
if command -v python3 >/dev/null 2>&1; then
  if python3 -c "import jobspy" >/dev/null 2>&1; then
    bash "$ROOT/mini-services/jobspy-svc/serve.sh" &
    JOBSPY_PID=$!
    # Wait (up to ~15s) for the service to bind before next dev starts.
    for _ in $(seq 1 30); do
      code="$(curl -s -o /dev/null -w '%{http_code}' "${JOBSPY_URL%\/scrape}/scrape" 2>/dev/null || true)"
      if [ "$code" != "000" ] && [ -n "$code" ]; then
        break
      fi
      sleep 0.5
    done
    echo "[start-server] JobSpy service started (pid $JOBSPY_PID)"
  else
    echo "[start-server] python3 found but 'jobspy' package is not installed — JobSpy sources (indeed/glassdoor/zip_recruiter/google) will be unavailable. Install with: pip install python-jobspy" >&2
  fi
else
  echo "[start-server] python3 not found — JobSpy sources will be unavailable" >&2
fi

cd "$ROOT"
# Run next dev in the background so the trap can clean up the JobSpy child
# when the dev server is stopped (Ctrl+C / exit).
"$ROOT/node_modules/.bin/next" dev -p 3000 &
NEXT_PID=$!
wait "$NEXT_PID"