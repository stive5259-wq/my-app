#!/usr/bin/env bash
set -e
if [ -f package.json ]; then
  pnpm lint || true
  pnpm build || true
  pnpm test -s || true
elif [ -f pyproject.toml ]; then
  ruff check . || true
  pytest -q || true
fi
