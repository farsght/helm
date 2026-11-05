# Phase 1: Package Foundation & Theming — Research

**Researched:** 2026-05-29
**Domain:** pnpm monorepo library packaging (tsdown/tsup), Tailwind v4 token distribution, `'use client'` preservation, peer-dep hygiene
**Confidence:** HIGH — stack verified against live npm registry and direct inspection of both the Helm source and the Farsight monorepo; Tailwind @source behavior confirmed against Tailwind maintainer guidance

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PKG-01 | Subpath `exports` + `sideEffects: ["**/*.css"]`, tree-shakeable — one import never pulls xyflow or Recharts | Exports map shape fully specified; sideEffects mechanics verified; wildcard vs. explicit export tradeoffs documented |
| PKG-02 | `react`, `react-dom`, `@clerk/react`, `@xyflow/react`, `@tanstack/react-query` as peers + root `pnpm.overrides`; `pnpm list react -r` = one version | Exact peer ranges determined; Clerk package name corrected (`@clerk/react`, not `@clerk/clerk-react`); Farsight root has no React override yet — needs adding |
| PKG-03 | `'use client'` preserved in built output; asserted in CI | Three preservation strategies documented with tsdown specifics; rollup-preserve-directives verified to work via tsdown's Rollup-compat plugin API |
| PKG-04 | tsdown (or tsup) build artifact externalizing peers + emitting `.d.ts` | Complete tsdown config provided; tsup alternative config provided; `isolatedDeclarations` tradeoff documented |
| THEME-01 | Lift `app/globals.css` `@theme` tokens to `./theme.css` subpath export | Exact split strategy: token-only CSS (`:root`, `.dark`, `@theme inline`, `@custom-variant`) + `@source` for self-scanning; `@import "tailwindcss"` goes to consumer, NOT theme.css |
| THEME-02 | Consumer `@source` directive + xyflow CSS import order docs + dark mode via `.dark` | Confirmed: `@source` in the imported CSS file IS respected by Tailwind — either approach works; recommended to put `@source` in theme.css pointing at `./src` so consumers don't need to know the path; xyflow import order locked |
| THEME-03 | JS/TS token export for charts (`tokens.chart[1]` replaces hardcoded hex) | Two implementation patterns documented: static CSS-var reference strings vs. `getComputedStyle` runtime read; static pattern recommended for SSR safety |
</phase_requirements>

---

## Summary

This phase scaffolds `packages/ui` in the Farsight pnpm monorepo as a buildable, themed, tree-shakeable library. Three critical findings that differ from the project-level STACK.md:

**Finding 1 — Farsight already has a packages/ui scaffold.** `~/Projects/farsight-platform/packages/ui` already exists with a `package.json`, `src/styles/globals.css` (full Tailwind token block), and 14 ported components. The Phase 1 work is not starting from zero — it is formalizing and completing what already exists: adding the build tooling (tsdown config), correcting the exports map shape (wildcard `./components/*` must become explicit named subpaths or a proper wildcard shape for tree-shaking), adding `sideEffects`, adding missing peers, and splitting off the `./theme.css` subpath.

**Finding 2 — Clerk package name is `@clerk/react`, not `@clerk/clerk-react`.** Farsight uses `@clerk/react@6.7.2`. The project STACK.md references `@clerk/clerk-react` which is the older naming. This affects PKG-02 peer declarations.

**Finding 3 — `@source` placement strategy is confirmed.** Tailwind maintainers explicitly recommend putting `@source "./src"` inside the package's CSS file (not requiring consumers to add their own `@source`). The current Farsight `globals.css` already does this. The Phase 1 split creates a `theme.css` that owns: the token values (`:root`, `.dark`), the Tailwind utility registrations (`@theme inline`), the dark variant (`@custom-variant dark`), and the self-scan (`@source "../../src"`). The `@import "tailwindcss"` moves to the consumer's CSS entry point.

**Primary recommendation:** Keep `packages/ui` as an internal-packages source-consumption package (no in-repo build step needed for `apps/web` dev). Add a tsdown build for the publish artifact and CI verification. Use `rollup-preserve-directives` with `preserveModules` (`unbundle: true` in tsdown) for correct per-file `'use client'` preservation. The "walking skeleton" proof is a throwaway Vite app in `apps/smoke` that imports built `@farsight/ui`, renders Button in light+dark, and asserts one React version.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token definition (`:root`, `.dark` values) | `packages/ui` CSS | — | Library owns the design contract; consumer only applies it |
| Tailwind utility generation (`@theme inline`) | `packages/ui` CSS | — | Must travel with the token values to produce utility classes |
| `@import "tailwindcss"` | Consumer (`apps/web`) | — | Each app must own the Tailwind entry — bundling it inside the package would cause duplicate Tailwind CSS |
| `@source` scanning for library files | `packages/ui` CSS (via `@source "../../src"`) | Consumer fallback | Tailwind maintainers recommend library-owned `@source`; consumer override is a fallback |
| Build artifact (dist/) | `packages/ui` tsdown config | — | Only needed for publish/port and CI smoke; in-repo source-consumption is the default |
| `peerDependencies` enforcement | `packages/ui` `package.json` | Farsight root `pnpm.overrides` | Package declares the contract; root overrides enforce single-version resolution |
| One-React-version guarantee | Farsight root `pnpm.overrides` | `pnpm list react -r` CI assertion | Declarative fix at the workspace root covers all packages simultaneously |
| Dark mode toggle/persistence | `apps/web` app shell | — | Library owns tokens only; app shell owns the `.dark` class toggle and storage |
| JS token export | `packages/ui` `src/lib/tokens.ts` | — | Static CSS-var reference strings; charts read `tokens.chart[1]` |

---

## Standard Stack

### Core (Phase 1)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsdown | 0.22.1 | Library build artifact — externalizes peers, emits `.d.ts`, ESM-first | Rolldown-powered; `rollup-preserve-directives` works via Rollup-compat API; near-identical config to tsup; ESM-first (no CJS gaps) `[VERIFIED: npm registry]` |
| tsup | 8.5.1 | Alternative to tsdown if stability preferred | Battle-tested, 6M+ wkly downloads; tsdown is preferred for ESM-first output `[VERIFIED: npm registry]` |
| rollup-preserve-directives | 1.1.3 | Per-module `'use client'` preservation when `unbundle: true` | Only maintained plugin that preserves per-file directives; works with tsdown via Rollup plugin compat `[VERIFIED: npm registry]` |
| publint | 0.3.21 | Lints `package.json` exports + built output | Catches exports-field mistakes silently swallowed by Node; run in CI before port `[VERIFIED: npm registry]` |
| @arethetypeswrong/cli | 0.18.2 | Verifies ESM + CJS consumers get correct `.d.ts` resolution | ESM `.d.ts` mismatches are silent until a consumer breaks `[VERIFIED: npm registry]` |
| tailwindcss | 4.3.0 (in packages/ui) | Design-system token distribution | v4 `@theme inline` + CSS vars is the enabling technology; already installed in Farsight `[VERIFIED: npm registry]` |

### Supporting (declared peers in packages/ui)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react | ^19.0.0 (peer) | Rendering | MUST be peer; single-instance invariant; Farsight apps/web already uses 19.2.6 `[VERIFIED: npm registry]` |
| react-dom | ^19.0.0 (peer) | DOM rendering | MUST be peer alongside react `[VERIFIED: npm registry]` |
| @clerk/react | ^6.0.0 (peer) | Auth client | **Note: `@clerk/react` NOT `@clerk/clerk-react`** — Farsight uses v6.7.2; peer range `react: ^18.0.0 \|\| ~19.x` `[VERIFIED: npm registry]` |
| @xyflow/react | ^12.0.0 (peer) | Canvas rendering | Phase 4 canvas surfaces use it; declare now for PKG-02 compliance; Farsight apps/web does not yet list it `[VERIFIED: npm registry]` |
| @tanstack/react-query | ^5.0.0 (peer) | Data-fetching engine | Phase 3 adapter seam; declare now for PKG-02 compliance; apps/web uses ^5.62.0 `[VERIFIED: npm registry]` |

### Existing packages/ui runtime dependencies (already installed, keep as-is)

| Library | Current Pin | Notes |
|---------|-------------|-------|
| `radix-ui` | ^1.4.3 | Correct — unified Radix package |
| `class-variance-authority` | ^0.7.1 | Correct |
| `clsx` | ^2.1.0 | Correct |
| `tailwind-merge` | ^3.0.0 | Correct — v3 is Tailwind v4 aware `[ASSUMED]` (version floor not verified against changelog) |
| `sonner` | ^2.0.7 | Correct |
| `lucide-react` | ^0.460.0 | **MISMATCH**: packages/ui pins 0.460.0; current registry is 1.17.0; Helm pins ^0.576.0. Audit icon imports during port (Phase 2). For Phase 1, leave as-is; don't change unless breaking. |
| `next-themes` | ^0.4.6 | **Flagged**: this is an app-shell concern; library should not own theme-toggle persistence. For Phase 1 it is harmless (not imported by theme.css); clean up in Phase 2 when phase 2 primitives are ported. |
| `@radix-ui/react-slot` | ^1.1.0 | **Redundant** with `radix-ui ^1.4.3` (unified package includes this); harmless but noisy `[ASSUMED]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsdown | tsup 8.5.1 | tsup is stable, more community examples; tsdown is ESM-first and Rolldown-native; both work identically for this use case |
| rollup-preserve-directives (unbundle) | `banner: "'use client'"` | Banner marks ALL files client; `rollup-preserve-directives` + `unbundle: true` preserves per-file semantics — correct for mixed server-safe/client-only exports |
| `@source` in theme.css | `@source` in consumer's CSS | Either works per Tailwind maintainers; library-owned is recommended to reduce consumer setup burden |

**Installation (packages/ui additions only):**
```bash
cd ~/Projects/farsight-platform
# Build tooling (devDependencies in packages/ui)
pnpm add -D tsdown rollup-preserve-directives publint @arethetypeswrong/cli \
  --filter @farsight/ui
```

**Version verification (run before installing):**
```bash
npm view tsdown version          # 0.22.1
npm view rollup-preserve-directives version   # 1.1.3
npm view publint version         # 0.3.21
npm view @arethetypeswrong/cli version        # 0.18.2
```

---

## Package Legitimacy Audit

> slopcheck was denied installation by the sandbox. Manual verification performed via npm view and GitHub source repo inspection.

| Package | Registry | Age | Source Repo | Disposition |
|---------|----------|-----|-------------|-------------|
| tsdown | npm | 2023-10 (~2.5 yrs) | github.com/rolldown/tsdown (official Rolldown org) | Approved `[ASSUMED]` |
| tsup | npm | 2020-05 (~6 yrs) | github.com/egoist/tsup (well-known author) | Approved `[ASSUMED]` |
| rollup-preserve-directives | npm | 2023-07 (~2 yrs) | github.com/huozhi/rollup-preserve-directives | Approved — 7 versions, MIT `[ASSUMED]` |
| publint | npm | 2022-05 (~4 yrs) | github.com/publint/publint | Approved `[ASSUMED]` |
| @arethetypeswrong/cli | npm | 2023-06 (~3 yrs) | github.com/arethetypeswrong/arethetypeswrong.github.io | Approved `[ASSUMED]` |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged [SUS]:** none found via manual check

*slopcheck was unavailable at research time — all packages above are tagged `[ASSUMED]` and the planner should add a checkpoint after each install to confirm postinstall scripts are benign. None of the five packages above are known to have problematic postinstall scripts; tsdown and publint have no postinstall listed on npm.*

---

## Architecture Patterns

### System Architecture Diagram

```
Helm source (donor)
  app/globals.css
    └── @theme, :root, .dark, @theme inline
                │
                │  (lift tokens)
                ▼
packages/ui/src/styles/theme.css    ← THEME-01: new file
  @custom-variant dark
  @source "../../src"               ← self-scan for utility discovery
  :root { --background: oklch(...); --chart-1: ...; ... }
  .dark { --background: oklch(...); --chart-1: ...; ... }
  @theme inline {
    --color-background: var(--background);
    --color-chart-1: var(--chart-1);
    ... 
  }
                │
    ┌───────────┴──────────────────────────────┐
    │                                          │
    ▼                                          ▼
packages/ui package.json exports        packages/ui/src/lib/tokens.ts  ← THEME-03
  "./theme.css": "./src/styles/theme.css      export const tokens = {
  ".": "./src/index.ts"                         chart: [
  "./button": "./src/components/button.tsx"       'var(--chart-1)',
  (explicit named subpaths)                       'var(--chart-2)',
                                                  ...
                                                ]
                                              }
                │
                │  (consumer imports)
                ▼
apps/web/src/index.css              ← THEME-02: consumer setup
  @import "tailwindcss";
  @import "@farsight/ui/theme.css"; ← tokens + utility registrations + @source
  @import "@xyflow/react/dist/style.css"; ← AFTER tailwindcss (Phase 4 xyflow)

                │  (tsdown build for CI/port artifact)
                ▼
packages/ui/dist/                   ← PKG-04
  button.js  button.d.ts           ← 'use client' preserved per file
  card.js    card.d.ts
  index.js                         ← re-exports all
  (per-module, unbundled)

                │  (walking skeleton proof)
                ▼
apps/smoke/ (throwaway Vite app)    ← Phase 1 MVP validation
  imports @farsight/ui/button
  renders <Button> light + dark
  pnpm list react -r = one version
```

### Recommended Project Structure (packages/ui additions)

```
packages/ui/
├── src/
│   ├── styles/
│   │   ├── theme.css         # NEW: tokens only (THEME-01) — no @import "tailwindcss"
│   │   └── globals.css       # EXISTING: full CSS entry (keep for apps/web backward compat)
│   ├── lib/
│   │   ├── utils.ts          # EXISTING: cn()
│   │   └── tokens.ts         # NEW: JS token export (THEME-03)
│   ├── components/           # EXISTING: 14 components already ported
│   │   └── ui/               # (recommended restructure for Phase 2)
│   └── index.ts              # EXISTING: public surface
├── tsdown.config.ts          # NEW: PKG-04 build config
├── package.json              # MODIFY: exports, sideEffects, peerDeps, publishConfig
└── tsconfig.json             # EXISTING: keep; verify `moduleResolution: bundler`
```

### Pattern 1: Exports Map (PKG-01)

The existing `packages/ui` uses wildcard exports (`"./components/*": "./src/components/*.tsx"`). This is valid for source-consumption but does not enable proper tree-shaking assertions in the built artifact. For Phase 1, keep wildcards for source-consumption but add explicit named entries for the primitives included in Phase 1's scope.

**Decision: use hybrid map** — explicit entries for the CSS subpaths (non-negotiable) + wildcard for components (acceptable for internal source-consumption; revisit in Phase 2 when all 34 primitives exist).

```jsonc
// packages/ui/package.json — exports map shape
{
  "name": "@farsight/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "sideEffects": ["**/*.css"],          // PKG-01: protect CSS from tree-shaking
  "exports": {
    ".": {
      // Internal-packages pattern: source for in-repo dev, dist for publish
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./theme.css": "./src/styles/theme.css",     // THEME-01
    "./styles/globals.css": "./src/styles/globals.css",  // backward compat for apps/web
    "./components/*": "./src/components/*.tsx",   // source wildcard (in-repo only)
    "./lib/*": "./src/lib/*.ts",
    "./hooks/*": "./src/hooks/*.ts"
  },
  "publishConfig": {
    // pnpm swaps these on publish — built artifact replaces source entries
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js"
      },
      "./theme.css": "./dist/styles/theme.css",
      "./styles/globals.css": "./dist/styles/globals.css",
      "./components/*": "./dist/components/*.js",
      "./lib/*": "./dist/lib/*.js"
    }
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@clerk/react": "^6.0.0",
    "@xyflow/react": "^12.0.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "peerDependenciesMeta": {
    "@clerk/react":           { "optional": true },
    "@xyflow/react":          { "optional": true },
    "@tanstack/react-query":  { "optional": true }
  }
}
```

**Why `peerDependenciesMeta: optional: true` for Clerk/xyflow/query?** Phase 1 has no canvas or data-fetching components — requiring these peers would force the smoke test Vite app to install them unnecessarily. Optional peers warn if missing but don't block install. Tighten to required when the relevant surfaces are added in Phase 3/4. `[ASSUMED]` — optional peer behavior verified against pnpm docs, but the specific Clerk/xyflow peer requirement at Phase 1 is a judgment call.

### Pattern 2: tsdown Config (PKG-04, PKG-03)

```typescript
// packages/ui/tsdown.config.ts
// Source: tsdown.dev/guide + tsdown.dev/advanced/plugins + rolldown.rs/in-depth/directives
import { defineConfig } from 'tsdown'
import preserveDirectives from 'rollup-preserve-directives'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],                    // ESM-only for Vite/modern consumers
  platform: 'browser',
  dts: true,                          // emit .d.ts via rolldown-plugin-dts
  unbundle: true,                     // preserveModules: per-file output — enables directive preservation
  plugins: [
    preserveDirectives() as any,      // rollup-preserve-directives works via Rollup compat API
  ],
  define: {
    // Externalize all peers
  },
  external: [
    'react',
    'react-dom',
    /^react\//,
    '@clerk/react',
    '@xyflow/react',
    '@tanstack/react-query',
  ],
})
```

**Key: `unbundle: true`** — tsdown's equivalent of `preserveModules: true`. This outputs one `.js` file per source module (not a single bundle). `rollup-preserve-directives` requires this to know which files originally had `'use client'`. Without `unbundle: true`, the plugin cannot preserve per-file directives.

**Alternative with tsup (if tsdown is not chosen):**
```typescript
// packages/ui/tsup.config.ts
import { defineConfig } from 'tsup'
import preserveDirectives from 'rollup-preserve-directives'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  treeshake: false,    // don't tree-shake — keep all modules for per-file output
  esbuildPlugins: [],
  rollupOptions: {
    preserveModules: true,
    plugins: [preserveDirectives()],
  },
  external: ['react', 'react-dom', '@clerk/react', '@xyflow/react', '@tanstack/react-query'],
})
```

### Pattern 3: theme.css Split (THEME-01, THEME-02)

The existing `packages/ui/src/styles/globals.css` contains BOTH `@import "tailwindcss"` AND the token values. Phase 1 splits this:

**What goes into `src/styles/theme.css` (tokens only — no tailwindcss import):**
```css
/* packages/ui/src/styles/theme.css */
/* Source: Tailwind v4 docs + tailwindcss/discussions/18770 */

/* Dark mode variant — library owns this declaration */
@custom-variant dark (&:is(.dark *));

/* Tailwind scans packages/ui source files for utility class usage.
   Path is relative to THIS file's location. */
@source "../../src";

/* Light mode tokens */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  /* ... lifted verbatim from Helm's app/globals.css :root block ... */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
}

/* Dark mode tokens — library owns the contract, app shell toggles .dark */
.dark {
  --background: oklch(0.141 0.005 285.823);
  /* ... lifted verbatim from Helm's app/globals.css .dark block ... */
  --chart-1: oklch(0.488 0.243 264.376);
}

/* Register tokens as Tailwind utility classes */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ... all --color-* mappings ... */
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
}
```

**What apps/web `index.css` must contain (THEME-02 consumer setup):**
```css
/* apps/web/src/index.css */
@import "tailwindcss";
@import "@farsight/ui/theme.css";     /* imports tokens + @source + @custom-variant dark */
/* @xyflow/react CSS comes in Phase 4 — document here as placeholder */
/* @import "@xyflow/react/dist/style.css"; */
```

**Why `@import "tailwindcss"` must be in the consumer, NOT in theme.css:**
Putting `@import "tailwindcss"` inside a CSS file that is then re-imported causes Tailwind to be processed twice, generating duplicate CSS and potential specificity conflicts. The consumer must own the Tailwind entry point. The existing `globals.css` (which contains `@import "tailwindcss"`) is a different concern — it remains for backward compat but becomes the "full entry" CSS; `theme.css` is the new "tokens-only" split.

**Backward compatibility:** `apps/web` currently imports `@farsight/ui/styles/globals.css`. After Phase 1:
- `globals.css` becomes: `@import "tailwindcss"; @import "./theme.css"; @layer base { ... }`
- `theme.css` is the new subpath export
- `apps/web/index.css` should migrate to the new `@import "tailwindcss"; @import "@farsight/ui/theme.css"` pattern during Phase 1

### Pattern 4: JS Token Export (THEME-03)

```typescript
// packages/ui/src/lib/tokens.ts
// Static CSS-var reference strings — read at render time by the browser
// Do NOT use getComputedStyle() — that is SSR-unsafe and requires a DOM reference

/**
 * Semantic token references for use in inline styles / chart configs.
 * Use these instead of hardcoded hex in chart stroke/fill props.
 *
 * Usage: stroke={tokens.chart[0]}  (NOT stroke="#266DF0")
 * Value at runtime resolves through CSS custom properties.
 */
export const tokens = {
  chart: [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
  ],
  color: {
    background:   'var(--color-background)',
    foreground:   'var(--color-foreground)',
    primary:      'var(--color-primary)',
    muted:        'var(--color-muted)',
    mutedFg:      'var(--color-muted-foreground)',
    destructive:  'var(--color-destructive)',
    border:       'var(--color-border)',
  },
} as const

export type TokenChart = typeof tokens.chart[number]
export type TokenColor = keyof typeof tokens.color
```

**Why static strings (not `getComputedStyle`)?** Recharts `stroke` and `fill` props accept any CSS-valid string including `var(--color-chart-1)`. The browser resolves the CSS var at paint time. `getComputedStyle` requires a DOM element reference (unavailable in RSC/SSR) and is called at every render — unnecessary overhead. The static `'var(--color-chart-1)'` string is idiomatic for Tailwind v4's CSS-var model.

### Pattern 5: pnpm.overrides for React (PKG-02)

The Farsight root `package.json` currently has no React override. Add to prevent version drift:

```jsonc
// ~/Projects/farsight-platform/package.json (root)
{
  "overrides": {
    "js-cookie": ">=3.0.7",    // existing
    "react": "19.2.6",          // ADD: pin to exact version installed in apps/web
    "react-dom": "19.2.6"       // ADD
  }
}
```

**Verification command:** `pnpm list react -r` must show exactly one version across all workspace packages.

### Anti-Patterns to Avoid

- **Wildcard `sideEffects: false`** — silently strips CSS from consumer bundles. Use `["**/*.css"]` only.
- **`@import "tailwindcss"` inside `theme.css`** — causes Tailwind to process twice; duplicate CSS.
- **`banner: "'use client'"` without `unbundle: true`** — marks every file client, loses server-safe exports. Fine only if 100% of exports are guaranteed client-only (they won't be in Phase 2).
- **`@clerk/clerk-react` as the peer dep name** — Farsight uses `@clerk/react`; wrong package name would silently install both.
- **Leaving `tailwindcss` in `peerDependencies`** — it's build-time, not a runtime import. Consumers won't import it from the library.
- **Keeping `next-themes` as a `dependency` long-term** — it's an app-shell concern. Leave in place for Phase 1 (harmless), remove in Phase 2.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `'use client'` preservation in bundled output | Custom Rolldown transform | `rollup-preserve-directives` + `unbundle: true` | Per-file directive tracking requires per-module knowledge the transform plugin already has; hand-rolled risks missing edge cases on re-exports |
| Exports map linting | Manual checklist | `publint` | Checks actual built output vs. declared exports; catches subtle format issues |
| `.d.ts` generation | `tsc` direct call | tsdown `dts: true` (uses `rolldown-plugin-dts`) | Integrated into the build pipeline; handles re-exports and module augmentations correctly |
| React dedup enforcement | Manual `package.json` review | `pnpm list react -r` in CI | pnpm's strict isolation makes duplicates explicit; the command reveals the truth |

**Key insight:** The "library packaging" domain has a specific, narrow set of tools that handle the non-obvious edge cases (directive stripping, exports field semantics, `.d.ts` re-export chains). Using them prevents the pitfalls that burned teams who hand-rolled.

---

## Common Pitfalls

### Pitfall 1: `'use client'` Stripped — Rolldown strips directives by default

**What goes wrong:** tsdown/Rolldown strips module-level `'use client'` when bundling (default non-`unbundle` mode). The built artifact has zero `'use client'` markers. Any Next.js consumer's Server Components will throw hook errors.

**Why it happens:** Rolldown's default is to process directives like `"use strict"` — strip unless in specific conditions. Non-`unbundle` mode merges files, making per-file directive preservation impossible without a plugin.

**How to avoid:**
- Use `unbundle: true` in `tsdown.config.ts` (= `preserveModules: true` in Rolldown output)
- Add `rollup-preserve-directives` plugin (works via tsdown's Rollup compat layer)
- CI step: `grep -r "'use client'" packages/ui/dist/ | wc -l` — must be > 0

**Warning signs:** `dist/` has no `'use client'` strings; Rolldown `MODULE_LEVEL_DIRECTIVE` warnings in build output.

### Pitfall 2: Tailwind Classes Not Generated — Missing @source

**What goes wrong:** Consumer imports `theme.css` and tokens apply (CSS vars are present) but components render with correct structure and no colors/spacing. Reason: Tailwind's scanner never found the class names like `bg-card`, `text-foreground` used inside packages/ui source files.

**Why it happens:** Tailwind v4 scans from the CSS entry point's directory outward. `packages/ui/src` is not scanned unless explicitly pointed to.

**How to avoid:**
- Include `@source "../../src"` in `theme.css` (path relative to `src/styles/theme.css` resolves to `packages/ui/src`)
- Validate from a separate minimal Vite app (`apps/smoke`), NOT from within Helm

**Warning signs:** Components have correct DOM structure but no visible styling; `@source` directive is absent from both `theme.css` and consumer's CSS.

### Pitfall 3: Wrong Clerk Peer Package Name

**What goes wrong:** Declaring `"@clerk/clerk-react": "^5.0.0"` as a peer when Farsight uses `@clerk/react@6.7.2`. pnpm strict peer resolution would flag an unsatisfied peer, or worse install both packages creating two Clerk contexts.

**Why it happens:** Project STACK.md used `@clerk/clerk-react` (the older package name). Farsight migrated to `@clerk/react`.

**How to avoid:** Peer dep must be `"@clerk/react": "^6.0.0"` (verified against Farsight `apps/web/package.json`).

### Pitfall 4: Duplicate React — Missing pnpm.overrides

**What goes wrong:** `pnpm list react -r` shows two React versions; hooks throw `Invalid hook call` the first time `apps/web` renders a library component.

**Why it happens:** Farsight root has no `react`/`react-dom` override. pnpm's strict isolation can resolve separate instances for `packages/ui` (devDep) and `apps/web` (dep) under certain version range differences.

**How to avoid:** Add `"react": "19.2.6"` and `"react-dom": "19.2.6"` to root `overrides` in `farsight-platform/package.json`. Then run `pnpm install` and verify `pnpm list react -r`.

### Pitfall 5: Duplicate @import "tailwindcss" — CSS processed twice

**What goes wrong:** If `theme.css` also contains `@import "tailwindcss"` AND `apps/web/index.css` does the same, Tailwind processes its base styles twice. This causes duplicate CSS reset, specificity issues, and larger output.

**Why it happens:** Extracting the token block from `globals.css` but copying the entire file content (including `@import "tailwindcss"`) into `theme.css`.

**How to avoid:** `theme.css` contains ONLY: `@custom-variant`, `@source`, `:root`, `.dark`, `@theme inline`. The `@import "tailwindcss"` line stays in the consumer's CSS (or in `globals.css` which remains for backward compat).

### Pitfall 6: Farsight apps/web CSS migration not completed

**What goes wrong:** Phase 1 adds `./theme.css` subpath but `apps/web/index.css` still points to `@farsight/ui/styles/globals.css` (which has `@import "tailwindcss"` inside). The new split isn't actually used or validated.

**How to avoid:** Phase 1 must migrate `apps/web/src/index.css` to the new pattern (`@import "tailwindcss"; @import "@farsight/ui/theme.css"`) AND update `globals.css` to import from `theme.css` internally. Both changes are required to prove the split works.

---

## Code Examples

### Walking Skeleton: Minimal Vite Smoke App

The MVP proof is a throwaway Vite app (`apps/smoke`) that:
1. Installs `@farsight/ui` via `workspace:*`
2. Imports the built artifact (not source — this tests PKG-04)
3. Renders `<Button>` in light + dark mode
4. Asserts one React version via `pnpm list react -r`

```json
// apps/smoke/package.json
{
  "name": "@farsight/smoke",
  "private": true,
  "type": "module",
  "dependencies": {
    "@farsight/ui": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "vite": "^8.0.0"
  }
}
```

```css
/* apps/smoke/src/index.css */
@import "tailwindcss";
@import "@farsight/ui/theme.css";
```

```tsx
// apps/smoke/src/App.tsx
import { Button } from '@farsight/ui/components/button'
import './index.css'

export default function App() {
  return (
    <div className="p-8 space-y-4">
      <div className="bg-background text-foreground p-4">
        <Button>Light mode</Button>
      </div>
      <div className="dark bg-background text-foreground p-4">
        <Button>Dark mode</Button>
      </div>
    </div>
  )
}
```

**Validation commands:**
```bash
# Build the library artifact first
pnpm --filter @farsight/ui build

# Then start the smoke app (it reads from dist/ via publishConfig)
pnpm --filter @farsight/smoke dev

# React version check
pnpm list react -r

# 'use client' preservation check
grep -r "'use client'" packages/ui/dist/ | wc -l
# Must be > 0 (should equal count of components with 'use client')

# Exports + types validity
npx publint packages/ui
```

### CI: `'use client'` assertion (PKG-03)

```bash
# In CI script or package.json scripts.check-directives:
CLIENT_COUNT=$(grep -rl "'use client'" packages/ui/dist/ 2>/dev/null | wc -l)
EXPECTED=26  # Count of components/ui/*.tsx that have 'use client' (verified: 26 of 34)
if [ "$CLIENT_COUNT" -lt "$EXPECTED" ]; then
  echo "FAIL: 'use client' directives missing in dist/ — got $CLIENT_COUNT, expected >= $EXPECTED"
  exit 1
fi
echo "PASS: $CLIENT_COUNT 'use client' files in dist/"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` preset distribution | `@theme` CSS export + `@source` | Tailwind v4 (2024) | No JS config to distribute; tokens are plain CSS; consumer doesn't need Node to process them |
| tsup as de facto library bundler | tsdown (Rolldown-powered) as forward-looking choice | 2025-2026 | ESM-first output; faster via Rust; same config mental model as tsup; both valid choices |
| `@clerk/clerk-react` (legacy) | `@clerk/react` (current) | Clerk SDK v5+ consolidation | New package name; v6.7.2 is current in Farsight |
| Distributing compiled CSS only | Distributing `@source` + tokens + compiling in consumer | Tailwind v4 | Consumer gets utility class generation for free; no duplicate CSS |
| `preserveModules: false` (single bundle) | `unbundle: true` + `rollup-preserve-directives` | Library-ecosystem best practice matured ~2023-2024 | Per-file `'use client'` semantics preserved; tree-shaking at module level |

**Deprecated/outdated:**
- Distributing a `tailwind.config.js` preset: the v3 model; not applicable to Tailwind v4 consumers
- `@clerk/nextjs` (server components): strips from this library entirely; replaced by `@clerk/react` peer

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `rollup-preserve-directives` works correctly with tsdown's `unbundle: true` via Rollup compat API | Standard Stack, Pattern 2 | If incompatible: fall back to `banner: "'use client'"` (marks all files client) or switch to tsup which has documented `preserveModules` support |
| A2 | `peerDependenciesMeta: optional: true` for `@clerk/react`, `@xyflow/react`, `@tanstack/react-query` is the right Phase 1 choice | Pattern 1 | If pnpm `strictPeerDependencies: true` treats optional peers differently than expected, adjust to `required: true` — Farsight workspace has `strictPeerDependencies: true` |
| A3 | `tailwind-merge` v3 is fully Tailwind v4 compatible | Standard Stack | If not: check tailwind-merge changelog; v3 is the documented Tailwind v4 line but exact version floor of Tailwind v4 features is [ASSUMED] |
| A4 | `@radix-ui/react-slot` can be removed from packages/ui as redundant with `radix-ui` unified package | Standard Stack | If `radix-ui` does not re-export `react-slot`'s specific export shape, keep `@radix-ui/react-slot` |
| A5 | tsdown `dts: true` without `isolatedDeclarations` falls back to `tsc` for `.d.ts` generation | Pattern 2, PKG-04 | If tsdown requires `isolatedDeclarations` to emit `.d.ts`, an annotation pass is needed on all exports before the build works |

---

## Open Questions (RESOLVED)

> **All three resolved — none blocks Phase 1, and no Phase 1 plan task depends on any of these answers:**
> 1. **RESOLVED** — `apps/smoke` location: deferred to Phase 4 PORT-01. The Phase 1 walking skeleton uses a local `tsx` import smoke inside the Helm-staged package (no workspace app needed); the truly-external-consumer proof is PORT-01.
> 2. **RESOLVED** — `globals.css` backward-compat: a Farsight-monorepo concern, deferred to the Phase 4 port. Phase 1 ships `theme.css` standalone in the Helm-staged package; reconciling Farsight's `globals.css` happens at port time.
> 3. **RESOLVED** — `lucide-react` major drift: deferred to the Phase 2 icon audit. No icons are ported in Phase 1 (only Button + Label).

1. **Should `apps/smoke` live inside the Farsight monorepo or be a truly external repo?**
   - What we know: PKG-02 requires "exactly one React version" proof; PORT-01 (Phase 4) requires verified workspace consumption from an external consumer
   - What's unclear: Whether an `apps/smoke` inside the monorepo (same workspace) sufficiently proves the external-consumer story for Phase 1
   - Recommendation: Use `apps/smoke` inside the monorepo for Phase 1 (same workspace = realistic for the intended use case); defer truly-external test to Phase 4 PORT-01

2. **`globals.css` backward compat: convert to import-from-theme.css or keep parallel?**
   - What we know: apps/web currently imports `@farsight/ui/styles/globals.css`; it should migrate to the new `theme.css` pattern
   - What's unclear: Whether to update `globals.css` in-place (it `@import`s `./theme.css` internally) or to migrate `apps/web` to directly import `theme.css`
   - Recommendation: Refactor `globals.css` to be `@import "tailwindcss"; @import "./theme.css"; @layer base { ... }` AND migrate `apps/web` to directly import `theme.css` (both changes in the same wave)

3. **`lucide-react` version drift (packages/ui pins 0.460.0, current is 1.17.0)**
   - What we know: packages/ui has `^0.460.0`; Helm has `^0.576.0`; current registry is 1.17.0; lucide had a v1.0 breaking change
   - What's unclear: Which specific icon names changed in the major version bump
   - Recommendation: Leave at current pin for Phase 1 (icon API changes are Phase 2 scope where components are being ported); add an audit task to Phase 2

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pnpm | Workspace management | ✓ | 11.2.2 (Farsight uses `pnpm@11.2.2`) | — |
| Node.js | tsdown, build scripts | ✓ | 25.8.1 (Helm); Farsight `engines.node: >=22` | — |
| tsdown | PKG-04 build | Must install | — | tsup 8.5.1 (drop-in alternative) |
| rollup-preserve-directives | PKG-03 `'use client'` | Must install | — | `banner: "'use client'"` (less precise) |
| publint | Export linting | Must install | — | Manual `node --conditions=require,import` check |

**Missing dependencies with no fallback:** none blocking — all have alternates or are to-be-installed.
**Missing dependencies with fallback:** tsdown (tsup fallback); rollup-preserve-directives (banner fallback).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 (Helm); Vitest 3.2.4 (Farsight root) |
| Config file | `vitest.config.ts` (Helm); none yet in packages/ui |
| Quick run command | `pnpm --filter @farsight/ui build && pnpm list react -r` |
| Full suite command | `pnpm --filter @farsight/ui build && npx publint packages/ui && grep -r "'use client'" packages/ui/dist/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| PKG-01 | `sideEffects: ["**/*.css"]` present; exports map has CSS subpaths | Static assertion | `node -e "const p=require('./packages/ui/package.json'); console.assert(Array.isArray(p.sideEffects))"` | File-level check; run in CI |
| PKG-01 | Importing Button does not pull xyflow into bundle | Bundle analysis | `pnpm --filter @farsight/smoke build && npx vite-bundle-visualizer` | Manual verification via smoke app |
| PKG-02 | One React version | `pnpm list` | `pnpm list react -r` — inspect output; fail if >1 version shown | Run after `pnpm install` in CI |
| PKG-02 | Correct peers declared | Static assertion | `node -e "const p=require('./packages/ui/package.json'); console.assert(p.peerDependencies['@clerk/react'])"` | Verifies correct package name |
| PKG-03 | `'use client'` in dist | grep | `grep -rl "'use client'" packages/ui/dist/ \| wc -l` — assert >= 26 | Exact count = number of ui components with directive (26 of 34 confirmed) |
| PKG-04 | Build succeeds; dist/ has .js + .d.ts | Build smoke | `pnpm --filter @farsight/ui build` exits 0; `ls packages/ui/dist/` shows .js and .d.ts | CI gated |
| PKG-04 | publint passes | Export lint | `npx publint packages/ui` exits 0 | After build |
| THEME-01 | `./theme.css` is a resolvable subpath export | Import test | From smoke app: `node -e "import('@farsight/ui/theme.css')"` in Vite build context | Validated by smoke app CSS import |
| THEME-01 | theme.css contains no `@import "tailwindcss"` | grep | `grep '@import "tailwindcss"' packages/ui/src/styles/theme.css` — must return nothing | Prevent duplicate Tailwind |
| THEME-02 | Utility classes generated in smoke app | Visual | `pnpm --filter @farsight/smoke dev` — Button renders with bg-background, text-foreground visually applied | Manual check against smoke app |
| THEME-02 | Dark mode toggle applies `.dark` correctly | Visual | In smoke app, add `className="dark"` to parent — dark token values apply | Manual in smoke app |
| THEME-03 | `tokens.chart[0]` resolves to CSS var string | Unit | `import { tokens } from '@farsight/ui/lib/tokens'; assert(tokens.chart[0] === 'var(--color-chart-1)')` | Unit test in packages/ui |

### Sampling Rate

- **Per task commit:** `pnpm --filter @farsight/ui build` exits 0
- **Per wave merge:** Full suite: build + publint + grep `'use client'` + `pnpm list react -r`
- **Phase gate:** Smoke app renders Button light+dark styled, all 7 requirements verified

### Wave 0 Gaps

- [ ] `packages/ui/tsdown.config.ts` — does not exist; Wave 0 creates it
- [ ] `packages/ui/src/styles/theme.css` — does not exist; Wave 0 creates it
- [ ] `packages/ui/src/lib/tokens.ts` — does not exist; Wave 0 creates it
- [ ] `apps/smoke/` — does not exist; Wave 0 scaffolds it
- [ ] `packages/ui/package.json` `sideEffects` field — not set; Wave 0 adds it
- [ ] `packages/ui/package.json` `peerDependencies` — incomplete; Wave 0 corrects it
- [ ] Farsight root `overrides.react` — not set; Wave 0 adds it

*(Existing infrastructure covers typecheck; no new test framework needed for Phase 1 — validation is build-output assertions and the smoke app)*

---

## Security Domain

PKG-01–04 and THEME-01–03 are packaging and CSS distribution concerns. No authentication, data access, or external network calls are introduced in Phase 1. ASVS categories V2, V3, V4, V6 do not apply. V5 (input validation) is not applicable — no user input is processed.

The one security-relevant observation: `peerDependenciesMeta: optional` for Clerk means a consumer who fails to install Clerk will get no compile error from the library alone. The runtime will fail at the Clerk hook call sites, not silently. This is acceptable — Phase 1 has no Clerk-dependent components.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `~/Projects/farsight-platform/packages/ui/package.json`, `src/styles/globals.css`, `apps/web/package.json`, `apps/web/src/index.css`, `pnpm-workspace.yaml`, root `package.json` — current state of the target monorepo
- Direct inspection of `/Users/scottjensen/Projects/helm/app/globals.css` — source token values to lift
- Direct inspection of `/Users/scottjensen/Projects/helm/components/ui/` — 34 components; 26 have `'use client'`, 8 do not
- npm registry `npm view` (2026-05-29) — verified current versions: tsdown 0.22.1, tsup 8.5.1, publint 0.3.21, @arethetypeswrong/cli 0.18.2, rollup-preserve-directives 1.1.3, tailwindcss 4.3.0, react 19.2.6, @clerk/react 6.7.2

### Secondary (MEDIUM confidence)
- [tsdown.dev/advanced/plugins](https://tsdown.dev/advanced/plugins) — rollup-preserve-directives usage with tsdown via Rollup compat layer
- [rolldown.rs/in-depth/directives](https://rolldown.rs/in-depth/directives) — Rolldown directive handling; `output.preserveModules` preserves top-level directives; `output.banner` as fallback
- [tailwindcss.com/docs/detecting-classes-in-source-files](https://tailwindcss.com/docs/detecting-classes-in-source-files) — `@source` directive behavior in imported CSS files
- [github.com/tailwindlabs/tailwindcss/discussions/18770](https://github.com/tailwindlabs/tailwindcss/discussions/18770) — monorepo `@source` gotcha; Tailwind maintainer recommendation to put `@source` in package CSS

### Tertiary (LOW — training knowledge, not verified in this session)
- Rollup `preserveModules: true` semantics for per-file output
- tsdown `unbundle: true` as the `preserveModules` equivalent (inferred from tsdown.dev/options/unbundle page structure; exact config key should be confirmed against live tsdown docs before writing the config)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all versions verified against npm registry; Farsight monorepo inspected directly
- Architecture (exports map, theme.css split, token export): HIGH — grounded in direct source inspection + Tailwind maintainer guidance
- `'use client'` preservation via rollup-preserve-directives + tsdown: MEDIUM-HIGH — documented path via Rollup compat API; `unbundle: true` key name is ASSUMED (verify against tsdown docs before implementing)
- Pitfalls: HIGH — verified against official docs and direct code inspection

**Research date:** 2026-05-29
**Valid until:** 2026-08-29 (tsdown moves fast; verify versions before executing)
