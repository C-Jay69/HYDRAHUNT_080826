#!/bin/bash
# Starts the dev stack: the JobSpy Python micro-service (port 3001) + Next.js.
set -euo pipefail

# Resolve project root (works from any cwd).
ROOT="$(cd "$(dirname "$0")" && pwd)"
export JOBSPY_URL="${JOBSPY_URL:-http://127.0.0.1:3001/scrape}"

cleanup() {
  if [ -n "${JOBSPY_PID:-}" ]; then
    kill "$JOBSPY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Start the JobSpy service (used for indeed/glassdoor/zip_recruiter/google).
if command -v python3 >/dev/null 2>&1; then
  bash "$ROOT/mini-services/jobspy-svc/serve.sh" &
  JOBSPY_PID=$!
  # Give it a moment to bind.
  sleep 1
  echo "[start-server] JobSpy service started (pid $JOBSPY_PID)"
else
  echo "[start-server] python3 not found — JobSpy sources will be unavailable" >&2
fi

cd "$ROOT"
exec npx next dev -p 3000
