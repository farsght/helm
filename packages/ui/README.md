# @farsight/ui

Portable React component library extracted from Helm's frontend — backend-agnostic, themed, and tree-shakeable. Provides Helm's design system plus feature surfaces (pipelines, agents, datasets/knowledge, notifications + webhooks) decoupled from Next.js / Clerk-server / Drizzle, wired to Farsight's typed `@farsight/contracts` SDK.

---

## Installation

Install the package and its required peers:

```bash
npm install @farsight/ui react react-dom
```

This library has five peer dependencies. Two are required; three are optional (only needed for specific feature surfaces):

| Peer | Version | Required? | Needed for |
|------|---------|-----------|------------|
| `react` | `^19.0.0` | Required | All components |
| `react-dom` | `^19.0.0` | Required | All components |
| `@clerk/react` | `^6.0.0` | Optional | Components using Clerk auth context |
| `@xyflow/react` | `^12.0.0` | Optional | Canvas surfaces (pipelines, agents) |
| `@tanstack/react-query` | `^5.0.0` | Optional | Data-fetching hooks and query-aware components |

Install optional peers only if your app uses the corresponding feature surface:

```bash
# If using Clerk auth components:
npm install @clerk/react

# If using canvas/pipeline/agent surfaces:
npm install @xyflow/react

# If using data-fetching hooks:
npm install @tanstack/react-query
```

---

## Theming Setup

### CSS Import Order

Your app's CSS entry file (e.g., `apps/web/src/index.css`) must import in this order:

```css
@import "tailwindcss";
@import "@farsight/ui/theme.css";
```

**Why this order matters:**

- `@import "tailwindcss"` must appear in your **consumer's** CSS entry — do NOT add it to `theme.css`. Including it in both places causes Tailwind to process twice, producing duplicate CSS output and specificity conflicts.
- `@import "@farsight/ui/theme.css"` loads the design token contract (color values, typography scale, shadows, radius). All component utility classes (`bg-background`, `text-foreground`, etc.) depend on the tokens in this file.

### @source Directive

`theme.css` already includes an `@source` directive pointing at the package's `src/` directory:

```css
@source "../../src";
```

This tells Tailwind to scan `@farsight/ui`'s component source files for utility class usage. **Consumers do not need to add a separate `@source` for the package** — it is included in `theme.css` and activates automatically when you import it.

---

## Dark Mode

Dark mode is controlled by adding the `.dark` class to a parent element (typically `document.documentElement`).

**Contract:**
- **This library owns the token contract** — what `--background`, `--foreground`, and other design tokens resolve to in light vs. dark mode. These values are defined in `theme.css` under `:root` (light) and `.dark` (dark).
- **Your application shell owns the `.dark` class toggle** — adding/removing it on `<html>`, and persisting the user's preference (e.g., in `localStorage` or responding to `prefers-color-scheme`).

```ts
// Example: toggle dark mode in the app shell
document.documentElement.classList.toggle('dark')
```

Do not import `next-themes` from this package — dark mode persistence is an app-shell concern and belongs in `apps/web`.

---

## xyflow/react CSS Import Order (Canvas Surfaces)

When using canvas surfaces (pipelines, agents) that depend on `@xyflow/react`, the CSS import order is critical:

```css
@import "tailwindcss";
@import "@farsight/ui/theme.css";
@import "@xyflow/react/dist/style.css";
```

`@xyflow/react/dist/style.css` **must come after** `@import "tailwindcss"`. If xyflow CSS is imported before Tailwind, edge connector styles will be invisible — this is a known xyflow pitfall caused by Tailwind's reset overriding xyflow's base styles.

---

## JS Token Export (Charts)

For Recharts `stroke`/`fill` props and other inline styles that need color values, import `tokens` instead of hardcoding hex values:

```ts
import { tokens } from '@farsight/ui/lib/tokens'

// Good — respects dark mode, uses the design token contract:
<Line stroke={tokens.chart[0]} />

// Avoid — breaks dark mode, ignores design tokens:
<Line stroke="#266DF0" />
```

### tokens.chart

A 5-element array of CSS custom property references, one per chart series:

```ts
tokens.chart[0]  // 'var(--color-chart-1)'
tokens.chart[1]  // 'var(--color-chart-2)'
tokens.chart[2]  // 'var(--color-chart-3)'
tokens.chart[3]  // 'var(--color-chart-4)'
tokens.chart[4]  // 'var(--color-chart-5)'
```

### tokens.color

Semantic color references for background, text, and surface colors:

```ts
tokens.color.background   // 'var(--color-background)'
tokens.color.foreground   // 'var(--color-foreground)'
tokens.color.primary      // 'var(--color-primary)'
tokens.color.muted        // 'var(--color-muted)'
tokens.color.mutedFg      // 'var(--color-muted-foreground)'
tokens.color.destructive  // 'var(--color-destructive)'
tokens.color.border       // 'var(--color-border)'
```

All values are static `var()` strings — they are SSR-safe (no `getComputedStyle`, no DOM access required at import time). The actual color values resolve through CSS custom properties at browser paint time, so light/dark mode is handled automatically.

### TypeScript Types

```ts
import { tokens, type TokenChart, type TokenColor } from '@farsight/ui/lib/tokens'

// TokenChart — union type of all chart token strings
type TokenChart = typeof tokens.chart[number]
// => 'var(--color-chart-1)' | 'var(--color-chart-2)' | ...

// TokenColor — union type of all semantic color keys
type TokenColor = keyof typeof tokens.color
// => 'background' | 'foreground' | 'primary' | 'muted' | 'mutedFg' | 'destructive' | 'border'
```
