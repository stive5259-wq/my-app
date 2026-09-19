#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
RUNTIME="$HOME/Library/Application Support/DropForge/1.0.1"
BACKUP_ROOT="$HOME/Library/Application Support/DropForge/backups"
APP="$HOME/Applications/DropForge.app"

if [[ ! -d "$RUNTIME/dropforge" || ! -x "$RUNTIME/.venv/bin/python" ]]; then
  echo "DropForge runtime was not found at:" >&2
  echo "  $RUNTIME" >&2
  exit 1
fi

PY="$RUNTIME/.venv/bin/python"

echo "Preflighting 1.0.3 update package..."
bash -n "$HERE/run.command"
"$PY" -m py_compile "$HERE"/dropforge/*.py
if command -v node >/dev/null 2>&1; then
  node --check "$HERE/static/app.js"
fi
echo "Update package preflight: PASS"

if /usr/sbin/lsof -nP -iTCP:8765 -sTCP:LISTEN >/dev/null 2>&1; then
  if /usr/bin/curl -fsS http://127.0.0.1:8765/api/health 2>/dev/null | /usr/bin/grep -q '"app":"DropForge"'; then
    PIDS="$(/usr/sbin/lsof -tiTCP:8765 -sTCP:LISTEN || true)"
    if [[ -n "$PIDS" ]]; then
      echo "Stopping running DropForge..."
      kill $PIDS >/dev/null 2>&1 || true
      sleep 1
    fi
  else
    echo "Port 8765 is occupied by another application; stop it before updating." >&2
    exit 1
  fi
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$BACKUP_ROOT/1.0.2-before-1.0.3-$STAMP"
mkdir -p "$BACKUP"
echo "Backing up current DropForge source/config to: $BACKUP"
rsync -a   --exclude '.venv'   --exclude '__pycache__'   --exclude '*.pyc'   "$RUNTIME/" "$BACKUP/"

echo "Applying DropForge 1.0.3 stem-pack update..."
cp "$HERE/run.command" "$RUNTIME/run.command"
chmod +x "$RUNTIME/run.command"
rsync -a "$HERE/dropforge/" "$RUNTIME/dropforge/"
rsync -a "$HERE/static/" "$RUNTIME/static/"

cd "$RUNTIME"

echo "Running installed regression suite..."
PYTHONPATH=. "$PY" -m compileall -q app.py dropforge tests
PYTHONPATH=. "$PY" -m unittest discover -s tests -v
bash -n run.command
if command -v node >/dev/null 2>&1; then
  node --check static/app.js
fi

if [[ -f "$APP/Contents/Info.plist" ]]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion 1.0.3" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 1.0.3" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
  /usr/bin/codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
fi

mkdir -p "$HOME/Library/Application Support/DropForge/1.0.3"

echo
echo "DropForge 1.0.3 stem-pack update applied."
echo "New jobs now export:"
echo "  drums_16bar.wav"
echo "  bass_16bar.wav"
echo "  vocals_16bar.wav"
echo "  other_16bar.wav"
echo
echo "The first 1.0.3 run may rerun Demucs once because the cache now requires all four stems."
echo "Later runs of the same section can reuse the four-stem cache."
echo
echo "Opening DropForge..."
open "$APP"
