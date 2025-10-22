#!/usr/bin/env bash
set -e
git add -A
git commit -m "snapshot" || true
git tag -f "v0.0.$(date +%s)-snap"
echo "OK"
