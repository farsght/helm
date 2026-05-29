# Phase 1: Package Foundation & Theming — Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 7 new/modified targets (5 new files, 2 modified files)
**Analogs found:** 4 / 7 (3 scaffolding files have no Helm analog — documented below)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/ui/src/styles/theme.css` | config (CSS) | transform | `app/globals.css` (Helm) | exact — token block lifted verbatim |
| `packages/ui/src/lib/tokens.ts` | utility | transform | `lib/utils.ts` (Helm) | role-match — same export style, different content |
| `packages/ui/src/components/ui/*.tsx` | component | request-response | `components/ui/*.tsx` (Helm) | exact — files travel verbatim with alias rewrite |
| `packages/ui/tsdown.config.ts` | config (build) | — | no Helm analog | new scaffolding |
| `packages/ui/package.json` | config (pkg) | — | no Helm analog | new scaffolding |
| `apps/smoke/package.json` + `src/` | config + component | — | no Helm analog | new scaffolding |
| Farsight root `package.json` (`overrides` field) | config (pkg) | — | no Helm analog | new scaffolding |

---

## Pattern Assignments

### `packages/ui/src/styles/theme.css` (config, THEME-01)

**Analog:** `app/globals.css` in Helm — `/Users/scottjensen/Projects/helm/app/globals.css`

**What to lift verbatim and what to exclude:**

`theme.css` receives ONLY the token sections. The `@import "tailwindcss"` line (line 1) and the `@layer base { ... }` block (lines 179–183) MUST NOT be copied — those belong in the consumer's CSS entry point.

**Dark mode variant pattern** (line 3 of `app/globals.css`) — copy as-is:
```css
@custom-variant dark (&:is(.dark *));
```

**Add `@source` directive immediately after** (not in globals.css — this is new for theme.css):
```css
/* Tailwind scans packages/ui source files for utility class usage */
/* Path is relative to src/styles/theme.css → resolves to packages/ui/src */
@source "../../src";
```

**`@theme inline` block** (lines 21–80 of `app/globals.css`) — copy verbatim:
```css
@theme inline {
  --font-sans: Inter, sans-serif;
  --font-serif: Lora, serif;
  --font-mono: JetBrains Mono, monospace;
  --radius: 0.65rem;
  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);
  --tracking-normal: 0em;
  --shadow-2xl: var(--shadow-2xl);
  --shadow-xl: var(--shadow-xl);
  --shadow-lg: var(--shadow-lg);
  --shadow-md: var(--shadow-md);
  --shadow: var(--shadow);
  --shadow-sm: var(--shadow-sm);
  --shadow-xs: var(--shadow-xs);
  --shadow-2xs: var(--shadow-2xs);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
  --spacing: var(--spacing);
}
```

**`:root` token block** (lines 82–129 of `app/globals.css`) — copy verbatim:
```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.723 0.219 149.579);
  --primary-foreground: oklch(0.982 0.018 155.826);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.723 0.219 149.579);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.141 0.005 285.823);
  --sidebar-primary: oklch(0.723 0.219 149.579);
  --sidebar-primary-foreground: oklch(0.982 0.018 155.826);
  --sidebar-accent: oklch(0.967 0.001 286.375);
  --sidebar-accent-foreground: oklch(0.21 0.006 285.885);
  --sidebar-border: oklch(0.92 0.004 286.32);
  --sidebar-ring: oklch(0.723 0.219 149.579);
  --destructive-foreground: oklch(1.0000 0 0);
  --radius: 0.65rem;
  --font-sans: Inter, sans-serif;
  --font-serif: Lora, serif;
  --font-mono: JetBrains Mono, monospace;
  --shadow-2xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
  --shadow: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
  --shadow-md: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 2px 4px -2px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 4px 6px -2px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 8px 10px -2px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.25);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}
```

**`.dark` token block** (lines 131–177 of `app/globals.css`) — copy verbatim:
```css
.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.696 0.17 162.48);
  --primary-foreground: oklch(0.393 0.095 152.535);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.527 0.154 150.069);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.21 0.006 285.885);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.696 0.17 162.48);
  --sidebar-primary-foreground: oklch(0.393 0.095 152.535);
  --sidebar-accent: oklch(0.274 0.006 286.033);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.527 0.154 150.069);
  --destructive-foreground: oklch(1.0000 0 0);
  --radius: 0.65rem;
  --font-sans: Inter, sans-serif;
  --font-serif: Lora, serif;
  --font-mono: JetBrains Mono, monospace;
  --shadow-2xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
  --shadow-xs: 0px 4px 8px -1px hsl(0 0% 0% / 0.05);
  --shadow-sm: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
  --shadow: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 1px 2px -2px hsl(0 0% 0% / 0.10);
  --shadow-md: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 2px 4px -2px hsl(0 0% 0% / 0.10);
  --shadow-lg: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 4px 6px -2px hsl(0 0% 0% / 0.10);
  --shadow-xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.10), 0px 8px 10px -2px hsl(0 0% 0% / 0.10);
  --shadow-2xl: 0px 4px 8px -1px hsl(0 0% 0% / 0.25);
  --spacing: 0.25rem;
}
```

**What NOT to include in theme.css:**
- Line 1: `@import "tailwindcss";` — consumer owns this
- Lines 4–10: the initial `@theme { ... }` block (font-family and static radius values) — these duplicate values already in `:root` and `@theme inline`; the `@theme inline` block is the authoritative one
- Lines 12–18: `* { @apply border-border; }` and `body { @apply ... }` — base layer, belongs in consumer
- Lines 179–183: `@layer base { body { letter-spacing: ... } }` — belongs in consumer

**Assembled theme.css structure (declaration order matters for Tailwind v4):**
```
@custom-variant dark (&:is(.dark *));
@source "../../src";
@theme inline { ... }   ← must come before :root so tokens register before values
:root { ... }
.dark { ... }
```

---

### `packages/ui/src/lib/tokens.ts` (utility, transform, THEME-03)

**Analog:** `lib/utils.ts` in Helm — `/Users/scottjensen/Projects/helm/lib/utils.ts`

**Export style pattern** (all 6 lines of `lib/utils.ts`):
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

The pattern to copy is: named exports, no default export, TypeScript types on all parameters, single-responsibility file. `tokens.ts` follows the same export style but exports `const` objects instead of functions.

**Core pattern for tokens.ts** — derive from `app/globals.css` chart variables (`--chart-1` through `--chart-5` confirmed at lines 101–105 `:root`, lines 150–154 `.dark`):
```typescript
/**
 * Semantic token references for use in inline styles / chart configs.
 * Use these instead of hardcoded hex in chart stroke/fill props.
 *
 * Usage: stroke={tokens.chart[0]}  (NOT stroke="#266DF0")
 * Value resolves through CSS custom properties at browser paint time.
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
    background:  'var(--color-background)',
    foreground:  'var(--color-foreground)',
    primary:     'var(--color-primary)',
    muted:       'var(--color-muted)',
    mutedFg:     'var(--color-muted-foreground)',
    destructive: 'var(--color-destructive)',
    border:      'var(--color-border)',
  },
} as const

export type TokenChart = typeof tokens.chart[number]
export type TokenColor = keyof typeof tokens.color
```

**Why `var(--color-chart-N)` not `var(--chart-N)`:** The `@theme inline` block maps `--color-chart-1` → `var(--chart-1)` (lines 49–53 of `app/globals.css`). Chart components and Recharts `stroke`/`fill` props should reference the `--color-*` names — these are the Tailwind utility names and are always defined when `theme.css` is imported.

---

### `packages/ui/src/components/ui/*.tsx` (component, request-response, PKG-03)

**Analog:** `components/ui/` in Helm — `/Users/scottjensen/Projects/helm/components/ui/`

**The single required transformation: alias rewrite.** Every component uses `@/lib/utils` which resolves to Helm's repo root. In `packages/ui`, this must become a package-relative path.

**Import pattern (server-safe component — no `'use client'`)** — from `components/ui/button.tsx` (lines 1–5):
```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"   // ← REWRITE to: import { cn } from "../lib/utils"
```

**Import pattern (client component — has `'use client'`)** — from `components/ui/chart.tsx` (lines 1–7):
```typescript
"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import type { TooltipValueType } from "recharts"

import { cn } from "@/lib/utils"   // ← REWRITE to: import { cn } from "../lib/utils"
```

**Core component pattern (CVA + Slot — server safe)** — from `components/ui/button.tsx` (lines 7–64):
```typescript
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center ...",
  {
    variants: {
      variant: { default: "...", destructive: "...", ... },
      size: { default: "...", sm: "...", lg: "...", icon: "..." },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

**Core component pattern (pure HTML wrapper — server safe)** — from `components/ui/card.tsx` (lines 1–16):
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex flex-col gap-6 rounded-xl border bg-card ...", className)}
      {...props}
    />
  )
}
// Named exports — no default export
export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
```

**`'use client'` inventory** — confirmed 26 of 34 Helm components have the directive, 8 do not:

Server-safe (no `'use client'`): `badge.tsx`, `breadcrumb.tsx`, `button.tsx`, `card.tsx`, `input.tsx`, `kbd.tsx`, `skeleton.tsx`, `textarea.tsx`

Client components (have `'use client'`): all remaining 26 including `alert-dialog.tsx`, `chart.tsx`, `label.tsx`, `popover.tsx`, `progress.tsx`, `scroll-area.tsx`, `sheet.tsx`, `slider.tsx`, `tabs.tsx`, `tooltip.tsx`, and 16 others.

**The directive must be line 1** — before any imports. tsdown with `rollup-preserve-directives` + `unbundle: true` reads it from this position. The CI assertion (`grep -rl "'use client'" packages/ui/dist/ | wc -l` >= 26) validates preservation post-build.

---

## Shared Patterns

### `@/` Alias Rewrite Rule
**Source:** Every `components/ui/*.tsx` in Helm
**Apply to:** All 34 component files when porting to `packages/ui/src/components/ui/`

Every occurrence of `import ... from "@/lib/utils"` becomes `import ... from "../lib/utils"` (one level up from `components/ui/` to `lib/`). If components import other components from `@/components/ui/...`, those become `import ... from "./<component-name>"` (same directory).

No other aliases are present in the Helm `components/ui/` files — `@/lib/utils` is the only cross-package import.

### Named Exports Pattern
**Source:** `components/ui/button.tsx` (line 64), `components/ui/card.tsx` (lines 84–92)
**Apply to:** All component files

Helm components consistently use named exports (`export { Button, buttonVariants }`), never `export default`. `tokens.ts` and `utils.ts` also use named exports. Maintain this in `packages/ui`.

### `data-slot` Attribute Pattern
**Source:** `components/ui/button.tsx` (line 57), `components/ui/card.tsx` (lines 9, 22, ...)
**Apply to:** All component root elements when porting

Every component root element carries `data-slot="<component-name>"` for CSS targeting and testing. Copy verbatim — do not strip.

### No Default Export Pattern
**Source:** `lib/utils.ts`, all `components/ui/*.tsx`
**Apply to:** `tokens.ts`, all component files

Neither `utils.ts` nor any component file uses `export default`. `tokens.ts` follows the same convention.

---

## No Analog Found (new scaffolding — use RESEARCH.md patterns)

| File | Role | Data Flow | Reason | RESEARCH.md Pattern Reference |
|------|------|-----------|--------|-------------------------------|
| `packages/ui/tsdown.config.ts` | config (build) | — | No library build config exists in Helm (it's a Next.js app, not a library) | RESEARCH.md Pattern 2 (tsdown config, lines 270–297) |
| `packages/ui/package.json` (exports + sideEffects + peers) | config (pkg) | — | Helm's `package.json` is a Next.js app package; the exports map, `sideEffects`, and `peerDependencies` shape are library-specific | RESEARCH.md Pattern 1 (exports map, lines 218–263) |
| `apps/smoke/` (Vite walking-skeleton app) | config + component | — | No Vite app exists in Helm or Farsight yet | RESEARCH.md Code Examples section (lines 538–598) |
| Farsight root `package.json` `overrides.react` | config (pkg) | — | Helm is a standalone repo with no pnpm workspace root | RESEARCH.md Pattern 5 (pnpm.overrides, lines 430–443) |

---

## Critical Facts for Planner

1. **`app/globals.css` has TWO separate `@theme` blocks.** Lines 4–10 are a standalone `@theme { ... }` block (font-family and static radius values). Lines 21–80 are `@theme inline { ... }` (the token-to-utility mappings). Only `@theme inline` goes into `theme.css`. The standalone `@theme` block on lines 4–10 is largely redundant with `:root` and `@theme inline` — drop it from `theme.css`.

2. **26 of 34 components confirmed `'use client'`.** The 8 server-safe ones are `badge`, `breadcrumb`, `button`, `card`, `input`, `kbd`, `skeleton`, `textarea`. The CI grep assertion (`>= 26`) is correct against Helm's actual state.

3. **`radix-ui` (unified package) is correct, not `@radix-ui/react-slot`.** Helm uses `import { Slot } from "radix-ui"` (line 3 of `button.tsx`) — the unified `radix-ui` package. The `packages/ui` dependency should match.

4. **`@/lib/utils` is the only import requiring alias rewrite.** No other `@/` imports appear in `components/ui/` files (components only import from `@/lib/utils` and each other in the same directory). Cross-component imports (e.g., if any component imports from another) become same-directory relative imports.

5. **`app/globals.css` `@layer base` block (lines 179–183) stays in the consumer.** The `body { letter-spacing: var(--tracking-normal); }` rule is an app-layer concern — it must not go into `theme.css`.

---

## Metadata

**Analog search scope:** `/Users/scottjensen/Projects/helm/app/`, `/Users/scottjensen/Projects/helm/lib/`, `/Users/scottjensen/Projects/helm/components/ui/`
**Files read:** `app/globals.css` (183 lines), `lib/utils.ts` (6 lines), `components/ui/button.tsx` (64 lines), `components/ui/card.tsx` (92 lines), `components/ui/chart.tsx` (lines 1–50), `package.json` (dependency list)
**Files scanned for `'use client'`:** all 34 in `components/ui/`
**Pattern extraction date:** 2026-05-29
