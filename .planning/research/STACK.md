# Stack Research

**Domain:** Framework-agnostic React component library in a pnpm monorepo (extraction from Next.js donor → Vite-consumed `packages/ui`)
**Researched:** 2026-05-29
**Confidence:** HIGH (build tooling, Tailwind v4 distribution, exports/peer-deps verified against current registry + official docs); MEDIUM on shadcn `registry:base` payload mechanics (single official source)

---

## TL;DR — The Prescriptive Answer

For a `packages/ui` that lives in the **same monorepo** as its Vite/React consumer (`apps/web`), the dominant 2026 pattern is **"internal packages": ship transpiled-on-demand source, not a pre-bundled artifact, for in-repo consumption.** The Vite app's own bundler compiles the TypeScript. This means the heavy build-tooling question (tsup vs Vite-lib-mode vs unbuild) is *secondary* — you only need a real library bundler if/when you publish externally.

Concretely:

1. **Consume source `.ts(x)` directly** in-monorepo via `exports` → `src/index.ts`. No build step blocks `apps/web` dev. HMR and Vitest work transparently. This is the Turborepo "Internal Packages" pattern and it's the right default here. (HIGH)
2. **Add a real bundler only for the publish/port artifact.** Use **tsdown 0.22.x** (Rolldown-based, ESM-first, `dts` via oxc-transform) as the forward-looking choice, or **tsup 8.5.1** if you want the stable, battle-tested option. Either externalizes `react`/`react-dom` correctly. (HIGH)
3. **Ship Tailwind v4 theming as a CSS file with `@theme`** exported under a `"./styles.css"` (or `"./theme.css"`) subpath. The greenfield consumer does `@import "tailwindcss"; @import "@farsight/ui/theme.css";` and inherits every token as both utility classes and runtime CSS variables. (HIGH)
4. **Keep shadcn primitives as owned source inside `packages/ui`** (the `components/ui/*` files travel verbatim). Do NOT try to consume shadcn as an npm dependency — that's not how shadcn works. Optionally also expose them via a private shadcn **registry** for cross-repo distribution later. (HIGH)
5. **peerDependencies:** `react`, `react-dom`, `@clerk/clerk-react`, `@xyflow/react`. Tailwind is **not** a runtime peer dep — it's a build-time concern handled via the exported CSS + `@source`. (HIGH)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **pnpm workspaces** | pnpm 9+ (`workspace:*` protocol) | Monorepo package linking | Strict dep isolation (a package can't import undeclared deps — surfaces hidden Next/Clerk-server coupling during extraction), content-addressable store, `workspace:*` makes cross-package refs explicit. Farsight is already a pnpm monorepo. |
| **tsdown** | 0.22.1 | Library build/bundle (for publish/port artifact only) | Rolldown (Rust)-powered successor to tsup, explicitly inspired by it and near-identical config. ESM-first (tsup is CJS-first with ESM gaps like missing file extensions). Treats deps + peerDeps as external by default. Evan You has signaled it as the long-term path as Vite migrates to Rolldown. `create-tsdown` ships a React template. |
| **tsup** | 8.5.1 | Alternative library bundler | The incumbent: ~6M weekly downloads, zero-config dual ESM/CJS + `.d.ts`, used by the Vercel/Turborepo design-system template. Pick this if you want maximum stability and don't want to adopt `isolatedDeclarations`. |
| **TypeScript** | 6.0.3 (latest); 5.5+ minimum | Types + `.d.ts` generation | `isolatedDeclarations` (shipped TS 5.5) unlocks tsdown's fast oxc-transform `.d.ts` path. The internal-packages pattern relies on the TS language server reading `.ts(x)` as valid type sources — no build needed in-repo. |
| **Tailwind CSS** | 4.3.0 | Design-system theming, distributed CSS-first | v4's `@theme` directive + automatic CSS-variable export is the *enabling* technology for shipping a themeable design system as a package. No `tailwind.config.js` to distribute — tokens are plain CSS. |
| **Vite** | 8.0.14 (in consumer `apps/web`) | The consumer's bundler / dev server | Not part of `packages/ui` itself — but it's what compiles the internal-package source. Confirms the no-build-needed-in-repo story (Vite transpiles TS natively). |

### Supporting Libraries (peer + design-system runtime)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react / react-dom** | 19.2.6 | Rendering | **peerDependency** (`"react": "^19.0.0"`). Never bundle — single React instance must come from the consumer. |
| **@clerk/clerk-react** | 5.61.3 | Framework-agnostic Clerk auth client | **peerDependency.** This is the non-Next replacement for `@clerk/nextjs`. Its own peer range already covers React 19 (`~19.0.3 || ~19.1.4 || ~19.2.3 || …`). Library assumes the consumer wraps the app in `<ClerkProvider>`. |
| **@xyflow/react** | 12.10.2 | Pipeline + agent canvases | **peerDependency** (its own peer range is `react >=17`, so it's React-19 safe). Heavy/stateful — keeping it a peer avoids double-bundling and version skew with the consumer. Travels verbatim from Helm. |
| **@tanstack/react-table** | 8.21.3 | DataGrid headless engine | Bundle as a regular `dependency` (it's headless, version-stable, and central to the DataGrid). Could also be a peer if `apps/web` uses it directly — default to dependency. |
| **@tanstack/react-virtual** | 3.13.24 | Row virtualization | `dependency` — internal to DataGrid. |
| **class-variance-authority** | 0.7.1 | Variant styling for shadcn components | `dependency`. Tiny, no React peer concern. |
| **tailwind-merge** | 3.6.0 | `cn()` class merge util | `dependency`. v3 line is the Tailwind-v4-aware release. |
| **clsx** | 2.1.x | `cn()` composition | `dependency`. |
| **lucide-react** | 1.17.0 | Icon set | `dependency` (or peer if you want consumer to dedupe). Note: Helm pins `^0.576.0`; lucide-react has since gone 1.x — verify the icon import surface didn't break during the port. |
| **radix-ui** | 1.4.3 | Headless primitives behind shadcn | `dependency`. Helm already uses the unified `radix-ui` package. |
| **sonner / cmdk / react-day-picker / recharts / @dnd-kit/\*** | (carry Helm's pins) | Toasts, command palette, date picker, charts, DnD | `dependency` — these are leaf libraries used by specific surfaces (notifications, DataGrid, datasets). Audit each at port time; none need to be peers. |

### Development / Validation Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **publint** (0.3.21) | Lints `package.json` `exports`/`main`/`module` against built output | Run in CI before publish/port. Catches the most common exports-field mistakes. tsdown integrates it (optional, off by default). |
| **@arethetypeswrong/cli** (0.18.2) | Verifies ESM + CJS consumers get correct `.d.ts` resolution | Pair with publint. Critical because dual-format `.d.ts` mismatches are silent until a consumer breaks. |
| **Vitest** | Component tests (Helm already uses it) | Reads `.ts(x)` source directly — internal-package pattern means tests run with zero build step. |
| **Storybook (Vite builder)** | Visual dev for extracted components | Optional but recommended for component libraries — Vite builder gives HMR. This is where Vite-as-dev-tool earns its place even though tsdown/tsup does the publish build. |
| **shadcn CLI** (`shadcn@latest`, v4 / March 2026) | Scaffolding new primitives + optional registry | `--monorepo` flag understands `packages/ui` + `apps/web` layout and routes files/imports correctly. Optional `registry:base` payload can ship the whole design system (components + CSS vars + config) in one install for cross-repo distribution. |

---

## Installation

```bash
# In packages/ui — runtime deps (bundled into / shipped with the library)
pnpm add @tanstack/react-table @tanstack/react-virtual class-variance-authority \
  clsx tailwind-merge radix-ui lucide-react sonner cmdk

# peerDependencies (declared, NOT installed as deps — consumer provides them)
#   "react": "^19.0.0"
#   "react-dom": "^19.0.0"
#   "@clerk/clerk-react": "^5.0.0"
#   "@xyflow/react": "^12.0.0"

# Dev / build / validation
pnpm add -D tsdown typescript tailwindcss @tailwindcss/vite \
  publint @arethetypeswrong/cli vitest @testing-library/react

# (Alternative bundler if not using tsdown)
pnpm add -D tsup
```

---

## package.json blueprint (the load-bearing config)

```jsonc
{
  "name": "@farsight/ui",
  "type": "module",
  "sideEffects": ["**/*.css"],          // NOT false — protects shipped CSS from tree-shaking
  "exports": {
    ".": {
      // Internal-package pattern: in-repo consumers read source; published artifact reads built files.
      // pnpm publishConfig (below) swaps these on `pnpm publish`.
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./theme.css": "./src/theme.css",   // Tailwind v4 @theme tokens — consumer @imports this
    "./styles.css": "./dist/styles.css" // optional prebuilt compiled CSS for consumers who don't run Tailwind
  },
  "publishConfig": {                     // pnpm-only: rewrite exports for the published/ported artifact
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js",
        "require": "./dist/index.cjs"
      },
      "./theme.css": "./dist/theme.css",
      "./styles.css": "./dist/styles.css"
    }
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@clerk/clerk-react": "^5.0.0",
    "@xyflow/react": "^12.0.0"
  }
}
```

```typescript
// tsdown.config.ts (for the publish/port artifact only)
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm', 'cjs'],
  platform: 'browser',
  dts: true,                          // oxc-transform fast path if isolatedDeclarations is on
  deps: { neverBundle: ['react', 'react-dom', /^react\//, '@clerk/clerk-react', '@xyflow/react'] },
  inputOptions: { jsx: { runtime: 'automatic' } },
})
```

> **`"use client"` caveat (only matters if `apps/web` were ever an RSC framework — it isn't):** Vite/SPA consumers ignore the directive, so this is a non-issue for the Farsight Vite target. If you ever publish for Next.js consumers, esbuild/Rollup strip directives by default; you'd add `banner: { js: '"use client"' }` (marks all output as client) or a per-file preserve plugin. **Flag for later, not now.**

---

## How to ship Tailwind v4 tokens to a greenfield consumer (the specific ask)

Helm's tokens live in `app/globals.css` as CSS variables. In Tailwind v4 the distribution model is **plain CSS, no JS config**:

1. **In `packages/ui`,** put the design tokens in a `src/theme.css` using `@theme`:
   ```css
   @theme {
     --color-background: oklch(...);
     --color-foreground: oklch(...);
     --color-card: ...;
     --color-border: ...;
     --radius: 0.5rem;
     /* ...the full token set extracted from Helm's globals.css */
   }
   ```
   Each `--color-*` automatically generates `bg-*` / `text-*` / `border-*` utilities AND is available at runtime as `var(--color-*)`.

2. **The greenfield `apps/web` inherits theming** with two `@import`s in its entry CSS:
   ```css
   @import "tailwindcss";
   @import "@farsight/ui/theme.css";          /* tokens → utilities + CSS vars */
   @source "../../packages/ui/src";           /* scan the lib's source for class usage */
   ```

3. **The `@source` directive is mandatory** when the consumer builds Tailwind itself and your component classes live in a separate package — Tailwind v4 only emits CSS for classes it can *find*. Point `@source` at `packages/ui/src` so the consumer's build picks up `bg-card`, `border-border`, etc. used inside your components. (This is the single most common "styles are missing" gotcha.)

4. **Alternative for non-Tailwind / prebuilt consumers:** also export a *compiled* `./styles.css` (Tailwind CLI output). A consumer who doesn't run Tailwind just imports the prebuilt CSS and skips `@source`. Ship both — `theme.css` (tokens, source) for Tailwind consumers, `styles.css` (compiled) as the fallback.

5. **Optional: dark mode / runtime theming** — keep Helm's `next-themes` swap pattern but use a framework-agnostic theme toggler; expose `:root` / `[data-theme]` blocks in the CSS so theme switching is pure CSS-variable reassignment.

---

## How to keep shadcn primitives consumable (the specific ask)

shadcn is **not an npm dependency** — it's a CLI that copies *source* into your repo. So:

- **The 34 `components/ui/*` files travel verbatim** into `packages/ui/src/components/ui/`. They become *your owned source*. There is no "shadcn package" to depend on at runtime — only `radix-ui`, `cva`, `clsx`, `tailwind-merge` (all already listed as deps).
- **Re-run `components.json` per workspace.** Each pnpm workspace that uses the shadcn CLI needs its own `components.json` with correct aliases. In `packages/ui`, use package-local `imports` (`#` subpath imports) or keep the `@/` alias scoped to the package; in `apps/web`, alias to `@farsight/ui/...`. The CLI `--monorepo` mode routes new components to `packages/ui` and rewrites imports in `apps/web`.
- **For cross-repo reuse later (optional):** build a private shadcn **registry** from the same source (`registry.json` → `npx shadcn build`). CLI v4's `registry:base` can distribute the whole design system (components + CSS vars + config) as one install. Defer this — it's only needed if Farsight ends up with apps *outside* its monorepo.

> Net: shadcn primitives stay consumable because they're just source files re-exported from `packages/ui`. The risk during extraction is the `@/` alias — Helm's deep `@/*` → repo-root alias must be rewritten to package-relative imports or `@farsight/ui/...`.

---

## peerDependency boundaries (the specific ask)

| Package | Classification | Rationale |
|---------|---------------|-----------|
| `react`, `react-dom` | **peer** | Single instance invariant — bundling causes "two Reacts" hook errors. |
| `@clerk/clerk-react` | **peer** | Auth provider/context must be the consumer's instance; consumer owns `<ClerkProvider>` and publishable key. Library assumes Clerk is present. |
| `@xyflow/react` | **peer** | Heavy + stateful + maintains its own context/store; double-instancing breaks the canvas. Consumer likely renders xyflow surfaces directly too. |
| Tailwind CSS | **NOT a peer dep** | Build-time only. Distributed via exported CSS (`@theme`) + `@source`, never imported as a runtime module. Do not list it in `peerDependencies`. |
| `@tanstack/react-table`, `@tanstack/react-virtual`, `radix-ui`, `cva`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `cmdk`, `recharts`, `@dnd-kit/*` | **dependency** | Internal implementation detail of the components; version-controlled by the library; no single-instance hazard. (Promote `@tanstack/react-table` to peer only if `apps/web` consumes it directly.) |

---

## TypeScript / `.d.ts` for workspace consumption (the specific ask)

**Default (recommended for Farsight's size): consume source, no project references.**
- `packages/ui` `exports` points `.` at `src/index.ts`. The TS language server and Vite read `.tsx` as valid type sources. Zero build step in dev; HMR + Vitest "just work."
- This is the Turborepo "Internal Packages" pattern. Farsight is not large enough to need the project-references machinery, and project references carry real footguns (`references` not inherited via `extends`, must be hand-synced with `package.json` deps).

**For the publish/port artifact:** generate real `.d.ts` via tsdown `dts: true` (or tsup `--dts`). Use `publishConfig.exports` (pnpm) to swap the published entry from `src/index.ts` → `dist/index.d.ts` + `dist/index.js`/`.cjs`. Validate with `publint` + `attw`.

**Only adopt project references** (`composite: true` + `references` + `tsc -b`) if Farsight's monorepo grows large enough that re-typechecking on every change becomes a measurable bottleneck. Not now.

**Gotcha:** enabling `isolatedDeclarations` (to unlock tsdown's fast oxc `.d.ts` path) requires explicit return-type annotations on every export. Helm's components are mostly inferred — this is a non-trivial annotation pass. Treat `isolatedDeclarations` as a *nice-to-have optimization*, not a requirement; tsdown falls back to `tsc` for `.d.ts` if it's off.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Internal source consumption (no in-repo build) | Pre-built `.d.ts` + project references | When the monorepo is large enough that whole-repo re-typecheck on change is slow. Not Farsight's situation today. |
| tsdown | tsup 8.5.1 | If you want the maximum-stability incumbent, don't want `isolatedDeclarations`, or are matching the Vercel/Turborepo template exactly. Both externalize React correctly. |
| tsdown / tsup | **Vite library mode** | If you want one tool for both dev (Storybook) *and* build, or have complex per-component CSS code-splitting needs (a known tsup pain point). Cost: slower Rollup-based prod builds, more config. For a Tailwind library shipping one CSS file, this advantage is moot. |
| tsdown / tsup | **unbuild / preconstruct** | unbuild (UnJS) is fine for utility libs but less React-component-focused; preconstruct is Babel-era and largely superseded. No reason to pick either here. |
| shadcn source-in-package | shadcn private **registry** | When distributing to repos *outside* the Farsight monorepo. Defer until that's a real requirement. |
| Tailwind `@theme` CSS export | JS-config Tailwind **preset** | Only if you must support Tailwind v3 consumers. Farsight is greenfield → Tailwind v4 → CSS-first is strictly better (no JS config to distribute). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `"sideEffects": false` (blanket) | Silently tree-shakes away your shipped CSS in consumer bundles — styles vanish with no error | `"sideEffects": ["**/*.css"]` |
| Bundling `react` / `react-dom` into the library | "Invalid hook call" / two-React-instances at runtime; version skew with consumer | Mark as `peerDependencies` + `external`/`neverBundle` |
| Listing Tailwind as a `peerDependency` | Tailwind is build-time, not a runtime module the library imports | Distribute tokens via exported `@theme` CSS + document `@source` |
| Distributing a `tailwind.config.js` preset for a greenfield v4 consumer | v4 is CSS-first; a JS preset is the v3 model and adds needless config | Export `theme.css` with `@theme` |
| Trying to `npm install` shadcn components | shadcn ships *source via CLI*, not a runtime component package | Copy `components/ui/*` into `packages/ui/src` as owned source |
| Path aliases (`@/*` → repo root) crossing package boundaries | Helm's deep `@/` alias breaks at runtime/port; not portable across the workspace | Package-relative imports + `exports`-based `@farsight/ui/...` imports; `workspace:*` for cross-package |
| TypeScript project references "because monorepo" | Footguns (not inherited via `extends`, must mirror deps), unnecessary at Farsight's scale | Consume source directly (Internal Packages pattern) |
| `@clerk/nextjs` (server or client) | Couples the library to Next.js; violates framework-agnostic constraint | `@clerk/clerk-react` (peer) |

---

## Stack Patterns by Variant

**If `packages/ui` is only ever consumed inside the Farsight monorepo (the stated plan):**
- Skip the library bundler for day-to-day work. `exports` → `src/index.ts`. Vite/Vitest compile it. Add tsdown only to produce a sanity-checkable build in CI (and for the eventual port artifact).
- Theming: `@theme` CSS export + `@source` in `apps/web`.

**If Farsight later publishes `packages/ui` to a registry or shares it across separate repos:**
- Turn on the tsdown/tsup build, `publishConfig.exports` → `dist/`, validate with `publint` + `attw`, and consider a shadcn `registry:base` payload for CLI-based distribution.

**If `isolatedDeclarations` annotation cost is acceptable:**
- Enable it → tsdown uses oxc-transform for `.d.ts` (much faster). Otherwise leave it off; tsdown falls back to `tsc`. Either way `.d.ts` output is correct.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@clerk/clerk-react@5.61.3` | `react@19.2.6` | Clerk's published peer range explicitly enumerates React 19.x minors (`~19.0.3 || ~19.1.4 || ~19.2.3 || ~19.3.0-0`). Pin React carefully — Clerk uses *tilde* ranges per minor, so a React minor ahead of Clerk's list can trip peer warnings. |
| `@xyflow/react@12.10.2` | `react@19` | Peer range `react >=17` — React 19 safe. Travels verbatim from Helm. |
| `tailwindcss@4.3.0` | `tailwind-merge@3.6.0` | `tailwind-merge` v3 is the Tailwind-v4-aware line; do not pair v4 Tailwind with `tailwind-merge` v2. |
| `tsdown@0.22.1` | Node `>=22.18.0`, `typescript` installed | tsdown requires Node 22.18+; TS must be present for `.d.ts`. Helm dev runs Node 25.8.1 — fine. |
| `tsup@8.5.1` | Node `>=18`, `typescript >=4.5` | Looser engine floor than tsdown. |
| `lucide-react@1.17.0` | `react@19` | Major bump from Helm's `^0.576.0` → 1.x. Verify icon import names/surface during port. |

---

## Sources

- npm registry (`npm view`, 2026-05-29) — verified current versions: tsup 8.5.1, tsdown 0.22.1, rolldown 1.0.3, tailwindcss 4.3.0, typescript 6.0.3, vite 8.0.14, react 19.2.6, @clerk/clerk-react 5.61.3 (+ peer ranges), @xyflow/react 12.10.2 (peer ranges), publint 0.3.21, @arethetypeswrong/cli 0.18.2, tailwind-merge 3.6.0, class-variance-authority 0.7.1, lucide-react 1.17.0, radix-ui 1.4.3 — **HIGH**
- Context7 `/rolldown/tsdown` (SKILL + option-dependencies + option-platform) — React library config, `deps.neverBundle`, `dts`, automatic JSX runtime — **HIGH**
- tsdown.dev (guide, dts options, migrate-from-tsup) + Alan Norbauer "Switching from tsup to tsdown" + PkgPulse "tsup vs tsdown vs unbuild 2026" — bundler comparison, `isolatedDeclarations`/oxc-transform path, ESM-first rationale — **HIGH**
- Vercel/Turborepo design-system template + "You might not need TypeScript project references" (turborepo.dev) + Colin McDonnell "Live types in a TypeScript monorepo" — internal-packages pattern, `publishConfig`, project-references tradeoffs — **HIGH**
- Tailwind CSS v4 docs + blog + fluentui-tailwindcss reference impl + "Design Tokens That Scale (Tailwind v4 + CSS Variables)" — `@theme` token distribution, `@source` directive, runtime CSS variables — **HIGH**
- shadcn/ui docs (monorepo, registry, CLI v4 March-2026 changelog) + openstatus "How We Built Our shadcn Component Registry" — source-in-package vs registry, `--monorepo` mode, `registry:base` — **HIGH** (registry mechanics MEDIUM: single primary source for `registry:base`)
- webpack tree-shaking docs + Hiroki Osame "Guide to the package.json exports field" + Material/Polaris `sideEffects` issues — `exports` ordering, `sideEffects: ["**/*.css"]` CSS protection — **HIGH**
- React `'use client'` reference + egoist/tsup #1106 + rollup-plugin-preserve-use-client — directive preservation (flagged as non-issue for the Vite target) — **MEDIUM**

---
*Stack research for: framework-agnostic React component library in a pnpm monorepo (Helm → Farsight `packages/ui`)*
*Researched: 2026-05-29*
