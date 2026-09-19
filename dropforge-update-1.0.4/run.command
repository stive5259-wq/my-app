#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
if [[ ! -x .venv/bin/python ]]; then echo "Run ./scripts/install_macos.sh first."; read -r; exit 1; fi
source .venv/bin/activate
export PATH="$ROOT/.venv/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PYTORCH_ENABLE_MPS_FALLBACK=1
URL="http://127.0.0.1:8765"
LOG_DIR="$HOME/Library/Application Support/DropForge/1.0.4"
LOG="$LOG_DIR/dropforge.log"
mkdir -p "$LOG_DIR"
if /usr/sbin/lsof -nP -iTCP:8765 -sTCP:LISTEN >/dev/null 2>&1; then
  if /usr/bin/curl -fsS "$URL/api/health" 2>/dev/null | /usr/bin/grep -q '"app":"DropForge"'; then
    /usr/bin/open "$URL"
    exit 0
  fi
  echo "Port 8765 is already occupied by another application." >&2
  read -r
  exit 1
fi
( sleep 1.2; /usr/bin/open "$URL" ) &
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) starting DropForge 1.0.4" >> "$LOG"
exec python -m uvicorn app:app --host 127.0.0.1 --port 8765 >> "$LOG" 2>&1
