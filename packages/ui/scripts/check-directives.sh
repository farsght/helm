#!/usr/bin/env bash
# CI assertion for PKG-03: 'use client' directive preservation in dist/
#
# Phase 1 (Button + Label only): asserts count >= 1
# When Phase 2 ports all 34 components, update EXPECTED to 26

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/dist"

if [ ! -d "$DIST_DIR" ]; then
  echo "FAIL: dist/ directory not found at $DIST_DIR — run npm run build first"
  exit 1
fi

# Count files containing 'use client' (double-quoted form, as emitted by tsdown)
CLIENT_COUNT=$(grep -rl '"use client"' "$DIST_DIR" 2>/dev/null | grep '\.js$' | wc -l | tr -d ' ')

# Phase 1 threshold: >= 1 (Label carries the directive; Button correctly omits it)
# Phase 2 threshold: 26 — all 34 components ported, 26 carry 'use client' (verified against dist/)
# Note: Toaster (Plan 03) will add 1 more, bringing final Phase 2 count to 27
EXPECTED=26

if [ "$CLIENT_COUNT" -lt "$EXPECTED" ]; then
  echo "FAIL: 'use client' directives missing in dist/ — got $CLIENT_COUNT, expected >= $EXPECTED"
  exit 1
fi

echo "PASS: $CLIENT_COUNT 'use client' file(s) in dist/ (expected >= $EXPECTED)"
