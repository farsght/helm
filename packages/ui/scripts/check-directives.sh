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
# Phase 2 threshold: 50 — full surface exported: 26 ui/ primitives + Toaster + DataGrid (17 files,
# most carry 'use client') + DataTable (9 files) + page skeletons/dialogs + hooks.
# Phase 3 threshold: 62 — adds Phase-2 count (50) + Phase-3 new 'use client' files:
#   provider (farsight-provider), notifications (bell, inbox, item, preferences),
#   webhooks (list, endpoint-row, secret-reveal, create-modal, rotate-secret-modal, event-types-input),
#   hooks (use-notifications, use-webhooks, use-notification-preferences),
#   errors (farsight-error), client (create-client) = 12 additional files.
# Phase 4 threshold: 84 — adds canvas-kit (canvas-flow, canvas-background, canvas-controls,
#   canvas-minimap, canvas-panel, canvas-inspector, canvas-palette) + datasets (dataset-list,
#   dataset-detail, dataset-records, dataset-search) + pipelines (workflow-list, workflow-canvas,
#   workflow-run-view + source/transform/sink nodes) + agents (agent-chat-view, agent-message)
#   to prior 62. Verified by counting dist/*.js files containing '"use client"' after Phase 4 build.
EXPECTED=84

if [ "$CLIENT_COUNT" -lt "$EXPECTED" ]; then
  echo "FAIL: 'use client' directives missing in dist/ — got $CLIENT_COUNT, expected >= $EXPECTED"
  exit 1
fi

echo "PASS: $CLIENT_COUNT 'use client' file(s) in dist/ (expected >= $EXPECTED)"
