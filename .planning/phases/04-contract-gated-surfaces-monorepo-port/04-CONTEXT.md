# Phase 4: Contract-Gated Surfaces & Monorepo Port - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Port Helm's three remaining feature surfaces — **datasets, pipelines, agents** — onto Farsight contracts using the Phase-3 adapter seam, then prove `@farsight/ui` is consumable as a `workspace:*` dependency from a real external (non-Next.js) Vite app. Requirements in scope: **DSET-01, PIPE-01, AGNT-01, PORT-01, PORT-02** (see `.planning/REQUIREMENTS.md`). Final phase of milestone v1.0.

**Grounding facts that reshape the work (verified against `~/Projects/farsight-platform`):**
- **All three backends are implemented and mounted** in `apps/api/src/index.ts` (`datasetsRoute`, `agentsRoute`, `workflowsRoute`) — not contract-only. Datasets exposes list/create/get/update/delete/records/**search** (RAG); workflows exposes list/create/get/update/remove/**run**. The STATE-flagged "contracts-ahead-of-endpoints" risk is largely retired.
- **Naming reconciliation:** Helm's "pipeline" surface binds to Farsight's **`workflows` contract + `pipeline-definition`/node contracts** — Farsight's orchestration entity is a *workflow*. ROADMAP/REQUIREMENTS "pipelines/pipeline_runs" wording maps to `workflowsRoutes` (incl. `run`) + `nodes/pipeline-definition`.
- **Port sources are Next.js `*-client.tsx`** (`app/datasets/`, `app/pipelines/[id]/`, `app/agents/[id]/agent-canvas-client.tsx`) — unlike Phases 2/3 (already framework-clean), these still carry `next/navigation` etc., so **decoupling from Next is real work in this phase** (href → consumer `onNavigate`/slot; `useRouter`/`usePathname` → callbacks/props).
- Phase 4 = "bind existing Helm UI to live contracts on the proven seam," NOT "invent new data patterns." Every surface rides Phase-3's `<FarsightProvider>` + `useTenant()` + `useApiClient()` + `queryOptions`-factory + `FarsightError` + loading/error/empty + optimistic conventions.

</domain>

<decisions>
## Implementation Decisions

### Surface fidelity & order (DSET-01, PIPE-01, AGNT-01)
- **D-01:** **Slice-and-prove per surface (MVP).** Each surface ports a representative vertical exercising its contract end-to-end on the seam — datasets = list + detail + RAG search; pipelines = canvas renders/runs a workflow from the contract with a core node subset + run view; agents = **chat surface** (submit + poll messages, consumer-provided `agentDefinitionId` — NOT a definitions list / canvas / run-history; reconciled per R-04 below). Exhaustive node-type/inspector parity is deferred post-milestone (see Deferred).
- **D-02:** **Datasets leads** (first vertical / walking slice) — simplest binding (list/detail reuse DataGrid; RAG search hits the live `search` endpoint), no xyflow. It proves the contract-binding-on-seam pattern cleanly before the heavy canvases.
- **D-03:** **"Done" gate = automated mocked-contract tests + manual real round-trip.** Automated CI uses a mocked `fetchImpl` against the contract Zod schemas (deterministic, jsdom-friendly — same boundary as Phase 3). The real-endpoint round-trip (needs a live Clerk session + `api.farsght.com`) is exercised manually via the Vite consumer / Phase-4 UAT and tracked — it can't run in jsdom. (Reconciles ROADMAP SC1's "completion gated on a real-endpoint call".)

### External Vite consumer (PORT-01)
- **D-04:** **Standalone in-Helm `examples/` Vite app** (e.g. `examples/farsight-ui-consumer`) as a SEPARATE workspace package consuming `@farsight/ui` via `workspace:*`. It is NOT Helm's Next app — it validates framework-agnostic consumption outside Next.js while keeping work in this repo + the GSD/Helm branch. The real Farsight `apps/web` consumption is deferred to a documented manual step (D-06).
- **D-05:** The Vite app consumes the **built dist** (tsdown) — exercising the real shippable artifact (subpath exports map, `'use client'` preservation, tree-shaking, `.d.ts`). It must prove **three things**: (1) importing ONE primitive does NOT pull in xyflow/Recharts (tree-shaking + `sideEffects`); (2) `theme.css` import → tokens apply and utility classes resolve via `@source`; (3) a canvas surface mounts and **edges render with the xyflow CSS import order correct**. (Full ROADMAP SC4 bar.)

### Monorepo port (PORT-02)
- **D-06:** PORT-02 ships a **consumer-setup README + a Farsight copy runbook** — required peer versions, `@source` config, xyflow CSS import order, `theme.css` import, `<FarsightProvider>` mount, AND a step-by-step runbook for the manual copy (`packages/ui` → `~/Projects/farsight-platform/packages/ui`, workspace wiring, `apps/web` consumption). **No physical copy into Farsight this phase** ("prep here, then port").
- **D-07:** **Port-readiness is verified** by re-running **publint + `@arethetypeswrong/cli`** on the built dist (already wired in Phase 1) as part of Phase 4, so the artifact is proven publish/port-clean with all the new Phase-3/4 exports — in addition to the Vite app rendering successfully.

### Pipeline/agent canvas binding (PIPE-01, AGNT-01)
- **D-08:** The pipeline canvas binds to **Farsight `workflows` + `pipeline-definition`/node contracts**: read/write a workflow's pipeline-definition (nodes + edges) and wire the `run` endpoint + run view. Implement a **core source→transform→sink editable node subset** sufficient to build/run a simple workflow end-to-end (proves the full contract round-trip). Remaining Helm node types are additive later.
- **D-09:** The xyflow **CSS import-order contract is locked** by: (a) documenting the required import order (`theme.css` + `@xyflow/react/dist/style.css`) in the consumer README; (b) a **jsdom vitest render-smoke** asserting nodes+edges render to the DOM; (c) the actual **visual** confirmation (edges visible/styled) in the standalone Vite app (real browser — where CSS order truly bites). No separate Playwright harness.
- **D-10:** **Canvas-kit is pipelines-only** (amended per R-04). Extract the xyflow wiring (provider, viewport, edge/handle config, the CSS-order contract) into a reusable canvas-kit for the **pipelines** surface; build it as a standalone reusable kit (so a future agent/visual surface could reuse it), but agents in Phase 4 do NOT consume it — the agent surface is a chat UI (message list + composer), not a node canvas. The pipelines canvas needs a bidirectional adapter between xyflow `Node[]`/`Edge[]` and the contract `PipelineDefinition` (`nodes[].position`/`parameters`, `edges[].from/to`); the contract exports `validatePipelineGraph()` for cycle detection — reuse it.

### Claude's Discretion
- Exact dir layout for the new surfaces under `packages/ui/src/` (`hooks/`, `components/datasets/`, `components/pipelines/` (or `workflows/`), `components/agents/`, `components/canvas-kit/`) and the `examples/` Vite app scaffold — follow Phase-1/2/3 conventions; register every public export in `src/index.ts` (barrel-export trap).
- Whether the pipelines surface is named `pipelines` (consumer-facing, matches Helm) or `workflows` (matches the contract) in the public API — planner's call; document the mapping either way.
- The workspace-link mechanism for the `examples/` Vite app (mirror Phase 3's `packages/ui/pnpm-workspace.yaml` approach for resolving `@farsight/ui` + the SDK/contracts).
- Concrete node-type subset for the pipeline slice (which source/transform/sink) — planner picks from the live `nodes/` contracts + Helm `components/canvas/`.
- Agent canvas vs run-history split + datasets RAG-search result UX — bind to contracts; reuse DataGrid + Phase-3 conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` § "Phase 4: Contract-Gated Surfaces & Monorepo Port" — goal + 5 success criteria. Note reconciliations R-01/R-02/R-03 below before treating SC wording literally.
- `.planning/REQUIREMENTS.md` § DSET-01, PIPE-01, AGNT-01, PORT-01, PORT-02.
- `.planning/PROJECT.md` — Constraints (framework-agnostic, SDK over contracts, "prep here then port"), Out-of-Scope (knowledge-ingestion backend, app shell), Key Decisions.

### Phase-3 inheritance (the seam — read before binding any surface)
- `.planning/phases/03-adapter-seam-tenancy-notifications-proving-ground/03-CONTEXT.md` — the seam decisions D-01..D-15 + reconciliations R-01/R-02/R-03 (thin-wrap SDK, no org header, `code`-discriminated errors, `projectSlug` tenant).
- `.planning/phases/03-adapter-seam-tenancy-notifications-proving-ground/03-SUMMARY` files (03-02 esp.) — the seam's public API: `<FarsightProvider>`, `useTenant()`, `useApiClient()`, `FarsightError`/`isFarsightError`/`matchCode`, the `queryOptions`-factory + optimistic-mutation patterns.
- `packages/ui/src/index.ts` — the barrel; every new Phase-4 export MUST be registered here.
- `packages/ui/pnpm-workspace.yaml` — the Phase-3 workspace-link pattern for `@farsight/sdk`/`@farsight/contracts` (reuse for the `examples/` app).

### Farsight contracts + live API source (the transport target)
- `~/Projects/farsight-platform/packages/contracts/src/datasets/{routes,schemas}.ts` — datasets contract (list/get/records/**search** = RAG).
- `~/Projects/farsight-platform/packages/contracts/src/agents/{routes,schemas}.ts` — agents contract.
- `~/Projects/farsight-platform/packages/contracts/src/workflows/routes.ts` + `nodes/pipeline-definition.ts` + `nodes/*.ts` — **the pipeline binding target** (workflow CRUD + `run`; node/pipeline-definition shapes).
- `~/Projects/farsight-platform/apps/api/src/routes/{datasets,agents,workflows}.ts` + `apps/api/src/index.ts` — live handlers + route mounting (confirm which are deployed to `api.farsght.com` for the manual round-trip gate).
- `~/Projects/farsight-platform/packages/sdk/src/index.ts` — `createApiClient` (already thin-wrapped by the Phase-3 seam; surfaces call `client.datasets.*`, `client.agents.*`, `client.workflows.*`).

### Helm port sources (mine these; decouple from Next)
- `app/datasets/datasets-client.tsx` + `app/datasets/[id]/` — datasets list/detail/search.
- `app/pipelines/[id]/{pipeline-detail-client.tsx,pipeline-node.tsx}` + `components/canvas/{flow-node,palette,resource-node,auto-layout}.tsx` — pipeline canvas (xyflow; `@xyflow/react/dist/style.css`).
- `app/agents/{agents-client.tsx,[id]/agent-canvas-client.tsx,runs/runs-client.tsx}` — agent definitions/canvas/runs.

### Packaging & project research
- `.planning/phases/01-package-foundation-theming/01-PATTERNS.md` + `01-RESEARCH.md`; `packages/ui/package.json` (exports/sideEffects), `tsdown.config.ts`, `packages/ui/scripts/{check-imports.sh,check-directives.sh}`, publint/attw wiring.
- `.planning/research/ARCHITECTURE.md`, `FEATURES.md` (end-to-end type flow, contract-spec-ahead-of-live tolerance), `PITFALLS.md`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase-3 seam** (`packages/ui/src/provider`, `hooks`, `errors`, `client`) — the data layer every surface binds through.
- **DataGrid/DataTable** (`packages/ui/src/components/data-grid`, `data-table`) — datasets list + agent run-history tables.
- **Phase-2 primitives** (`ErrorState`/`EmptyState`/layout skeletons/`Toaster`/`ConfirmDialog`) + `tokens.ts` — loading/error/empty + destructive conventions for every surface.
- The Phase-3 `queryOptions`-factory + optimistic-mutation + slug-namespaced-key patterns — copy for `use-datasets`/`use-workflows`/`use-agents`.

### Established Patterns
- Per-resource hook factory + per-component subpath export + `'use client'` + named exports (Phases 1–3).
- Workspace-link via `pnpm-workspace.yaml` (Phase 3) — reuse for the `examples/` Vite app resolving `@farsight/ui`.
- CI guards (`check-imports.sh` no `next/*`/`@clerk/nextjs/server`; `check-directives.sh` `'use client'` count; a11y; publint/attw) continue to apply.

### Integration Points
- New dirs under `packages/ui/src/`: `hooks/` (use-datasets/use-workflows/use-agents), `components/{datasets,pipelines|workflows,agents}/`, `components/canvas-kit/`.
- New top-level `examples/` Vite workspace consuming the built dist.
- `packages/ui/src/index.ts` barrel — register all new public exports.

### Anti-analogs (do NOT copy as-is)
- Helm `app/**/*-client.tsx` carry `next/navigation` (`useRouter`/`usePathname`/`Link`) — these MUST be decoupled during the port (the new framework-coupling work this phase; href → consumer `onNavigate`/slot, navigation → callbacks/props).

</code_context>

<specifics>
## Specific Ideas

- All four discussed areas resolved on the recommended options (D-01..D-10).
- Datasets is the lead/walking-slice surface; RAG search binds the live `datasets.search` endpoint.
- The PORT-01 Vite app consumes the **built dist** and proves tree-shake + tokens(`@source`) + canvas-edges-render outside Next.js; it doubles as the **visual** xyflow-CSS-order proof.
- Pipeline canvas binds the `workflows` + `pipeline-definition` contracts (Farsight names it "workflow"); shared canvas-kit for pipelines + agents.
- PORT-02 = README + Farsight copy runbook (no physical copy); publint/attw re-run on dist.

</specifics>

<deferred>
## Deferred Ideas

- **Full node-type parity** (Helm's 15 pipeline node types) + all inspectors — post-milestone; Phase 4 ships a core source→transform→sink subset.
- **Physical copy into the Farsight monorepo** + `apps/web` wiring + live `apps/web` consumption validation — the manual final step (runbook provided in PORT-02); not performed in this phase.
- **Live-endpoint automated integration** (real Clerk session + `api.farsght.com`) — manual UAT, tracked like Phase-3's live round-trip; automated tests use mocked-contract `fetchImpl`.
- **Playwright visual-regression harness** — not added; jsdom render-smoke + the Vite app's real-browser render is the xyflow-CSS-order proof.
- **Shareable Tailwind preset** (still-open PROJECT.md item) — separate from this phase's scope.

### Reconciliations the planner MUST carry
- **R-01 (P4):** datasets/agents/workflows backends are implemented + mounted in `apps/api` — build against live contracts; the contracts-ahead-of-endpoints concern is largely retired (still confirm deployment to `api.farsght.com` for the manual round-trip).
- **R-02 (P4):** Helm "pipeline" → Farsight **`workflows` + `pipeline-definition`** contracts (no literal "pipelines/pipeline_runs" route namespace; it's `workflowsRoutes` + `run` + nodes).
- **R-03 (P4):** Port sources are Next.js `*-client.tsx` — decoupling from `next/navigation` (href/router/Link) is real, in-phase work (unlike the already-clean Phases 2/3). Datasets-client's `confirm()` delete → `ConfirmDialog`; all data fetching → `client.<resource>.*` via `useApiClient()`.
- **R-04 (P4) — agents surface reconciled (USER-CONFIRMED):** Farsight `agentsRoutes` is **chat-only** — `POST /agents/:agentDefinitionId/messages` (submit) + `GET …/messages` (poll history). There is **no agent-definitions CRUD, no list endpoint, no node editor** in the contracts. AGNT-01's "definitions + canvas + run-history" is reconciled to an **agent chat surface** (message list + composer, polling for new messages — reuse the Phase-3 polling/refetch pattern). `agentDefinitionId` is **consumer-provided** (like `projectSlug`; no enumeration is possible). The shared-canvas-kit half of AGNT-01 does not apply (D-10 amended → canvas-kit is pipelines-only).
- **R-05 (P4) — `@source` after build:** `theme.css` ships `@source "../../src"` which is valid from source but **breaks from `dist/styles/theme.css`**. The `examples/` Vite app MUST add its own `@source` directive pointing at the consumed package's source/dist so Tailwind scans `@farsight/ui` classes. Call this out in the consumer README (PORT-02) and verify empirically in the Vite app.
- **R-06 (P4) — datasets RAG search shape:** `datasets.search` returns a **discriminated union** on `backend` (`'vectorize' | 'none' | 'ai_search'`) with `matches[]` — the result renderer must branch on `backend` (incl. an empty/none state). All three surfaces are URL-nested under `/orgs/:slug/projects/:projectSlug/`, so the `enabled: !!projectSlug` guard applies to datasets/pipelines/agents queries (the Phase-3 webhook pattern).

</deferred>

---

*Phase: 4-Contract-Gated Surfaces & Monorepo Port*
*Context gathered: 2026-05-29*
