# Walking Skeleton — Farsight UI Library (packages/ui)

**Phase:** 1
**Generated:** 2026-05-29
**Context:** Library skeleton (not an app skeleton). Steps substitute app-shaped milestones with library-shaped milestones: scaffold → build config → theme lift → one exported primitive → local consumer import proof.

## Capability Proven End-to-End

A developer can import `Button` from the built `packages/ui` artifact, import `./theme.css` as a subpath export, and confirm that `bg-background`/`text-foreground` token classes are defined in the CSS and that the `.dark` override flips them — all without entering the Farsight monorepo.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Package location (Phase 1) | Staging inside Helm repo at `packages/ui/` | PREP-IN-HELM: Phase 1 builds and verifies the artifact here; the Farsight monorepo is the reconciliation reference only; ported in Phase 4 (PORT-01) |
| Bundler / build tool | tsdown 0.22.1 with `unbundle: true` + `rollup-preserve-directives` | ESM-first, per-module output (one .js per source file) — the only output mode that preserves `'use client'` directives per-file; tsup is the fallback if tsdown has compatibility issues |
| Output model | Unbundled per-module (`unbundle: true` = `preserveModules: true`) | Preserves `'use client'` at per-file granularity; enables tree-shaking at module level; single-bundle mode strips directives |
| Peer dependencies | react, react-dom as required peers; @clerk/react, @xyflow/react, @tanstack/react-query as optional peers | Single-React-instance invariant; optional peers avoid requiring Phase 3/4 dependencies for a Phase 1 consumer |
| Clerk package name | `@clerk/react` (v6.x) NOT `@clerk/clerk-react` | Farsight uses `@clerk/react@6.7.2`; the old name would install both packages creating two Clerk contexts |
| CSS distribution | `@theme inline` tokens exported as `./theme.css` subpath; NO `@import "tailwindcss"` inside | Consumer owns the Tailwind entry; library owns the token contract; prevents duplicate Tailwind CSS from being processed twice |
| `@source` placement | Inside `theme.css` at `../../src` (relative to `src/styles/theme.css`) | Tailwind scans package source for utility class usage automatically; consumers don't need to add their own `@source` for the library |
| JS token export | Static `var(--color-*)` strings in `tokens.ts` (not `getComputedStyle`) | SSR-safe: no DOM required; browser resolves CSS vars at paint time; Recharts `stroke`/`fill` props accept CSS var strings natively |
| `sideEffects` | `["**/*.css"]` (NOT `false`) | Prevents bundlers from tree-shaking away the shipped `theme.css`; `false` would silently remove styles in consumer builds |
| Internal packages pattern | `exports` → `src/index.ts` for in-repo source consumption | Vite/Vitest compile TypeScript directly; no build step needed for `apps/web` dev server; HMR works transparently; `publishConfig` swaps to `dist/` on publish |
| Package manager (Helm side) | npm (not pnpm) | Helm is a standalone Next.js app using npm; pnpm workspace commands are not applicable here; standalone `npx tsdown` for build |

## Library Skeleton: Steps Completed in Phase 1

- [x] Package scaffold — `packages/ui/package.json` with `type: module`, `sideEffects`, `exports` map, `peerDependencies`, `publishConfig`
- [x] Build config — `tsdown.config.ts` with `unbundle: true`, `rollup-preserve-directives`, all peers externalized, `dts: true`
- [x] Theme lift — `src/styles/theme.css` with verbatim `:root`, `.dark`, and `@theme inline` blocks from Helm `app/globals.css`; `@source "../../src"` for Tailwind scanning; no `@import "tailwindcss"`
- [x] JS token export — `src/lib/tokens.ts` exporting `tokens.chart[N]` as `var(--color-chart-N)` static strings
- [x] One exported primitive — `Button` (server-safe, proves alias-rewrite pattern) + `Label` (has `'use client'`, proves directive preservation)
- [x] Consumer setup documented — `README.md` with peer versions, import order, `@source` explanation, dark mode contract, xyflow CSS order, token usage
- [x] Build output verified — `dist/` has per-module .js + .d.ts; `'use client'` in `label.js`; `publint` clean; peers externalized

## What This Skeleton Does NOT Include

Explicitly deferred — these items are scoped to later phases and must not be re-litigated as part of Phase 1:

- All 34 shadcn primitives + page primitives (`PageHeader`, `EmptyState`, `ConfirmDialog`, `Toaster`) — **Phase 2 (CORE-02)**
- DataGrid/DataTable + `use-data-grid.ts` port — **Phase 2 (CORE-03)**
- `'use client'` count assertion >= 26 — **Phase 2 after all client components are ported**
- Next.js import-guard CI check (zero `next/*` imports) — **Phase 2 (CORE-01)**
- `<FarsightProvider>`, adapter seam, typed SDK client — **Phase 3**
- Notifications/webhooks surface — **Phase 3**
- Datasets, pipelines, agents surfaces — **Phase 4**
- `workspace:*` consumption from an external Vite consumer — **Phase 4 (PORT-01)**
- `pnpm list react -r` single-version proof, Farsight root `pnpm.overrides` — **Phase 4 (PORT-01)**
- `pnpm --filter @farsight/ui build` (Farsight workspace command) — **Phase 4**
- Tree-shaking bundle analysis (importing Button excludes xyflow) — **Phase 4**
- Storybook stories, Chromatic visual regression — **v2 requirements (TOOL-01, TOOL-02)**
- Consumer-setup README in the Farsight monorepo — **Phase 4 (PORT-02)**

## Subsequent Slice Plan

Each later phase adds vertical slices on top of this foundation without altering the packaging or theming decisions made here:

- **Phase 2:** All 34 primitives + page primitives + DataGrid ported; `'use client'` count = 26; CI import-guard passes; `lucide-react` icon audit
- **Phase 3:** `<FarsightProvider>` + typed SDK + RFC-7807 errors + org/project tenant hooks; notifications/webhooks end-to-end proof against live endpoints
- **Phase 4:** Datasets/pipelines/agents on contracts; `workspace:*` consumption from external Vite app; `pnpm list react -r` = one version; consumer-setup README
