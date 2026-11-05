# Coding Conventions

**Analysis Date:** 2026-05-29

## Naming Patterns

**Files:**
- Pages: `page.tsx` (thin shell — `export const dynamic = "force-dynamic"` + render client component)
- Client components: `[feature]-client.tsx` (e.g., `campaigns-client.tsx`, `prospects-client.tsx`)
- API routes: Next.js App Router convention — `app/api/[feature]/route.ts`
- Library modules: `kebab-case.ts` (e.g., `email-sender.ts`, `pipeline-engine.ts`, `workflow-graph-validator.ts`)
- Components: `kebab-case.tsx` inside `components/[group]/` directories (e.g., `components/page/page-header.tsx`)
- Test files: Mirror source path under `__tests__/` with `.test.ts` or `.test.tsx` suffix

**Functions:**
- Named exports, `camelCase` (e.g., `sendEmail`, `runAgent`, `fireWebhook`)
- React components: `PascalCase` named exports (e.g., `export function CampaignsClient()`, `export function PageHeader()`)
- API route handlers: uppercase HTTP verb as function name — `export async function GET()`, `export async function POST(request: NextRequest)`
- Handler helpers: `handle` prefix for event handlers in components (e.g., `handleNewCampaign`, `handleToggleStatus`)

**Variables:**
- `camelCase` throughout
- Boolean state: descriptive noun (e.g., `creating`, `togglingId`) not `isCreating`/`isToggling`
- Drizzle result destructuring: `const [row] = await db.select()...` pattern for single-row returns

**Types/Interfaces:**
- `PascalCase` for both `type` and `interface` declarations
- Props type pattern: `type [ComponentName]Props = { ... }` defined just above component
- Inferred Drizzle types via `z.infer<typeof schema>` for Zod-validated configs
- Workflow/engine types extracted to dedicated `*-types.ts` files (e.g., `lib/pipeline-engine-types.ts`)

## Code Style

**Formatting:**
- No Prettier config detected — project relies on ESLint formatting rules from `eslint-config-next`
- Single quotes for strings in most files; double quotes in JSX `className` attributes
- Semicolons: present throughout TypeScript files

**Linting:**
- `eslint.config.mjs` uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- Run: `npm run lint` (invokes `eslint`)
- TypeScript strict mode enabled in `tsconfig.json` (`"strict": true`)
- Authoritative TS check: `npx tsc --noEmit -p .` (lint runner uses a different tsconfig)

## Import Organization

**Order (observed pattern):**
1. Framework/runtime imports (`next/server`, `next/navigation`, `react`)
2. Third-party libraries (`@clerk/nextjs/server`, `drizzle-orm`, `resend`)
3. Internal `@/` alias imports — db, lib, components, schema
4. Relative imports (rare; used in test helpers)

**Path Aliases:**
- `@/*` resolves to repo root (configured in both `tsconfig.json` and `vitest.config.ts`)
- Use `@/db`, `@/lib/...`, `@/components/...`, `@/app/...` — never relative paths from `src/`

**Client Component Boundary:**
- `'use client'` directive on the first line of every `*-client.tsx` file
- Server pages import client components directly; no intermediate wrappers

## Error Handling

**API Route Pattern (universal):**
```typescript
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // ... DB queries ...
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Feature] operation error:', err);
    return NextResponse.json({ error: 'Failed to [describe]' }, { status: 500 });
  }
}
```

**Error response shape:** Always `{ error: string }` with appropriate HTTP status (401, 404, 500).

**404 pattern:** After ownership check, `if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })`

**Client-side error handling:**
- `apiFetch` in `lib/api.ts` throws `Error` with message from `body.error || body.message || "HTTP {status}"`
- Catch blocks in handlers: `const msg = err instanceof Error ? err.message : 'Unknown error'`
- User feedback via `alert(...)` for destructive/critical errors (not a toast library)

**Workflow error handling:**
- `FatalError` (from `"workflow"`) = skip retries, fail the run permanently
- Plain `Error` thrown = transient failure, Vercel Workflow SDK will backoff-retry
- Non-fatal failures (e.g., knowledge retrieval) are caught and logged, not thrown

**Custom error classes:**
- Defined in lib files where domain-specific errors aid callers: `EmailConfigError`, `EmailSendError`, `AgentNotFoundError`, `AgentConfigError`

## Logging

**Framework:** `console.error` / `console.log` (no structured logging library)

**Patterns:**
- Server-side errors: `console.error('[feature-name] description:', err)`
- Stub/placeholder implementations: `console.log('[LINKEDIN STUB] ...')` prefixed with module name in brackets
- Knowledge retrieval: non-fatal failures logged with `console.error('[agent-runtime] ...')`
- Do NOT log in production client code; `console.error` in API routes is acceptable

## Comments

**When to Comment:**
- File-level JSDoc block for every non-trivial lib module: explains purpose, strategy, env vars, and cross-references
- Section separators in long files use `// ──────...` (em-dash bar) with label above and below
- Inline comments for non-obvious logic, especially type assertions and DB query patterns
- Test files: leading JSDoc comment referencing the GAP ticket numbers covered

**JSDoc/TSDoc:**
- Interface/type fields get `/** ... */` block comments for non-obvious props (see `SendEmailArgs` in `lib/email-sender.ts`)
- Functions in lib modules that are public API get JSDoc

## Function Design

**Size:** Large files exist (`hooks/use-data-grid.ts` at 3273 lines); lib functions generally focused and single-purpose
**Parameters:** Prefer named object args for functions with 3+ params (interfaces defined above function)
**Return Values:** Async functions return typed results; errors throw rather than return null

## Module Design

**Exports:**
- Named exports throughout — no default exports in lib/components (except Next.js page convention)
- Default export only for Next.js pages: `export default function CampaignsPage()`
- Re-exported through barrel `index.ts` for component groups (e.g., `components/page/index.ts`)

**Barrel Files:**
- Used for component groups: `components/page/index.ts` re-exports `PageHeader`, `EmptyState`, `ConfirmDialog`
- NOT used for `lib/` — import each module directly (`@/lib/email-sender`, not `@/lib`)

## Page Layout Pattern

**Server page shell:**
```typescript
export const dynamic = "force-dynamic";
import { FeatureClient } from "./feature-client";

export default function FeaturePage() {
  return <FeatureClient />;
}
```

**Client component header:** Use `PageHeader` from `@/components/page` via its `actions` prop. Do NOT wrap `PageHeader` in an outer flex row.

**Styling:** Tailwind CSS utility classes inline. Use `cn()` from `@/lib/utils` to merge conditional classes. Design tokens: `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`.

## Auth Pattern (API routes)

```typescript
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// Then scope ALL queries: .where(eq(table.userId, userId))
```

The `userId` is a Clerk subject string (not a UUID). Every domain table has a `userId` column. Every SELECT/UPDATE/DELETE must filter by it — no cross-tenant reads ever.

## DataGrid Conventions

- `DataGridContextMenu` derives handlers from `tableMeta` — do not pass menu handlers separately
- `DataGrid` receives only `tableMeta`, `columns`, and `contextMenu` props
- Cell variants in `components/data-grid/data-grid-cell-variants.tsx` use effect-based syncing (not synchronous ref reads) — React Compiler compatibility

---

*Convention analysis: 2026-05-29*
