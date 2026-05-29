---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: complete
stopped_at: Phase 04 verified (PASS-WITH-LIMITATIONS) — milestone v1.0 all 4 phases complete; ready for completion review
last_updated: "2026-05-29T22:10:52.299Z"
last_activity: 2026-05-29
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 20
  completed_plans: 20
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** Farsight's `apps/web` can install one package and get a working, themed, data-wired UI for its core domain — decoupled from Helm's Next.js/Clerk-server/Drizzle stack and wired to the typed `@farsight/contracts`.
**Current focus:** Phase 04 — contract-gated-surfaces-monorepo-port

## Current Position

Phase: 04 (contract-gated-surfaces-monorepo-port) — COMPLETE
Plan: 6 of 6 (04-06 complete)
Status: Phase complete — ready for verification
Last activity: 2026-05-29 - Completed quick task 260529-oj4 (@farsight/ui attw exits 0 + plugin-react vite-6 fix)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 14
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 3 | - | - |
| 02 | 5 | - | - |
| 3 | 6 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P01 | 3 | - tasks | - files |
| Phase 01 P03 | 35 | 3 tasks | 5 files |
| Phase 02 P02 | 35 | 2 tasks | 40 files |
| Phase 02 P04 | 35 | 2 tasks | 31 files |
| Phase 02 P05 | 35 | 2 tasks | 16 files |
| Phase 03 P01 | 45 | 2 tasks | 37 files |
| Phase 03 P02 | 30 | 2 tasks | 8 files |
| Phase 03 P03 | 30 | 2 tasks | 8 files |
| Phase 03 P04 | 20 | 2 tasks | 4 files |
| Phase 03 P05 | 15 | 2 tasks | 5 files |
| Phase 03 P06 | 20 | 2 tasks | 6 files |
| Phase 04 P03 | 18 | 2 tasks | 11 files |
| Phase 04 P04-04 | 25 | 3 tasks | 9 files |
| Phase 04 P04-05 | 15 | 2 tasks | 5 files |
| Phase 04 P04-06 | 38 | 3 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Foundation-first ordering adopted (research strongly converged) — headless core moves before the adapter seam; adapter seam proven against the live notifications/webhooks domain before contract-gated surfaces.
- Roadmap: Coupling-to-shed is shallow (design system + DataGrid have zero `next/` imports; only 3 components use `next/navigation`) — the real work is the adapter seam + packaging discipline, not rewriting components.
- [Phase ?]: BRANCH A selected: tsdown 0.22.1 supports unbundle:true
- [Phase ?]: deps.neverBundle used over external in tsdown.config.ts — external is deprecated in tsdown 0.22.x
- [Phase ?]: CSS stub files created for theme.css/globals.css and dist copy step added — publishConfig.exports satisfied, publint passes
- [02-01]: vitest-axe@0.1.0 extend-expect provides types only; runtime registration requires expect.extend(vitestAxeMatchers) from vitest-axe/matchers
- [02-01]: ESLint flat config for TSX requires @typescript-eslint/parser in languageOptions.parser; default espree fails on TS generics
- [Phase ?]: Phase 2 alias rewrite rule correction: PATTERNS.md says '../lib/utils' but correct depth from src/components/ui/ is '../../lib/utils' — all 34 Phase 2 component ports must use the two-level path
- [Phase ?]: radix-ui and class-variance-authority added to deps.neverBundle in tsdown.config.ts — prevents peer vendoring into dist/node_modules despite peerDependencies declaration
- [Phase ?]: accordion.tsx absent from Helm source — ported 31 new files for 34 total in packages/ui
- [Phase ?]: D-02 enforced: ErrorState purely presentational, zero HTTP/RFC-7807 references
- [Phase ?]: D-03 delivered: CardGridSkeleton, ListSkeleton, DetailSkeleton as named primitives using Array.from SSR-safe repetition
- [Phase ?]: D-08/D-10: Toaster useTheme() default = system; next-themes already optional peer, added to neverBundle
- [Phase ?]: D-11 transition note recorded in STATE.md for /gsd-transition: Toaster read-only next-themes peer does not violate library out-of-scope boundary
- [Phase ?]: D-06 honored: use-data-grid.ts copied verbatim (3273 lines, zero nuqs), no state model change
- [Phase ?]: DataTable nuqs seam removed
- [03-01]: pnpm-workspace.yaml at packages/ui level includes ~/Projects/farsight-platform/packages/sdk + contracts — cleanest resolution for SDK's workspace:* dep on contracts without modifying Farsight source
- [03-01]: Vite static-analyzes dynamic import() strings at transform time — Wave-0 stubs require real source files (not just import guards); source stubs throw clearly until Plans 02-04 ship real implementations
- [03-01]: farsight-error.ts + hook factories fully implemented in Wave-0 (not just stubs) since they only depend on @farsight/sdk which is now available
- [Phase ?]: AnyFn cast pattern in use-webhooks.ts — same SDK inference gap fix as 03-03
- [04-01]: Import-safe Wave-0 stub approach mirrored from Phase 3 (commit fdacc22) — 6 test files import key factories LIVE from real source paths; 6 minimal source stubs (shaped key factories + throwing/null placeholders) at final paths keep `npx vitest run` clean (114 pass + 25 todo, 0 module-not-found). Stubs intentionally overwritten by flesh-out plans 04-02/04-04/04-05.
- [04-01]: src/index.ts intentionally NOT touched in Wave 0 — barrel registration ownership stays with the flesh-out plans (04-02/04-04/04-05) so throwing/null placeholders never leak into the public API (tsdown barrel-export trap discipline).
- [04-01]: Root pnpm-workspace.yaml must also list ../farsight-platform/packages/sdk + contracts (not just packages/* + examples/*) — packages/ui depends on them via workspace:*, and root-level resolution otherwise fails ERR_PNPM_WORKSPACE_PKG_NOT_FOUND.
- [Phase ?]: canvas-kit has no @xyflow/react CSS import — consumer global CSS owns it
- [Phase ?]: toDefinition meta Pick excludes schemaVersion; always literal 1 inside the fn (Pitfall 2 enforced)
- [Phase ?]: validatePipelineGraph re-exported from @farsight/contracts; not hand-rolled
- [Phase ?]: [04-06] PORT-01 Vite consumer uses FarsightProvider _test* bypass props (no ClerkProvider) for visual-only proof; canvas seeded via QueryClient.setQueryData(workflowKeys.detail) — apps/web uses real Clerk getToken
- [Phase ?]: [04-06] check-directives.sh threshold = actual post-build count 84; attw exits 1 for this private bundler-only package — bundler profile green, strict cross-profile exit-0 deferred (04-06-SUMMARY Deviation 1)

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- **Phase 3 (research flag, HIGH priority):** `@farsight/contracts` export shape is unverified (fluent SDK? `RouteSpec` manifest? OpenAPI doc?). This determines the `client/create-client.ts` implementation — verify before/at the start of Phase 3 planning; do not hand-roll a client if Farsight ships a fluent SDK.
- **Phase 3:** Live-vs-contract-only endpoint inventory not yet recorded (notifications/webhooks asserted live; pipelines/datasets/agents contract-only-maybe). Confirm per-endpoint deployment status during Phase 3 planning; gate each Phase 4 surface on a real-endpoint call.
- **Phase 3:** Project-selection UX + URL shape undecided (project scope axis has no Helm equivalent) — decide during Phase 3 tenant-context design.
- **Phase 2:** `lucide-react` major bump (Helm `^0.576.0` → 1.x) — audit icon imports during the port.
- **Cross-cutting hard gates:** (1) org/project cache-key correctness, (2) `'use client'` preservation, (3) Tailwind v4 `@source` distribution, (4) peer-dep dedupe, (5) contracts-ahead-of-endpoints sequencing — each mapped to the phase where it is cheapest to get right.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260529-oj4 | @farsight/ui attw check honestly exits 0 (files allowlist + check:attw script, attw 0.18.3, zod neverBundle); also fixed surfaced plugin-react@6-vs-vite-6 latent bug | 2026-05-29 | 77397d4 | [260529-oj4-make-farsight-ui-attw-check-honestly-exi](./quick/260529-oj4-make-farsight-ui-attw-check-honestly-exi/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Manual UAT (D-03) | Live-endpoint round-trip: DatasetList / WorkflowCanvas run / AgentChatView submit+poll against a real Clerk session + api.farsght.com | Pending human test | Phase 04 |
| Monorepo port (D-06) | Physical copy of packages/ui into ~/Projects/farsight-platform + workspace wire + single-React verify — follow packages/ui/CONSUMER.md runbook | Pending human run | Phase 04 |
| Packaging (PORT-02) | attw cross-profile validation: bundler + node16-ESM 🟢; node10/node16-CJS + CSS subpaths intentionally out of scope (ESM-only lib, typeless CSS assets) | RESOLVED — quick 260529-oj4: `npm run check:attw` exits 0 (files allowlist + attw 0.18.3 + zod neverBundle) | Phase 04 |

## Transition Notes

**D-11 (/gsd-transition flag):** PROJECT.md out-of-scope line "Library owning theme toggle + persistence" requires a clarifying note. As of Phase 2, the library carries a READ-ONLY next-themes peer dependency for the Toaster component. The Toaster reads the active theme via useTheme() and passes it to Sonner — it does NOT own the ThemeProvider, toggle UI, or persistence logic. Those remain the consumer's (apps/web) responsibility. The "library owning theme toggle + persistence" exclusion remains accurate; the read-only peer is not a violation of that boundary.

## Session Continuity

Last session: 2026-05-29T22:10:35.971Z
Stopped at: Plan 04-01 complete (Wave-0 harness + Vite scaffold)
Resume file: None
