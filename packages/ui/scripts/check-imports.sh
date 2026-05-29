#!/usr/bin/env bash
# packages/ui/scripts/check-imports.sh — CORE-01 / CORE-04 CI guard — Phase 2
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/src"
fail=0

# Rule 1: No next/* imports (next-themes is NOT next/* — does not match "next/")
# "from "next/" matches next/navigation, next/server, next/headers etc.
# next-themes imports as 'from "next-themes"' — no trailing slash, does not match.
NEXT_HITS=$(grep -rn 'from "next/' "$SRC" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [ -n "$NEXT_HITS" ]; then
  echo "FAIL [CORE-01]: next/* import found (next-themes IS allowed; next/anything is not):"
  printf '%s\n' "$NEXT_HITS"
  fail=1
fi

# Rule 2: No @clerk/nextjs/server imports
CLERK_HITS=$(grep -rn '@clerk/nextjs/server' "$SRC" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [ -n "$CLERK_HITS" ]; then
  echo "FAIL [CORE-01]: @clerk/nextjs/server import found:"
  printf '%s\n' "$CLERK_HITS"
  fail=1
fi

# Rule 3: No alert() or confirm() in package source
# Word-boundary (\b) prevents matching e.g. "defaultAlert"
ALERT_HITS=$(grep -rn '\balert(\|\bconfirm(' "$SRC" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
if [ -n "$ALERT_HITS" ]; then
  echo "FAIL [CORE-04]: alert() or confirm() call found in packages/ui/src:"
  printf '%s\n' "$ALERT_HITS"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "PASS [CORE-01/04]: No next/*, @clerk/nextjs/server, alert(), or confirm() in packages/ui/src"
fi
exit "$fail"
