#!/usr/bin/env bash
# JobSpy micro-service runner. Starts the Python scraper on $JOBSPY_PORT (default 3001).
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
export JOBSPY_PORT="${JOBSPY_PORT:-3001}"

echo "[jobspy-svc] starting on port $JOBSPY_PORT"
exec python3 "${DIR}/app.py" "${JOBSPY_PORT}"
