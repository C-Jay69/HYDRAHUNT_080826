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

# True when the service on this port is this project's dev server (not some
# unrelated app that happens to be listening). The health route stamps the app
# name even when the database is down, so a degraded server still counts.
is_project_dev() {
  local body
  body="$(curl -s --max-time 2 "http://127.0.0.1:$1/api/health" 2>/dev/null || true)"
  case "$body" in
    *'"app":"hydrahunt"'*) return 0 ;;
    *) return 1 ;;
  esac
}

# PIDs of `next dev` processes whose working directory is this project.
project_dev_pids() {
  local pid cwd
  for pid in $(pgrep -f "next dev" 2>/dev/null || true); do
    cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
    [ "$cwd" = "$ROOT" ] && echo "$pid"
  done
}

# Report an already-running dev server and exit 0 without spawning a second
# one. Next's dev lock lives in .next/dev, so two instances in the same project
# can never coexist — even on different ports.
reuse_running_dev() {
  local pid="$1" port="$2"
  echo "[start-server] Your dev server is already running at http://localhost:$port (pid ${pid:-unknown})."
  echo "[start-server] Reusing it — edits hot-reload automatically, no restart needed."
  case "$pid" in
    ''|*[!0-9]*) echo "[start-server] To force a restart, stop that next dev process first." ;;
    *)           echo "[start-server] To force a restart, stop it first:  kill $pid" ;;
  esac
  # The app server may have been started without this script; leave any JobSpy
  # service we just launched running for it.
  JOBSPY_PID=""
  exit 0
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

# 1) If this project's dev server is already running, reuse it. Next's dev
#    lock is per-project, so a second instance always fails — even on a
#    different port.
for pid in $(project_dev_pids); do
  args="$(ps -o args= -p "$pid" 2>/dev/null || true)"
  port="$(printf '%s\n' "$args" | sed -n 's/.*-p[[:space:]]\{1,\}\([0-9]\{1,\}\).*/\1/p' | head -n1)"
  [ -n "$port" ] || port="3000"
  # Give a just-started server a moment to bind and compile, then require it
  # to answer.
  for _ in $(seq 1 20); do
    if is_project_dev "$port"; then
      reuse_running_dev "$pid" "$port"
    fi
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.5
  done
  # `-p` may be missing (plain `next dev` binds 3000) or the server may have
  # been started with `--port`/the PORT env var; probe the range before
  # giving up on a healthy process.
  for candidate in $(seq 3000 3010); do
    if is_project_dev "$candidate"; then
      reuse_running_dev "$pid" "$candidate"
    fi
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "[start-server] A dev server for this project (pid $pid) is running but not answering its health check. Stop it: kill $pid" >&2
    exit 1
  fi
done

# 2) Otherwise pick the first free port. If an occupied port serves this app we
#    already handled it above; here we skip ports owned by other applications.
DEV_PORT="${PORT:-3000}"
FOUND_FREE=""
for candidate in $(seq "$DEV_PORT" 3010); do
  if port_in_use "$candidate"; then
    if is_project_dev "$candidate"; then
      reuse_running_dev "$(project_dev_pids | head -n1)" "$candidate"
    fi
    continue
  fi
  FOUND_FREE="$candidate"
  break
done
if [ -z "$FOUND_FREE" ]; then
  echo "[start-server] Ports ${DEV_PORT}-3010 are all in use by other applications. Stop one or set PORT." >&2
  exit 1
fi
DEV_PORT="$FOUND_FREE"

# 3) Clear a stale lock left by a crashed dev server. Only do this when no
#    `next dev` process for this project is alive.
if [ -e "$ROOT/.next/dev/lock" ] && [ -z "$(project_dev_pids)" ]; then
  echo "[start-server] Removing stale dev lock (no next dev process for this project)."
  rm -f "$ROOT/.next/dev/lock"
fi

echo "[start-server] Starting Next.js on port $DEV_PORT"

# Run next dev in the background so the trap can clean up the JobSpy child
# when the dev server is stopped (Ctrl+C / exit).
"$ROOT/node_modules/.bin/next" dev -p "$DEV_PORT" &
NEXT_PID=$!
wait "$NEXT_PID"