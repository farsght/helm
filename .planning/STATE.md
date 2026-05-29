---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 4 context gathered
last_updated: "2026-05-29T18:48:06.016Z"
last_activity: 2026-05-29
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 14
  completed_plans: 14
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** Farsight's `apps/web` can install one package and get a working, themed, data-wired UI for its core domain — decoupled from Helm's Next.js/Clerk-server/Drizzle stack and wired to the typed `@farsight/contracts`.
**Current focus:** Phase 4 — contract gated surfaces & monorepo port

## Current Position

Phase: 4
Plan: Not started
Status: Ready to plan
Last activity: 2026-05-29

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

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Transition Notes

**D-11 (/gsd-transition flag):** PROJECT.md out-of-scope line "Library owning theme toggle + persistence" requires a clarifying note. As of Phase 2, the library carries a READ-ONLY next-themes peer dependency for the Toaster component. The Toaster reads the active theme via useTheme() and passes it to Sonner — it does NOT own the ThemeProvider, toggle UI, or persistence logic. Those remain the consumer's (apps/web) responsibility. The "library owning theme toggle + persistence" exclusion remains accurate; the read-only peer is not a violation of that boundary.

## Session Continuity

Last session: 2026-05-29T18:48:06.001Z
Stopped at: Phase 4 context gathered
Resume file: .planning/phases/04-contract-gated-surfaces-monorepo-port/04-CONTEXT.md
