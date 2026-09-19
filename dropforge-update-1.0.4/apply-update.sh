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

echo "Preflighting 1.0.4 update package..."
bash -n "$HERE/run.command"
"$PY" -m py_compile "$HERE/app.py" "$HERE"/dropforge/*.py "$HERE"/tests/*.py
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
BACKUP="$BACKUP_ROOT/1.0.3-before-1.0.4-$STAMP"
mkdir -p "$BACKUP"
echo "Backing up current DropForge source/config to: $BACKUP"
rsync -a   --exclude '.venv'   --exclude '__pycache__'   --exclude '*.pyc'   "$RUNTIME/" "$BACKUP/"

echo "Applying DropForge 1.0.4 bass-evidence update..."
cp "$HERE/app.py" "$RUNTIME/app.py"
cp "$HERE/run.command" "$RUNTIME/run.command"
chmod +x "$RUNTIME/run.command"
rsync -a "$HERE/dropforge/" "$RUNTIME/dropforge/"
rsync -a "$HERE/static/" "$RUNTIME/static/"
rsync -a "$HERE/tests/" "$RUNTIME/tests/"

cd "$RUNTIME"

echo "Running installed regression suite..."
PYTHONPATH=. "$PY" -m compileall -q app.py dropforge tests
PYTHONPATH=. "$PY" -m unittest discover -s tests -v
bash -n run.command
if command -v node >/dev/null 2>&1; then
  node --check static/app.js
fi

FIXTURE="$HOME/Music/DropForge/7b7acca2d452"
if [[ -f "$FIXTURE/bass_16bar.wav" ]]; then
  echo
  echo "Running controlled 1.0.4 bass-evidence regression on existing stem..."
  FIXTURE="$FIXTURE" PYTHONPATH=. "$PY" - <<'PY_FIXTURE'
import json
import os
from pathlib import Path

from dropforge.bass import transcribe_bass
from dropforge.bass_evidence import write_evidence_svg
from dropforge.midi import write_midi
from dropforge.util import write_json

job = Path(os.environ["FIXTURE"])
wav = job / "bass_16bar.wav"
manifest = job / "manifest.json"
bpm = 129.199
if manifest.exists():
    try:
        bpm = float(json.loads(manifest.read_text())["analysis"]["bpm"])
    except Exception:
        pass

notes, raw, diag, evidence, pyin, contour = transcribe_bass(
    wav,
    bpm,
    0.0,
    120.0,
    None,
    [],
    0.48,
    0.28,
    85.0,
    150.0,
    0.0,
    21,
    60,
)

print("Raw Basic Pitch events:", len(raw))
print("Evidence-fused events:", len(notes))
print("Pitch decisions changed:", evidence["summary"]["pitch_changes"])
print("Ambiguous decisions kept:", evidence["summary"]["ambiguous_kept"])
print("pYIN voiced fraction:", evidence["f0"]["voiced_fraction"])
print("Register policy:", diag["register_policy"])

if not raw:
    raise SystemExit("ERROR: controlled fixture Basic Pitch regression returned zero raw events")
if not notes:
    raise SystemExit("ERROR: controlled fixture evidence decoder returned zero events")
if diag["register_policy"] != "preserve_absolute_midi":
    raise SystemExit("ERROR: register-preservation policy is not active")

midi_out = job / "DropForge_Bass_1.0.4_EVIDENCE_VERIFY.mid"
json_out = job / "bass_evidence_1.0.4_VERIFY.json"
svg_out = job / "bass_evidence_1.0.4_VERIFY.svg"
write_midi(midi_out, notes, bpm, False, "DropForge Bass 1.0.4 Evidence")
write_json(json_out, evidence)
duration = max((n.end for n in raw), default=0.0)
write_evidence_svg(
    svg_out,
    duration=duration,
    raw_notes=raw,
    fused_notes=notes,
    pyin=pyin,
    contour=contour,
    kicks=[],
    min_midi=21,
    max_midi=60,
)
print("Controlled bass-evidence regression: PASS")
print("Verification MIDI:", midi_out)
print("Evidence JSON:", json_out)
print("Evidence SVG:", svg_out)
PY_FIXTURE
fi

if [[ -f "$APP/Contents/Info.plist" ]]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion 1.0.4" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 1.0.4" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
  /usr/bin/codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
fi

mkdir -p "$HOME/Library/Application Support/DropForge/1.0.4"

echo
echo "DropForge 1.0.4 bass-evidence update applied."
echo "Bass changes:"
echo "  - absolute MIDI register preserved"
echo "  - forced C1-C3 folding removed"
echo "  - automatic key snapping removed"
echo "  - Basic Pitch + pYIN + BP contour + harmonic evidence"
echo "  - bass_evidence.json and bass_evidence.svg per new job"
echo
echo "Opening DropForge..."
open "$APP"
