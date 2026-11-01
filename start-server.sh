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

port_in_use() {
  python3 - "$1" <<'PYEOF' >/dev/null 2>&1
import socket, sys
port = int(sys.argv[1])
for family, host in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
    s = socket.socket(family, socket.SOCK_STREAM)
    s.settimeout(0.25)
    try:
        if s.connect_ex((host, port)) == 0:
            sys.exit(0)
    finally:
        s.close()
sys.exit(1)
PYEOF
}

# Start the JobSpy service (used for indeed/glassdoor/zip_recruiter/google).
if command -v python3 >/dev/null 2>&1; then
  if python3 -c "import jobspy" >/dev/null 2>&1; then
    if port_in_use 3001; then
      echo "[start-server] Port 3001 already has a service; reusing it instead of starting another."
    else
      bash "$ROOT/mini-services/jobspy-svc/serve.sh" &
      JOBSPY_PID=$!
      # Wait (up to ~15s) for the service to bind before next dev starts.
      for _ in $(seq 1 30); do
        code="$(curl -s -o /dev/null -w '%{http_code}'"${JOBSPY_URL%\/scrape}/scrape" 2>/dev/null || true)"
        if [ "$code" != "000" ] && [ -n "$code" ]; then
          break
        fi
        sleep 0.5
      done
      echo "[start-server] JobSpy service started (pid $JOBSPY_PID)"
    fi
  else
    echo "[start-server] python3 found but 'jobspy' package is not installed — JobSpy sources (indeed/glassdoor/zip_recruiter/google) will be unavailable. Install with: pip install python-jobspy" >&2
  fi
else
  echo "[start-server] python3 not found — JobSpy sources will be unavailable" >&2
fi

cd "$ROOT"
# Pick the first free port so a stale dev server never blocks startup.
DEV_PORT="${PORT:-3000}"
for candidate in $(seq "$DEV_PORT" 3010); do
  if ! port_in_use "$candidate"; then
    DEV_PORT="$candidate"
    break
  fi
done
if port_in_use "$DEV_PORT"; then
  echo "[start-server] Ports ${DEV_PORT}-3010 are all in use. Stop a dev server or set PORT." >&2
  exit 1
fi
echo "[start-server] Starting Next.js on port $DEV_PORT"

# Run next dev in the background so the trap can clean up the JobSpy child
# when the dev server is stopped (Ctrl+C / exit).
"$ROOT/node_modules/.bin/next" dev -p "$DEV_PORT" &
NEXT_PID=$!
wait "$NEXT_PID"