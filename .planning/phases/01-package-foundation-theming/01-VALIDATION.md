---
phase: 1
slug: package-foundation-theming
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Execution context: PREP-IN-HELM.** Per the confirmed project decision, Phase 1 work
> lands in THIS Helm repo as a self-contained, buildable `packages/ui` staging directory.
> The detailed per-requirement map below is lifted from `01-RESEARCH.md` "Validation
> Architecture" but adapted: checks that are intrinsically pnpm-monorepo-shaped
> (cross-workspace single-React proof, the Farsight `apps/smoke` app, Farsight root
> `overrides`) are **deferred to the Phase 4 port** (PORT-01), where the artifact lands
> in the Farsight monorepo. Helm-side validation is standalone build-output assertions +
> a local import/render smoke. The existing Farsight `~/Projects/farsight-platform/packages/ui`
> is the reconciliation reference, not a write target.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (already configured in Helm: `vitest.config.ts`) for any unit checks; build-output assertions via Node + grep |
| **Config file** | `vitest.config.ts` (Helm, existing); new `packages/ui/tsdown.config.ts` (Wave 0 creates) |
| **Quick run command** | `npx tsdown -c packages/ui/tsdown.config.ts` (build exits 0) |
| **Full suite command** | build + `npx publint packages/ui` + `grep -rl "'use client'" packages/ui/dist/ \| wc -l` (assert ≥ 26) + `npx @arethetypeswrong/cli --pack packages/ui` |
| **Estimated runtime** | ~30–60 seconds (standalone build) |

---

## Sampling Rate

- **After every task commit:** standalone build exits 0 (`npx tsdown -c packages/ui/tsdown.config.ts`)
- **After every plan wave:** full suite — build + publint + `'use client'` grep (≥26) + attw types check
- **Before `/gsd:verify-work`:** full suite green; local import smoke renders one themed primitive
- **Max feedback latency:** ~60 seconds

---

## Per-Requirement Verification Map

| Req | Behavior | Test Type | Helm-side Automated Command | Deferred-to-port (Phase 4) |
|-----|----------|-----------|------------------------------|-----------------------------|
| PKG-01 | `sideEffects: ["**/*.css"]` set; exports map has per-component + CSS subpaths | Static assertion | `node -e "const p=require('./packages/ui/package.json'); if(!Array.isArray(p.sideEffects)||!p.exports) process.exit(1)"` | bundle-analysis that importing Button excludes xyflow (needs consumer bundler) |
| PKG-02 | Correct peers declared incl. `@clerk/react` (NOT `@clerk/clerk-react`), `@xyflow/react`, `@tanstack/react-query`, react, react-dom | Static assertion | `node -e "const p=require('./packages/ui/package.json'); const pd=p.peerDependencies||{}; ['react','react-dom','@clerk/react','@xyflow/react','@tanstack/react-query'].forEach(k=>{if(!pd[k])process.exit(1)})"` | one-React proof via `pnpm list react -r` + Farsight root `overrides.react` |
| PKG-03 | `'use client'` preserved in built output | grep on dist | `npx tsdown -c packages/ui/tsdown.config.ts && [ $(grep -rl \"'use client'\" packages/ui/dist/ \| wc -l) -ge 26 ]` | re-assert under Farsight build |
| PKG-04 | Build succeeds; `dist/` has `.js` + `.d.ts`; publint clean; types resolve | Build smoke | `npx tsdown -c packages/ui/tsdown.config.ts && ls packages/ui/dist/*.d.ts >/dev/null && npx publint packages/ui` | `attw --pack` under workspace resolution |
| THEME-01 | `./theme.css` subpath resolves; file has NO `@import "tailwindcss"` | grep + exports check | `grep -q '@import \"tailwindcss\"' packages/ui/src/styles/theme.css && exit 1; node -e "const p=require('./packages/ui/package.json'); if(!p.exports['./theme.css'])process.exit(1)"` | consumer `@source` discovery validated in Farsight `apps/web` |
| THEME-02 | Dark mode via `.dark` token override present; consumer setup (`@source`, xyflow CSS order) documented | grep + doc check | `grep -q '\\.dark' packages/ui/src/styles/theme.css && test -f packages/ui/README.md` | visual: classes generate + dark applies in a real consumer |
| THEME-03 | `tokens.chart[0]` resolves to a CSS-var string | Unit | `npx tsx -e "import('./packages/ui/src/lib/tokens.ts').then(m=>{if(m.tokens.chart[0]!=='var(--color-chart-1)')process.exit(1)})"` | charts consume tokens in a real surface (Phase 4) |

---

## Wave 0 Requirements

Phase 1 introduces no new test framework (build-output assertions + existing Vitest suffice). Wave 0 scaffolds the artifacts the assertions check:

- [ ] `packages/ui/package.json` — `type: module`, `exports` map, `sideEffects: ["**/*.css"]`, `peerDependencies` (+ `peerDependenciesMeta`)
- [ ] `packages/ui/tsdown.config.ts` — externalize peers, preserve `'use client'` (`rollup-preserve-directives` + unbundled/per-module output — verify the exact tsdown key against live docs), emit `.d.ts`
- [ ] `packages/ui/src/styles/theme.css` — `@theme` tokens lifted verbatim from Helm `app/globals.css`; NO `@import "tailwindcss"`; `@source "../.."` + `.dark` overrides
- [ ] `packages/ui/src/lib/tokens.ts` — JS/TS token export (chart colors as `var(--color-chart-N)` strings)
- [ ] `packages/ui/README.md` — consumer setup (peer versions, `@source`, `@xyflow/react` CSS import order, provider mount placeholder)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One themed primitive renders in light + dark | THEME-02 (walking skeleton) | Needs a real bundler render; Helm has no pnpm workspace | Local import smoke: build `packages/ui`, import a primitive into a throwaway Vite/tsx entry, confirm `bg-background`/`text-foreground` apply and `.dark` flips them. Full external-consumer proof is Phase 4 PORT-01. |
| Tree-shaking excludes unused heavy deps | PKG-01 | Needs consumer bundler analysis | Deferred to Phase 4 port (Farsight `apps/web` bundle analysis) |

---

## Validation Sign-Off

- [ ] All tasks have an automated Helm-side verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] Deferred-to-port checks explicitly tagged (not silently dropped)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
