---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 2 context gathered
last_updated: "2026-05-29T08:35:21.783Z"
last_activity: 2026-05-29
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** Farsight's `apps/web` can install one package and get a working, themed, data-wired UI for its core domain — decoupled from Helm's Next.js/Clerk-server/Drizzle stack and wired to the typed `@farsight/contracts`.
**Current focus:** Phase 2 — headless core port

## Current Position

Phase: 2
Plan: Not started
Status: Ready to plan
Last activity: 2026-05-29

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 3
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P01 | 3 | - tasks | - files |
| Phase 01 P03 | 35 | 3 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Foundation-first ordering adopted (research strongly converged) — headless core moves before the adapter seam; adapter seam proven against the live notifications/webhooks domain before contract-gated surfaces.
- Roadmap: Coupling-to-shed is shallow (design system + DataGrid have zero `next/` imports; only 3 components use `next/navigation`) — the real work is the adapter seam + packaging discipline, not rewriting components.
- [Phase ?]: BRANCH A selected: tsdown 0.22.1 supports unbundle:true
- [Phase ?]: deps.neverBundle used over external in tsdown.config.ts — external is deprecated in tsdown 0.22.x
- [Phase ?]: CSS stub files created for theme.css/globals.css and dist copy step added — publishConfig.exports satisfied, publint passes
- [Phase ?]: Phase 2 alias rewrite rule correction: PATTERNS.md says '../lib/utils' but correct depth from src/components/ui/ is '../../lib/utils' — all 34 Phase 2 component ports must use the two-level path
- [Phase ?]: radix-ui and class-variance-authority added to deps.neverBundle in tsdown.config.ts — prevents peer vendoring into dist/node_modules despite peerDependencies declaration

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

## Session Continuity

Last session: 2026-05-29T08:35:21.777Z
Stopped at: Phase 2 context gathered
Resume file: .planning/phases/02-headless-core-port/02-CONTEXT.md
