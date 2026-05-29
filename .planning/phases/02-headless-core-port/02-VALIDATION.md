---
phase: 2
slug: headless-core-port
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-29
approved: 2026-05-29
---

<!-- nyquist_compliant: every CORE-01..05 requirement maps to an automated verify command
     (grep guard / vitest render / characterization / vitest-axe / eslint-jsx-a11y); no watch-mode
     flags; Wave 0 gaps are enumerated and assigned to Plan 02-01. wave_0_complete flips to true
     during execution once Plan 02-01 (the Wave 0 enablement slice) ships. -->

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (jsdom env, matches Helm) — `packages/ui` config added in Wave 0 |
| **Config file** | `packages/ui/vitest.config.ts` — does not exist; Wave 0 creates it |
| **Quick run command** | `pnpm --filter @farsight/ui build` (per-task: must exit 0) |
| **Full suite command** | `pnpm --filter @farsight/ui test && bash packages/ui/scripts/check-imports.sh && bash packages/ui/scripts/check-directives.sh` |
| **Estimated runtime** | ~30s (render smoke + characterization + axe) |

---

## Sampling Rate

- **After every task commit:** `pnpm --filter @farsight/ui build` exits 0
- **After every plan wave:** Full suite — `vitest` + `check-imports.sh` + `check-directives.sh`
- **Before `/gsd:verify-work`:** Full suite green; `publint` passes; `pnpm list react -r` shows one React version
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

> Requirement-level rows below are pre-seeded from RESEARCH.md. Task IDs (`02-NN-NN`) are
> filled in by the planner/executor once PLAN.md files exist. Status starts ⬜ pending.

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| CORE-01 | Zero `next/*`, `@clerk/nextjs/server` in `packages/ui/src` (allows `next-themes`) | grep script | `bash packages/ui/scripts/check-imports.sh` | ❌ W0 | ⬜ pending |
| CORE-01 | Zero `alert(`/`confirm(` in `packages/ui/src` | grep script | same `check-imports.sh` (Rule 3) | ❌ W0 | ⬜ pending |
| CORE-02 | 34 `ui/` primitives importable + render in jsdom | render smoke | `pnpm --filter @farsight/ui test` | ❌ W0 | ⬜ pending |
| CORE-02 | Page primitives (PageHeader, EmptyState, ErrorState, ConfirmDialog, Toaster) render | render test | `pnpm --filter @farsight/ui test` | ❌ W0 | ⬜ pending |
| CORE-02 | `'use client'` count ≥ 26 in built output | CI grep | `bash packages/ui/scripts/check-directives.sh` | ⚠️ threshold 1→26 | ⬜ pending |
| CORE-03 | DataGrid `use-data-grid` initializes correct default state | characterization | `pnpm --filter @farsight/ui test` | ❌ W0 | ⬜ pending |
| CORE-03 | DataTable internal-state default works with zero consumer wiring | characterization | `pnpm --filter @farsight/ui test` | ❌ W0 | ⬜ pending |
| CORE-03 | DataTable controlled `state`/`onStateChange` override works | characterization | `pnpm --filter @farsight/ui test` | ❌ W0 | ⬜ pending |
| CORE-04 | Loading skeletons (`card-grid`/`list`/`detail`) render without error | render smoke | `pnpm --filter @farsight/ui test` | ❌ W0 | ⬜ pending |
| CORE-04 | ErrorState renders with and without `onRetry` | render smoke | `pnpm --filter @farsight/ui test` | ❌ W0 | ⬜ pending |
| CORE-05 | No axe violations on key interactive components | vitest-axe | `pnpm --filter @farsight/ui test` | ❌ W0 | ⬜ pending |
| CORE-05 | Static a11y lint clean (aria-label, role, keyboard) | eslint-jsx-a11y | `pnpm --filter @farsight/ui lint` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/ui/vitest.config.ts` — create (jsdom env)
- [ ] `packages/ui/vitest.setup.ts` — create; add `import "vitest-axe/extend-expect"`
- [ ] `packages/ui/scripts/check-imports.sh` — create (3 rules: no `next/*`, no `@clerk/nextjs/server`, no `alert(`/`confirm(`; allow `next-themes`)
- [ ] `packages/ui/eslint.config.mjs` — create with `eslint-plugin-jsx-a11y` rules
- [ ] `packages/ui/scripts/check-directives.sh` — update EXPECTED threshold from 1 → final `'use client'` count (~26–28) at phase completion
- [ ] devDeps: `vitest-axe`, `eslint-plugin-jsx-a11y`, `@testing-library/react`, `jsdom` (verify presence)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visible focus rings on interactive components | CORE-05 | Visual/CSS-dependent; axe + jsx-a11y cannot detect | Tab through each interactive component in a browser; confirm a visible focus ring renders (deferred to TOOL-02 Chromatic for automation) |
| Full keyboard operability across data-grid toolbar / data-table pagination | CORE-05 | axe checks role/aria pairs only; full traversal needs human | Tab/Enter/Space/Arrow through grid toolbar and pagination controls; confirm all actions reachable |
| `light` ↔ `dark` Toaster theme sync via next-themes | CORE-02/CORE-04 | Requires a mounted ThemeProvider + visual confirmation | Toggle theme in a consumer harness; confirm Sonner toasts switch theme; with no ThemeProvider, confirm graceful `theme="system"` fallback |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (vitest config, check-imports.sh, eslint config)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-29
