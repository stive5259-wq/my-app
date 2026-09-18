#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
RUNTIME="$HOME/Library/Application Support/DropForge/1.0.1"
BACKUP_ROOT="$HOME/Library/Application Support/DropForge/backups"
APP="$HOME/Applications/DropForge.app"

if [[ ! -d "$RUNTIME/dropforge" || ! -x "$RUNTIME/.venv/bin/python" ]]; then
  echo "DropForge 1.0.1 runtime was not found at:" >&2
  echo "  $RUNTIME" >&2
  echo "Install the working 1.0.1 build first, then rerun this updater." >&2
  exit 1
fi

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
BACKUP="$BACKUP_ROOT/1.0.1-before-1.0.2-$STAMP"
mkdir -p "$BACKUP"
echo "Backing up DropForge source/config to: $BACKUP"
rsync -a   --exclude '.venv'   --exclude '__pycache__'   --exclude '*.pyc'   "$RUNTIME/" "$BACKUP/"

echo "Applying DropForge 1.0.2 reliability update..."
cp "$HERE/app.py" "$RUNTIME/app.py"
cp "$HERE/run.command" "$RUNTIME/run.command"
chmod +x "$RUNTIME/run.command"
rsync -a "$HERE/dropforge/" "$RUNTIME/dropforge/"
rsync -a "$HERE/static/" "$RUNTIME/static/"
rsync -a "$HERE/tests/" "$RUNTIME/tests/"
cp "$HERE/RELIABILITY_1.0.2.md" "$RUNTIME/RELIABILITY_1.0.2.md"

cd "$RUNTIME"
PY="$RUNTIME/.venv/bin/python"

echo "Running regression suite..."
PYTHONPATH=. "$PY" -m compileall -q app.py dropforge tests
PYTHONPATH=. "$PY" -m unittest discover -s tests -v
bash -n run.command
if command -v node >/dev/null 2>&1; then node --check static/app.js; fi

FIXTURE="$HOME/Music/DropForge/7b7acca2d452"
if [[ -f "$FIXTURE/bass_16bar.wav" ]]; then
  echo "Running the controlled bass regression on the existing Sun is Shining stem..."
  FIXTURE="$FIXTURE" PYTHONPATH=. "$PY" - <<'PY_FIXTURE'
import json
import os
from pathlib import Path

from dropforge.bass import _basic_pitch_events
from dropforge.midi import write_midi

job = Path(os.environ["FIXTURE"])
wav = job / "bass_16bar.wav"
manifest = job / "manifest.json"
bpm = 129.199
if manifest.exists():
    try:
        bpm = float(json.loads(manifest.read_text())["analysis"]["bpm"])
    except Exception:
        pass

notes, diag = _basic_pitch_events(wav, bpm, 0.48, 0.28, 85.0, 21, 60)
print("Controlled fixture Basic Pitch events:", len(notes))
print("note_max:", round(float(diag.get("note_max", 0.0)), 6),
      "onset_max:", round(float(diag.get("onset_max", 0.0)), 6),
      "contour_max:", round(float(diag.get("contour_max", 0.0)), 6))
if not notes:
    raise SystemExit("ERROR: controlled bass regression still produced zero events")
out = job / "DropForge_Bass_RAW_1.0.2_VERIFY.mid"
write_midi(out, notes, bpm, False, "DropForge Bass 1.0.2 VERIFY")
print("Controlled fixture regression: PASS")
print("Verification MIDI:", out)
PY_FIXTURE
fi

if [[ -f "$APP/Contents/Info.plist" ]]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion 1.0.2" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 1.0.2" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
  /usr/bin/codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
fi

mkdir -p "$HOME/Library/Application Support/DropForge/1.0.2"

echo
echo "DropForge reliability update 1.0.2 applied."
echo "Runtime remains at the existing 1.0.1 path for this hotfix; app code reports 1.0.2."
echo "Log: $HOME/Library/Application Support/DropForge/1.0.2/dropforge.log"
echo
echo "Opening DropForge..."
open "$APP"
