---
status: partial
phase: 02-headless-core-port
source: [02-VERIFICATION.md]
started: 2026-05-29
updated: 2026-05-29
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visible focus rings (CORE-05)
expected: Tabbing through every interactive component (Button, Input, Select, Checkbox, DataGrid toolbar controls, DataTable pagination, etc.) renders a clearly visible focus ring on the focused element. axe/eslint cannot detect visual focus styling — must be confirmed in a browser.
result: [pending]

### 2. Full keyboard operability (CORE-05)
expected: DataGrid toolbar and DataTable pagination/filter controls are fully operable by keyboard alone (Tab/Shift-Tab/Enter/Space/Arrow). Watch the data-table filter controls specifically — eslint-plugin-jsx-a11y flagged 3 `role="button"` elements with `onClick` but no `onKeyDown` (inherited verbatim from Helm source); these may surface as real keyboard gaps.
result: [pending]

### 3. Toaster theme sync via next-themes (CORE-02 / CORE-04 / D-10)
expected: With a `next-themes` `ThemeProvider` mounted in a consumer, toggling light/dark switches the Sonner toast theme via `useTheme()`. With NO `ThemeProvider` mounted, the Toaster degrades gracefully to `theme="system"` (no crash, no missing-context error). Must be confirmed in a running consumer app.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

Carried-forward notes (non-blocking, inherited from Helm source — not introduced by this phase):
- 3 eslint-plugin-jsx-a11y warnings: `role="button"` divs with `onClick` but no `onKeyDown` in data-table filter components. 0 errors. Tied to manual test #2 above.
- `packages/ui/src/components/data-grid/variant-menu.tsx:88` — untracked `// TODO: persist options to column meta` ported verbatim from Helm. Not blocking any gate; track formally if/when the data-grid surface is hardened in a later phase.
