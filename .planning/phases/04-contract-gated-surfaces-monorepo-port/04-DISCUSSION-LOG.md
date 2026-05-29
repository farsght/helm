# Phase 4: Contract-Gated Surfaces & Monorepo Port - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 4-Contract-Gated Surfaces & Monorepo Port
**Areas discussed:** Surface port fidelity & priority, External Vite consumer (PORT-01), Monorepo port execution (PORT-02), Pipeline canvas binding & xyflow CSS-order proof

> Pre-discussion: inspected `~/Projects/farsight-platform/apps/api` and confirmed datasets/agents/workflows routes are implemented + mounted (retiring the STATE "contract-only-maybe" flag), and that Helm's "pipeline" binds to Farsight's `workflows` + `pipeline-definition` contracts. Also confirmed the Helm port sources are Next.js `*-client.tsx` (decoupling is real work this phase).

---

## Surface port fidelity & priority

| Question | Options | Selected |
|----------|---------|----------|
| Fidelity | Slice-and-prove per surface ✓ / Full port / Datasets+agents full, pipelines sliced | Slice-and-prove (MVP) |
| Lead surface | Datasets first ✓ / Pipelines first / Agents first | Datasets first |
| Done gate | Mocked-contract automated + real round-trip manual UAT ✓ / Automated live-API integration | Mocked + manual round-trip |

**Notes:** All 3 backends live; slice proves contract-binding on the seam, real round-trip carried to manual UAT (Phase-3 precedent).

---

## External Vite consumer (PORT-01)

> The user paused twice to clarify location (in-Helm vs Farsight apps/web). Resolution: 1 and 2 answer different requirements (PORT-01 proof vs the actual port). User chose the standalone in-Helm app.

| Question | Options | Selected |
|----------|---------|----------|
| Location | Standalone in-Helm examples/ Vite app ✓ / Inside Farsight apps/web / Sibling dir / (hybrid offered) | Standalone in-Helm examples/ app |
| Proves what | Tree-shake + tokens + canvas render ✓ / Smoke import only | Tree-shake + tokens + canvas |
| Build vs src | Built dist via tsdown ✓ / TS source | Built dist |

**Notes:** examples/ app is a separate workspace consuming `@farsight/ui` via workspace:* (the built dist) outside Next.js; real Farsight apps/web consumption deferred to PORT-02 runbook.

---

## Monorepo port execution (PORT-02)

| Question | Options | Selected |
|----------|---------|----------|
| PORT-02 scope | Consumer-setup README + Farsight copy runbook ✓ / README only | README + copy runbook |
| Port check | publint + attw on dist ✓ / Vite app + README only | publint + attw on dist |

**Notes:** No physical copy into Farsight this phase ("prep here, then port"); runbook makes the manual copy turnkey.

---

## Pipeline canvas binding & xyflow CSS-order proof

| Question | Options | Selected |
|----------|---------|----------|
| Node fidelity | Render+run with core source→transform→sink subset ✓ / Read-only render+run view / Full 15-node palette | Core editable subset |
| xyflow proof | Documented order + jsdom smoke + real visual in Vite app ✓ / Playwright screenshot / Docs only | Documented + jsdom + Vite visual |
| Canvas reuse | Shared canvas-kit + per-surface nodes ✓ / Separate canvases | Shared canvas-kit |

**Notes:** Helm "pipeline" → Farsight `workflows` + `pipeline-definition` contracts (locked finding R-02); Vite app doubles as the visual CSS-order proof; canvas-kit shared by pipelines + agents (AGNT-01).

## Claude's Discretion

- Dir layout for new surfaces + examples/ app; barrel registration.
- pipelines vs workflows public naming; concrete node subset.
- examples/ workspace-link mechanism (mirror Phase-3 pnpm-workspace.yaml).
- agent canvas/run-history split; datasets RAG-search result UX.

## Deferred Ideas

- Full 15-node parity + inspectors (post-milestone).
- Physical copy into Farsight monorepo + apps/web wiring (manual final step; runbook provided).
- Live-endpoint automated integration (manual UAT).
- Playwright visual regression (jsdom smoke + Vite visual suffices).
- Shareable Tailwind preset (separate PROJECT.md item).

### Reconciliations carried to planner
- R-01: datasets/agents/workflows backends implemented + mounted (build against live contracts).
- R-02: Helm "pipeline" → Farsight `workflows` + `pipeline-definition`.
- R-03: port sources are Next.js `*-client.tsx` — decoupling from next/navigation is real in-phase work.
