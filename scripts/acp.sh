set -e
MSG="${1:-chore:auto-commit}"
git add -A
git commit -m "$MSG" || true
bash scripts/snap.sh
git push --follow-tags
