#!/bin/bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ZIP="$HERE/DropForge-1.0.1-fixed-macos-arm64.zip"
EXPECTED="3581d8faa2a74413a8531d28d261ed3f51c5962af12b71b0f2efe077968c164e"

P00="$HERE/part00.corrected.b64"
P02="$HERE/part02.corrected.b64"
PAYLOAD="$HERE/payload.b64"

echo "Reconstructing DropForge 1.0.1 fixed pack from GitHub text chunks..."

# Two 12k transport chunks were corrupted in the earlier GitHub handoff.
# Replace only the verified 1000-byte regions; every other byte remains from
# the checked-in chunks. The final SHA-256 below validates the whole ZIP.
{
  head -c 10000 "$HERE/part00.b64"
  cat "$HERE/fix-part00-seg10.b64"
  tail -c +11001 "$HERE/part00.b64"
} > "$P00"

{
  head -c 1000 "$HERE/part02.b64"
  cat "$HERE/fix-part02-seg01.b64"
  tail -c +2001 "$HERE/part02.b64"
} > "$P02"

cat "$P00" "$HERE/part01.b64" "$P02" "$HERE/part03.b64" "$HERE/part04.b64" > "$PAYLOAD"

if base64 -D -i "$PAYLOAD" -o "$ZIP" 2>/dev/null; then
  :
else
  base64 -d "$PAYLOAD" > "$ZIP"
fi

rm -f "$PAYLOAD" "$P00" "$P02"

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
