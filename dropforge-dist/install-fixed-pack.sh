#!/bin/bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ZIP="$HERE/DropForge-1.0.1-fixed-macos-arm64.zip"
EXPECTED="3581d8faa2a74413a8531d28d261ed3f51c5962af12b71b0f2efe077968c164e"

echo "Reconstructing DropForge 1.0.1 fixed pack from GitHub text chunks..."
cat "$HERE"/part00.b64 "$HERE"/part01.b64 "$HERE"/part02.b64 "$HERE"/part03.b64 "$HERE"/part04.b64 > "$HERE/payload.b64"

if base64 -D -i "$HERE/payload.b64" -o "$ZIP" 2>/dev/null; then
  :
else
  base64 -d "$HERE/payload.b64" > "$ZIP"
fi
rm -f "$HERE/payload.b64"

ACTUAL="$(shasum -a 256 "$ZIP" | awk '{print $1}')"
echo "Expected: $EXPECTED"
echo "Actual:   $ACTUAL"

if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "ERROR: reconstructed ZIP checksum mismatch."
  exit 1
fi

echo "Checksum OK."
unzip -t "$ZIP" >/dev/null
echo "ZIP integrity OK."

cd "$HERE"
rm -rf DropForge-1.0.1-fixed
unzip -o "$ZIP" >/dev/null

cd DropForge-1.0.1-fixed
echo "Starting DropForge installer..."
bash ./scripts/install_macos.sh
