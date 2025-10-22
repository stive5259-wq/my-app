set -e
TMP="$(mktemp)"
cat > "$TMP"
git apply --reject --whitespace=fix "$TMP" || patch -p0 < "$TMP" || patch -p1 < "$TMP" || true
rm -f "$TMP"
