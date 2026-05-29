# @farsight/ui — Consumer Setup Guide

A framework-agnostic React component library: Helm's design system + four feature
surfaces (datasets, pipelines, agents, notifications/webhooks), wired to Farsight's
typed `@farsight/contracts` SDK through the `<FarsightProvider>` adapter seam.

This guide covers consuming `@farsight/ui` from a Vite/React `apps/web`, and the
runbook for copying the package into the Farsight monorepo.

---

## Installation

```bash
pnpm add @farsight/ui

# Peer deps (required):
pnpm add react@^19 react-dom@^19 @clerk/react@^6 @tanstack/react-query@^5 @xyflow/react@^12 sonner@^1

# Optional peer (Toaster theming via next-themes):
pnpm add next-themes
```

Peer versions (from `@farsight/ui` `package.json`):

| Peer | Version | Required? |
|------|---------|-----------|
| `react` | `^19.0.0` | yes |
| `react-dom` | `^19.0.0` | yes |
| `@clerk/react` | `^6.0.0` | yes (auth/tenant) |
| `@tanstack/react-query` | `^5.0.0` | yes (data layer) |
| `@xyflow/react` | `^12.0.0` | yes for canvas surfaces (pipelines) |
| `sonner` | `^1.0.0` | yes (Toaster) |
| `recharts` | `^2.0.0` | optional (chart primitives only) |
| `next-themes` | `^0.4.0` | optional (Toaster theming) |
| `@radix-ui/react-slot`, `cmdk`, `react-day-picker`, `@dnd-kit/*` | see `package.json` | optional (specific primitives) |

---

## CSS Setup (Required — order matters)

```css
/* apps/web/src/index.css */
@import "tailwindcss";
@import "@farsight/ui/theme.css";        /* design tokens + base layer */
@import "@xyflow/react/dist/style.css";  /* MUST come AFTER tailwindcss reset */

/* Add @source so Tailwind scans @farsight/ui's class names: */
@source "./node_modules/@farsight/ui/dist";
```

**Why `@source` is required (R-05):** `theme.css` ships `@source "../../src"`, which is
valid only from the package source tree — it breaks once resolved from
`dist/styles/theme.css`. The consuming app MUST add its own `@source` directive
pointing at the consumed package's `dist` (npm) or `src` (workspace) so Tailwind's
JIT scans the library's utility classes. Without it, components render unstyled.

- **npm-published consumer:** `@source "./node_modules/@farsight/ui/dist";`
- **workspace (monorepo) consumer:** `@source "../../packages/ui/src";` (path relative to your CSS file)

---

## Provider Setup

Mount `<ClerkProvider>` ABOVE `<FarsightProvider>`. `FarsightProvider` reads the
Clerk session via `useAuth()` / `useOrganization()` and constructs the typed SDK
client + a `QueryClient` internally.

```tsx
import { ClerkProvider, useAuth } from '@clerk/react'
import { FarsightProvider, Toaster } from '@farsight/ui'

function Providers({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  return (
    <FarsightProvider
      // Remount on org/project switch to discard cross-tenant cache (see Key Notes):
      key={`${orgSlug}:${projectSlug ?? ''}`}
      baseUrl="https://api.farsght.com"
      projectSlug={projectSlug}   // required for dataset/pipeline/agent hooks
      // getToken is read from useAuth() inside FarsightProvider; baseUrl + projectSlug
      // are the consumer-supplied bits. See FarsightProviderProps for onError, queryClient.
    >
      <Toaster />   {/* mount once at app root */}
      {children}
    </FarsightProvider>
  )
}

export function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <Providers>{/* routed app */}</Providers>
    </ClerkProvider>
  )
}
```

`FarsightProvider` derives `userId` / `orgId` / `orgSlug` / `role` from Clerk and the
per-request bearer token from `useAuth().getToken` (the token is never stored in
state). Surface hooks (`useDatasetsQueryOptions`, `useWorkflowQueryOptions`,
`useAgentMessagesQueryOptions`, notification/webhook hooks) read this context via
`useFarsightContext()` and are namespaced by `orgSlug` + `projectSlug`.

---

## Key Notes

- **Tenant isolation:** Provide a unique `key={`${orgSlug}:${projectSlug}`}` on
  `FarsightProvider` to force a full remount (and cache reset) on org/project switch.
  Query keys are also slug-namespaced as defense-in-depth, but the `key=` remount is
  the primary cross-tenant cache-bleed guard.
- **Canvas CSS:** `@xyflow/react/dist/style.css` MUST come after `@import "tailwindcss"`.
  Wrong order makes pipeline-canvas edges invisible (the SVG edge paths get reset away).
  This was verified visually in the PORT-01 Vite consumer (D-09).
- **Tree-shaking:** Importing only a primitive (e.g. `import { Button } from '@farsight/ui'`)
  excludes `@xyflow/react` and `recharts` from the bundle — proven by an executed
  Button-only build that emits no xyflow/recharts chunks (D-05). Canvas surfaces
  (`WorkflowCanvas`) pull in `@xyflow/react` as expected.
- **Canvas a11y:** xyflow v12 does not assign ARIA roles to individual canvas nodes.
  Use keyboard pan (arrow keys) and the "Fit view" control button (`aria-label="Fit view"`).
  Palette items are keyboard-accessible buttons.
- **Project-scope guard:** dataset / pipeline / agent queries are disabled
  (`enabled: !!projectSlug`) until `projectSlug` is supplied — the hooks no-op cleanly
  before a project is selected.

---

## Available Surfaces

| Export | Description |
|--------|-------------|
| `DatasetList`, `DatasetDetail`, `DatasetRecords`, `DatasetSearch` | Dataset browsing + records grid + RAG search (DSET-01) |
| `WorkflowList`, `WorkflowCanvas`, `WorkflowRunView` | Pipeline list + xyflow canvas editor + run view (PIPE-01) |
| `AgentChatView`, `AgentMessage` | Agent chat surface — message list + composer, polling (AGNT-01) |
| `NotificationBell`, `NotificationInbox`, `NotificationItem`, `NotificationPreferences` | Notifications (Phase 3) |
| `WebhookList`, `WebhookCreateModal`, `WebhookRotateSecretModal`, `WebhookHealthBadge`, `WebhookSecretReveal`, `EventTypesInput` | Outbound webhook management (Phase 3) |
| `CanvasFlow`, `CanvasBackground`, `CanvasControls`, `CanvasMiniMap`, `CanvasPanel`, `CanvasInspector`, `CanvasPalette`, `autoLayout` | Reusable canvas-kit (pipelines-only, D-10) |
| `Button`, `Card`, `Dialog`, `DataGrid`, `DataTable`, `PageHeader`, `EmptyState`, … | Design-system primitives + page primitives (see `src/index.ts` barrel) |
| `FarsightProvider`, `useFarsightContext`, `useTenant`, `useApiClient` | Adapter seam (Phase 3) |
| `toFarsightError`, `isFarsightError`, `matchCode` | RFC-7807 `ApiErrorEnvelope` error helpers |

Per-resource hooks: `useDatasetsQueryOptions`, `useWorkflowQueryOptions`,
`useAgentMessagesQueryOptions`, `useNotificationsQueryOptions`, `useWebhooksQueryOptions`
(+ key factories `datasetKeys` / `workflowKeys` / `agentKeys` / `notificationKeys` /
`webhookKeys` and the corresponding mutation hooks).

---

## Package Validation

Run all package quality checks before copying to the Farsight monorepo:

```bash
# In packages/ui:
npm run build           # build dist/
npx publint             # verify exports map correctness (exit 0)
npm run check:attw      # verify type exports for bundler/ESM-only profile (exit 0)
```

### attw Scope

`check:attw` validates `@farsight/ui` for its intentional design:

- **Validated:** `--profile esm-only` — the bundler profile, which is the only profile
  Farsight's Vite/`apps/web` consumer will use. The `.` entry must be green.
- **Excluded entrypoints:** `theme.css` and `styles/globals.css` — these are CSS assets
  with no `.d.ts` counterpart. attw cannot resolve CSS entries; excluding them is correct
  and honest (not masking a real type problem).
- **Out of attw scope (by design):**
  - `node10` / `node16-CJS` profiles — the library is deliberately ESM-only
    (`type: "module"`, `moduleResolution: "bundler"`, `platform: "browser"`). CJS output
    is not a project requirement.
  - `./theme.css` / `./styles/globals.css` subpath entries — CSS exports have no associated
    type declarations; they are excluded via `--exclude-entrypoints`.

The check uses `pnpm pack` (not `npm pack`) so that `publishConfig.exports` is applied —
the tarball attw reads contains the real `dist/index.d.ts`, not the dev `src/index.ts`.
Passing `--ignore-rules internal-resolution-error` is explicitly NOT used; any real
dist-level type resolution error will surface as a failure.

---

## Farsight Monorepo Copy Runbook

`@farsight/ui` is developed in the Helm repo and copied into the Farsight monorepo
("prep here, then port"). To copy the package:

```bash
# 1. Build and verify the package is publish/port-clean
pnpm --filter @farsight/ui build
npx publint packages/ui
npm run check:attw --prefix packages/ui

# 2. Copy to the Farsight monorepo
cp -r packages/ui ~/Projects/farsight-platform/packages/ui

# 3. Wire the Farsight workspace
#    Edit ~/Projects/farsight-platform/pnpm-workspace.yaml — add:
#      - 'packages/ui'

# 4. Install + wire apps/web
cd ~/Projects/farsight-platform
pnpm install
#    In apps/web/package.json add:  "@farsight/ui": "workspace:*"
#    Add the peer deps (react@19, react-dom@19, @clerk/react@6,
#      @tanstack/react-query@5, @xyflow/react@12, sonner@1) to apps/web
#    Add the CSS imports to apps/web/src/index.css (see "CSS Setup" above —
#      use the workspace @source form: @source "../../packages/ui/src")
#    Wrap apps/web's App root: <ClerkProvider> → <FarsightProvider> (see "Provider Setup")

# 5. Verify a single React version (duplicate React breaks hooks/context)
pnpm list react -r    # must show exactly 1 React version
```

**Notes:**
- No physical copy is performed during Helm's Phase 4 — this runbook documents the
  manual step (D-06). The package is proven port-ready by `publint` + `@arethetypeswrong/cli`
  exiting 0 on the built dist (D-07), and by the PORT-01 Vite consumer rendering correctly.
- The live-endpoint round-trip (real Clerk session against `api.farsght.com`) is manual
  UAT, deferred per D-03 and tracked in `.planning/phases/04-contract-gated-surfaces-monorepo-port/04-VALIDATION.md`.
