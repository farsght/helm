# Pitfalls Research

**Domain:** Extracting a Next.js-coupled React UI into a portable, framework-agnostic component library (pnpm monorepo `packages/ui`) wired to a typed SDK with a new org/project tenancy model — Helm → Farsight
**Researched:** 2026-05-29
**Confidence:** HIGH (every pitfall verified against official docs or named GitHub issues/plugins; tenancy + cache findings cross-referenced across multiple sources)

> These are failure modes specific to THIS migration, not generic library advice. The five hardest-to-reverse classes are: (1) tenancy-remodel data-scope correctness, (2) `'use client'` directive + bundling loss, (3) Tailwind v4 token distribution, (4) React 19 / peer-dep duplication, (5) coding against contracts whose endpoints aren't live. Each pitfall maps to a roadmap phase below.

## Critical Pitfalls

### Pitfall 1: Per-org cache keys missing — stale org data leaks across org switch

**What goes wrong:**
Helm scopes everything by `userId` server-side, so the frontend never had to think about cache identity — a user only ever saw their own data, and a logout/login cleared everything. In Farsight, one logged-in user belongs to multiple orgs and switches between them live via Clerk `setActive({ organization })`. If a data hook caches under a key like `['pipelines']` (or any key that omits `orgId`/`projectId`), then after an org switch the cache returns Org A's pipelines/agents/datasets to Org B's view. This is a cross-tenant data-disclosure bug that renders correctly, passes types, and looks fine in a single-org demo.

**Why it happens:**
The donor codebase has zero org-switch concept, so there's no existing pattern to copy. Clerk's `useOrganization()` updates its *own* resources automatically, which lulls developers into assuming app-data caches also refresh — they don't. Your React Query/SWR cache for `@farsight/contracts` data is entirely your responsibility.

**How to avoid:**
- Make `{ orgId, projectId }` a mandatory leading segment of every query key in the SDK-adapter hooks: `['pipelines', orgId, projectId]`. This prevents collisions structurally rather than relying on remembering to invalidate.
- Belt-and-suspenders: tie a `queryClient.removeQueries()` (React Query) or `mutate(() => true, undefined, { revalidate: false })` (SWR) effect to `organization?.id` changes.
- Even simpler and very robust: key the QueryClientProvider / `<SWRConfig provider={() => new Map()}>` boundary on `orgId` via React's `key` prop so an org switch remounts with a fresh empty cache.
- Never let the frontend be the authority on tenant scope — the SDK should derive org/project from the Clerk session/active org, and Farsight's `requireOrgMember()` is the real enforcement. The frontend cache discipline is about *correct display*, not security.

**Warning signs:**
- Any query key in `hooks/` that doesn't include org/project.
- Manual org-id state stored in `localStorage`/component state instead of read from Clerk's active org.
- Testing only ever happens in a single org.

**Phase to address:** SDK-adapter / data-layer foundation phase (before any feature surface is ported). Establish the org-scoped query-key convention as the first thing built, so all four surfaces inherit it.

---

### Pitfall 2: `'use client'` directives silently stripped during library build → consumer RSC build breaks

**What goes wrong:**
Helm components carry `'use client'` as a Next.js App-Router boundary marker. When you bundle the library, Rollup/esbuild/tsup **strip module-level directives by default** (Rollup even warns `Module level directives cause errors when bundled, 'use client' was ignored`). The published artifact then has no `'use client'` markers. If Farsight's `apps/web` is a Vite/React SPA this may not bite immediately — but the moment any consumer (or a future Next.js shell) imports these from a Server Component, the boundary is gone and hooks/`useState`/`useEffect`/context blow up at build or runtime. Re-adding the directive after the fact means rebuilding the whole package output.

**Why it happens:**
Default bundler behavior removes directives because they're per-file and bundling merges files. Developers assume "it built, the directive must be there" — it isn't, unless you explicitly preserve it.

**How to avoid:**
- Decide the boundary model up front. Since this library is overwhelmingly interactive (DataGrid, xyflow canvases, inspectors), treat it as a client library:
  - Use a **per-module (unbundled) output** with `preserveModules: true` + `rollup-preserve-directives` (the maintained successor, also works with tsup/SWC and silences the warning), **or** `rollup-plugin-preserve-use-client` if `preserveModules` conflicts with CSS handling.
  - If literally everything is client-side, the blunt `output.banner: "'use client'"` is acceptable — but it marks *every* file client, so only use it if there are genuinely no server-safe exports.
- If you minify, ensure the minifier doesn't re-strip directives (terser: `compress.directives = false`).
- Add a build-output assertion: grep the published `dist/` for `'use client'` in a CI step and fail if missing where expected.

**Warning signs:**
- No directive-preservation plugin in the build config.
- `dist/` files have no `'use client'` at the top despite source files having it.
- Rollup `MODULE_LEVEL_DIRECTIVE` warnings being ignored.

**Phase to address:** Library build-tooling phase (package entry/exports/build pipeline). This must be solved before any component is "shipped" as consumable output, because it shapes the output format (bundled vs. per-module) — a hard-to-reverse decision.

---

### Pitfall 3: Tailwind v4 tokens distributed but classes never generated → components render unstyled in the consumer

**What goes wrong:**
The package owns theming (Tailwind preset + CSS-var tokens) because `apps/web` is greenfield. The classic v4 failure: you `@import` the shared `theme.css` into the consumer, the tokens are present, but the components render **completely unstyled**. Reason: Tailwind v4 generates CSS only for class names it finds by **scanning source files**, and by default it does not scan files inside other workspace packages / `node_modules`. The consumer's build never sees the `bg-card`/`text-foreground`/`border-border` strings living inside `packages/ui`, so it generates none of that CSS.

**Why it happens:**
Helm has one Tailwind build that scans its own `app/` and `components/`. Once components live in a separate package, the consumer's Tailwind has no idea those files exist. Developers waste hours "fixing tokens" when the tokens are fine — it's a scanning (content-path) problem.

**How to avoid:**
- In the package's exported stylesheet, do **not** `@import "tailwindcss"` (that belongs to the consumer). Export `theme.css` (`@theme { … }` tokens) via the package's `exports` map.
- The consumer's entry CSS does `@import "tailwindcss"; @import "@farsight/ui/theme.css";` **plus** an `@source` directive pointing at the library's source/dist so utility classes get discovered: `@source "../../node_modules/@farsight/ui/dist/**/*.{js,jsx,ts,tsx}";` (or the workspace src path). This single line is the actual fix.
- Document this two-line consumer setup as a hard requirement in the package README — `apps/web` cannot "just install and import."
- A serif/unstyled font is the tell-tale that the consumer never loaded/scanned the package CSS.

**Warning signs:**
- Components render with correct layout structure but no colors/spacing/borders.
- The shared CSS works inside Helm/Storybook but breaks in the consumer.
- No `@source` directive referencing the package in the consumer's CSS.

**Phase to address:** Design-system portability phase (Tailwind preset + token export). Validate by consuming the package from a *separate* minimal Vite app, not just by checking it renders inside Helm.

---

### Pitfall 4: Tailwind v4 import order clobbers `@xyflow/react` edge/canvas styles

**What goes wrong:**
React Flow (`@xyflow/react`) requires `import '@xyflow/react/dist/style.css'`. With Tailwind v4, **React Flow's CSS must be imported *after* `@import "tailwindcss"`** in the global stylesheet — not in `App.tsx` or a component file. Get the order wrong and Tailwind's reset/utilities override React Flow selectors; a known symptom is styling libraries setting `overflow: hidden` on `.react-flow__edges`, which makes edges (the connections between pipeline/agent nodes) invisible. This is invisible in code review and only shows up when you actually look at a canvas.

**Why it happens:**
Inside Helm, Next.js/global CSS ordering already happened to work; the dependency on ordering was never made explicit. Moving to a new consumer with greenfield CSS re-exposes the ordering requirement, and the canvas surfaces are the last thing tested.

**How to avoid:**
- Mandate React Flow's stylesheet import in the consumer's global CSS, after `tailwindcss` and after the design-system tokens. Document it alongside the `@source` requirement.
- When porting the canvases, add a visual smoke test that asserts edges render (not just nodes).

**Warning signs:**
- Pipeline/agent canvas shows nodes but no connecting edges.
- React Flow CSS imported in a TSX component rather than the global entry CSS.

**Phase to address:** Pipelines surface port (first canvas) — lock the import-order contract there; agents surface inherits it.

---

### Pitfall 5: Duplicate React 19 copies → "Invalid hook call" the moment the package is consumed

**What goes wrong:**
If the library lists `react`/`react-dom` (and `@xyflow/react`, Clerk's React client, etc.) as regular `dependencies` instead of `peerDependencies`, the consumer ends up with two React copies (the app's and the library's nested one). pnpm's strict symlink isolation makes this especially likely. The result is the classic `Invalid hook call` crash — every hook in the library throws, the whole UI is dead on arrival in `apps/web`.

**Why it happens:**
Helm is an app, not a library, so React lives in plain `dependencies` and nobody thinks about duplication. Copy that `package.json` shape into a library and you ship the bug. Version skew compounds it: React 19 vs an RC, or two minor versions, resolve to two physical copies.

**How to avoid:**
- Declare `react`, `react-dom`, `@xyflow/react`, `@clerk/clerk-react`, and any other stateful UI dep as **`peerDependencies`** (with a permissive range like `^19`) and as `devDependencies` for local dev/build. They must NOT be in `dependencies`.
- In the Farsight root `package.json`, add `pnpm.overrides` pinning a single `react`/`react-dom` version across the workspace.
- Verify with `pnpm list react -r` (expect exactly one version) and, in-browser, the `window.React1 === window.React2` trick.
- Keep `@xyflow/react` a peer too, so the canvas's React context is shared with the consumer (a second xyflow copy = its own context = broken `useReactFlow`).

**Warning signs:**
- `react` under `dependencies` in the package's `package.json`.
- `pnpm list react -r` shows more than one version.
- `Invalid hook call` / "more than one copy of React" the first time `apps/web` renders a library component.

**Phase to address:** Library build-tooling phase (peer-dependency declaration). This is cheap to do right early and expensive to discover late (every consumer install breaks).

---

### Pitfall 6: Coding against `@farsight/contracts` whose endpoints aren't live → types compile, runtime 404s

**What goes wrong:**
Three of four surfaces (pipelines, datasets, agents) depend on Farsight Phase 1 contracts that **may not be deployed yet**. Generated/contract types give compile-time safety with **zero runtime guarantee** — the SDK calls a route the server doesn't serve, and you get a 404 (or a payload that doesn't match the contract because the live impl drifted from the spec). TypeScript can never catch this. Worse: you build elaborate UI flows against an imagined response shape, the real endpoint ships slightly different, and you discover the mismatch only at integration time — after the UI logic is built on the wrong shape.

**Why it happens:**
Contracts ahead of implementation feel "done" because the types resolve. Mock drift: a mock or assumed shape is correct when written but rots as the backend evolves. The conformance test (FAR-71) guarantees SDK↔contracts↔api alignment *for live endpoints* — it says nothing about endpoints that don't exist yet.

**How to avoid:**
- Per surface, record which endpoints are **live today** (notifications/webhooks) vs. **contract-only** (pipelines/datasets/agents Phase 1). Sequence the roadmap so live-backed surfaces (notifications + webhooks) are built first as the proving ground for the SDK-adapter pattern.
- For not-yet-live surfaces, stand up a **spec-generated mock** (MSW typed from the same contracts, or Prism) so the SDK has a real thing to call — never hand-roll a divergent mock.
- Be a **Tolerant Reader**: bind only to the fields the UI actually needs; don't assume the full payload shape.
- Add runtime validation (Zod mirroring contract types, or honor the RFC-7807 `ApiErrorEnvelope` consistently) so a shape mismatch surfaces loudly instead of as `undefined`.
- Gate each contract-only surface behind a "backend live?" check before marking it done; re-run against the real endpoint when it lands.

**Warning signs:**
- A surface "works" but only against hand-written fixtures.
- No mock server; hooks point at endpoints nobody has called with a real network request.
- Error handling assumes 200-or-throw and ignores the `ApiErrorEnvelope`.

**Phase to address:** SDK-adapter foundation (define live-vs-contract-only inventory + mock strategy) and each feature-surface phase (gate completion on real-endpoint verification).

---

### Pitfall 7: Tenancy remodel reshapes data identity, not just a filter — IDs, routes, and "current selection" all change

**What goes wrong:**
Treating per-user → org/project as "swap `userId` for `orgId` in the query" misses that **project** is a second scope axis with no Helm equivalent. Components that assumed a single flat namespace (one user's pipelines) now need a `{ orgId, orgSlug, role, userId }` context AND a current-project selection. Resources can move/duplicate across projects; URLs likely become org/project-scoped; `role` gates actions (a viewer can't delete a pipeline). Bolt org/project on late and it threads through every list query, every detail route, every mutation, and every cache key — a pervasive, hard-to-reverse refactor.

**Why it happens:**
The donor model has exactly one scope axis, so the second axis (project) and the role dimension are easy to under-model at the start. It's tempting to get something rendering with just `orgId` and add project "later."

**How to avoid:**
- Build a single tenant-context provider (`{ orgId, orgSlug, role, userId, projectId }`) sourced from Clerk's active org + a project selector, and make every SDK-adapter hook consume it. Do this before porting surfaces.
- Decide the project-selection UX and the URL shape (org/project in the path?) up front — retrofitting routing is expensive.
- Encode `role` into the component API early (disable/hide destructive actions for insufficient roles) rather than assuming everyone is an owner.
- Never thread raw `orgId`/`projectId` as ad-hoc props through component trees — read from context. (Manual threading is where a stale or wrong value silently sneaks in.)

**Warning signs:**
- Hooks take `orgId` but have no concept of `projectId`.
- No `role`-aware gating anywhere in ported components.
- Project selection stored in component state instead of a single context source.

**Phase to address:** Tenant-context foundation phase (immediately after SDK adapter, before the first surface port).

---

### Pitfall 8: Porting Next.js coupling by stubbing instead of replacing → `next/navigation`, `next/headers`, `next/image`, server actions leak in

**What goes wrong:**
Helm components import `next/navigation` (`useRouter`, `usePathname`, `redirect`), `next/headers` (server-only — reads cookies/headers), `next/image`, and call server actions / RSC data fetching in `page.tsx`/`*-client.tsx` pairs. A framework-agnostic library cannot depend on any of these. The trap is "temporarily" shimming them (a fake `useRouter`, a no-op `next/image`) to make the build pass — which ships hidden Next coupling and brittle behavior into Farsight, and `next/headers` in particular is server-only and will hard-crash in a Vite SPA.

**Why it happens:**
The RSC `page.tsx` + client split is so baked into Helm that extracting it cleanly is more work than stubbing, and stubs make the TypeScript build go green, creating false confidence.

**How to avoid:**
- Replace navigation with **injected props / a routing-adapter interface** (consumer passes its router's navigate/link primitives), not a Next shim. The library should be router-agnostic.
- Drop `next/image` for a plain `<img>` or a consumer-provided image component.
- Move all data fetching out of RSC/server actions into the SDK-adapter hooks (client-side); there is no server in this library.
- Collapse the `page.tsx`/`*-client.tsx` split into single client components — the server half has no home here.
- Grep the package for `next/` and `@clerk/nextjs/server` imports and fail CI if any remain (the goal is zero Next.js runtime deps per the constraints).

**Warning signs:**
- Any `from 'next/...'` or `@clerk/nextjs/server` import in the package.
- "Shim" files re-implementing Next APIs.
- Components that still expect to be rendered inside an App-Router tree.

**Phase to address:** Decoupling phase (remove Next.js App-Router coupling) — and enforce with a CI import-guard that persists across all later phases.

---

### Pitfall 9: The 3,273-line `use-data-grid.ts` ported wholesale — carries Helm coupling and is untestable in isolation

**What goes wrong:**
`hooks/use-data-grid.ts` is a known re-render hot spot and is almost certainly entangled with Helm's `apiFetch`/`lib/api.ts`, per-user assumptions, and possibly toast/router calls. Porting it as one opaque blob means any Helm coupling rides along invisibly, and you can't unit-test or incrementally verify the decoupling. It's also the single largest source of "it compiles but misbehaves in the consumer."

**Why it happens:**
It's huge and load-bearing, so the path of least resistance is copy-paste-and-pray. Splitting it feels risky mid-migration.

**How to avoid:**
- Treat it as a dedicated sub-effort: first identify and excise every Helm-specific dependency (data fetching → injected SDK adapter; tenancy → context; feedback → injected/standard toast) behind explicit inputs, *then* port.
- Add characterization tests around its current behavior in Helm before moving it, so regressions during decoupling are visible.
- Keep its data source injectable (don't bake in `@farsight/contracts` calls) so it stays framework- and backend-agnostic and testable with fixtures.

**Warning signs:**
- The hook imports `@/lib/api`, `next/*`, or references `userId` internally.
- No tests covering it before or after the port.
- Consumers see correct columns but broken sort/filter/pagination/selection.

**Phase to address:** Design-system portability phase (DataGrid/DataTable + hooks). Decouple-then-port, with characterization tests as the gate.

---

### Pitfall 10: The `@/*` alias travels into the package and silently resolves to the wrong root (or nothing)

**What goes wrong:**
Helm's `@/*` resolves to its repo root and is used pervasively. If ported files keep `@/components/...`, `@/lib/...`, `@/hooks/...` imports, then inside `packages/ui` either the alias is unconfigured (build fails) or, worse, it resolves to a *different* root in the monorepo and pulls in unintended modules. This can also drag excluded surfaces (CRM, campaigns) into the bundle by transitive import.

**Why it happens:**
The alias is invisible muscle memory in Helm; it only breaks once files leave the original tsconfig/Vitest path mapping.

**How to avoid:**
- Convert intra-package imports to **relative** paths (or a package-local alias that resolves only within `packages/ui`), and reserve bare-specifier imports for true externals.
- Run a dependency-graph check (e.g., `madge`/`knip`) on the package to confirm no transitive import reaches an out-of-scope surface (CRM/campaigns/knowledge-backend).
- Fail CI on unresolved imports under the package's own tsconfig.

**Warning signs:**
- `@/` imports remaining in ported files.
- Bundle analysis shows CRM/campaign code present.
- Build resolves but pulls in surprising modules.

**Phase to address:** Decoupling phase + library build-tooling phase (verify with graph analysis before declaring portability done).

---

### Pitfall 11: Porting Helm's UX debt forward as if it were the design system

**What goes wrong:**
The UI audit scored these surfaces 15/24. If the port is mechanical, it carries forward: 48 `alert()` calls, 9 `confirm()` destructive actions, hardcoded chart hex (`#266DF0`, `#1B1B1F` tooltip that's unreadable in light mode), missing loading/error states, and `PageHeader` convention breaks. Since this package becomes Farsight's **authoritative design system**, these defects get blessed as canon and propagate to every future `apps/web` feature.

**Why it happens:**
"Port working components" is read as "copy them verbatim." The defects don't fail a build, so they survive.

**How to avoid:**
- Establish per-surface acceptance criteria that bar `alert()`/`confirm()` (use Sonner toast + `ConfirmDialog`), require loading + error states, and forbid hardcoded hex in favor of CSS-var chart tokens (`--chart-1..5`) read at render.
- Because the package owns light/dark theming, the hardcoded dark-only chart tooltip is now a real bug for greenfield consumers — fix it as part of the design-system phase, not "later."
- Normalize `PageHeader` usage (no outer flex wrapper; controls via `actions`) during the port.

**Warning signs:**
- `alert(`/`confirm(` present in ported files.
- Inline hex in chart props.
- List surfaces with no loading skeleton.

**Phase to address:** Design-system portability phase (primitives, page primitives) and each feature-surface phase (acceptance criteria).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Shim `next/navigation`/`next/headers` to make the build pass | Fast green build | Hidden Next coupling; `next/headers` crashes in SPA; library isn't actually portable | Never — replace with injected router adapter |
| React/`@xyflow/react`/Clerk in `dependencies` not `peerDependencies` | One less thing to configure | Duplicate React → `Invalid hook call`, dead UI in consumer | Never for a library |
| `output.banner: "'use client'"` to preserve the directive | One-line directive preservation | Marks *every* file client; no server-safe exports possible | Only if the whole library is genuinely client-only and you've confirmed no RSC-safe exports |
| Build against hand-written fixtures for contract-only surfaces | Unblocks UI work before backend ships | Mock drift; UI built on wrong response shape; integration-time rework | Acceptable only with a spec-generated mock + completion gated on real endpoint |
| Add `orgId` now, `projectId` "later" | Quick first render | Project axis threads through every query/route/cache later; pervasive refactor | Never — model both scope axes from the start |
| Port `use-data-grid.ts` verbatim | Avoids touching a scary 3.2k-line file | Carries Helm coupling; untestable; re-render hot spot persists | Never without first excising Helm deps behind injectable inputs |
| Keep `@/*` aliases in ported files | No import rewriting | Wrong-root resolution; pulls in out-of-scope surfaces | Never — convert to relative/package-local |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@farsight/contracts` SDK | Calling contract-only endpoints that aren't deployed; assuming types == runtime reality | Inventory live vs. contract-only; mock not-yet-live endpoints from the spec; gate completion on real-endpoint verification; honor `ApiErrorEnvelope` |
| Clerk React client | Storing org id in local state; assuming `useOrganization()` refreshes app-data caches | Read active org from Clerk; treat app-data cache invalidation as your responsibility (per-org keys + invalidate on switch) |
| `@xyflow/react` | Missing/late CSS import; second xyflow copy; unsized canvas container | Import `dist/style.css` in global CSS *after* Tailwind; keep xyflow a peer dep; ensure canvas parent has explicit height; `ReactFlowProvider` *above* hook-using components |
| Tailwind v4 (consumer) | `@import "tailwindcss"` inside the package; no `@source` for package files | Export tokens-only `theme.css`; consumer imports tailwind + tokens + `@source` pointing at the package |
| pnpm workspace | React/peer deps duplicated via symlink isolation | `peerDependencies` + root `pnpm.overrides` pin; verify `pnpm list react -r` shows one version |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Barrel `index.ts` re-exporting the whole library | Consumer bundle balloons (reports of 1MB → 12MB); whole library shipped for one component | `"sideEffects": false` (protect `*.css`); per-component entry points via `exports` map; prefer direct imports | As soon as `apps/web` imports one component and ships everything |
| `use-data-grid.ts` re-renders | Janky grid with large datasets; whole grid re-renders on any state change | Decompose state; memoize; injectable data source; profile before/after | Already a hot spot in Helm; worsens with larger Farsight datasets |
| Unsized / hidden xyflow canvas | Canvas renders nothing; error 004 "needs a width and a height" | Explicit height on parent; handle code 004 in `onError` for hidden tabs/modals | When canvas lives in a tab/modal or flex parent without height |
| Per-org cache never cleared | Memory growth as user switches many orgs; stale entries linger | Remove/invalidate queries on org switch (don't just add keys) | Long sessions with many org switches |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Frontend treated as the authority on tenant scope (sends arbitrary org/project id) | Cross-tenant access if backend trusts it; SPA JS is editable / API callable via curl | Tenant scope enforced server-side (`requireOrgMember()`); frontend only displays, never authorizes |
| Cache key omits org/project | Org B sees Org A's cached pipelines/agents/datasets (data disclosure) | Org/project as mandatory leading cache-key segment + invalidate on switch |
| `role` ignored in ported components | Viewer can trigger owner-only destructive actions in the UI | Role-aware gating in component API; backend remains source of truth |
| Porting Helm routes/assumptions that themselves lacked auth scoping (see CONCERNS.md) | Re-introducing un-scoped data access patterns into Farsight | Only the *UI* travels; do not port Helm data-access patterns — all data goes through the SDK against org/project-scoped contracts |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| `alert()`/`confirm()` carried over (48 + 9 instances) | Blocking, unstyled, inaccessible dialogs; no loading state on destructive ops | Sonner `toast` for feedback; `ConfirmDialog` (with `destructive`) for confirmations |
| Hardcoded dark-only chart hex/tooltips | Unreadable charts in light mode for greenfield consumers | CSS-var chart tokens (`--chart-1..5`) read at render; theme-aware tooltips |
| No loading state on list surfaces | Empty-state flash, then data pops in; looks broken | Skeleton loaders matching the grid (pattern already exists in `dashboard-client.tsx`) |
| Org switch shows previous org's data briefly | User distrusts the app; potential confusion about which org they're in | Per-org cache keys + remount-on-switch so the new org starts clean |
| `PageHeader` convention breaks (manual `<h1>`/flex wrapper) | Inconsistent header zone across the design system | Normalize to `PageHeader` with controls via `actions` during port |

## "Looks Done But Isn't" Checklist

- [ ] **Component renders in Helm/Storybook:** Often missing actual consumption from a *separate* Vite app — verify `apps/web`-style consumer renders it styled (Tailwind `@source` + token import).
- [ ] **TypeScript build passes:** Often missing runtime reality — verify SDK calls hit live (or spec-mocked) endpoints, not just compile.
- [ ] **`'use client'` in source:** Often missing in `dist/` — grep built output for the directive.
- [ ] **Single React in dev:** Often missing in consumer install — verify `pnpm list react -r` shows one version after `apps/web` installs the package.
- [ ] **Canvas shows nodes:** Often missing edges (CSS order / `overflow:hidden`) — visually verify connections render.
- [ ] **Org-scoped query works:** Often missing project axis and switch-invalidation — verify switching org/project shows correct, fresh data.
- [ ] **Charts render:** Often missing light-mode support — verify tooltips/series in both themes.
- [ ] **Destructive actions:** Often still `confirm()` — verify `ConfirmDialog` with loading state.
- [ ] **Bundle size:** Often missing tree-shaking — verify importing one component doesn't ship the whole library.
- [ ] **No Next.js deps:** Often missing an import guard — grep package for `next/` and `@clerk/nextjs/server`.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stripped `'use client'` discovered post-port | MEDIUM | Add directive-preservation plugin; switch to per-module output; re-publish; re-verify consumer build |
| Duplicate React in consumer | LOW–MEDIUM | Move react to peer deps; add root `pnpm.overrides`; reinstall; verify `pnpm list react -r` |
| Tailwind classes not generated | LOW | Add `@source` to consumer CSS pointing at the package; remove `@import "tailwindcss"` from package CSS |
| Stale org data / missing project axis | HIGH | Introduce tenant context provider, rewrite query keys to include org+project, add switch invalidation — touches every data hook; cheaper the earlier it's caught |
| Built UI on wrong contract shape (endpoint went live differently) | MEDIUM–HIGH | Re-derive from live contract; adopt Tolerant Reader + Zod runtime validation; rework affected component logic |
| `@/` alias pulled in out-of-scope surfaces | LOW–MEDIUM | Convert to relative imports; run `knip`/`madge` to prune; rebuild |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Per-org cache key leakage | SDK-adapter / data-layer foundation | Switch org/project in a test consumer; confirm fresh, correct data; audit every query key includes org+project |
| 2. `'use client'` stripped | Library build-tooling | Grep `dist/` for directive; consumer RSC/SPA build succeeds |
| 3. Tailwind tokens distributed but unstyled | Design-system portability | Separate Vite consumer renders styled with `@source` + token import |
| 4. xyflow CSS import order | Pipelines surface port (first canvas) | Visual smoke test: edges render in both surfaces |
| 5. Duplicate React 19 / peer-dep skew | Library build-tooling | `pnpm list react -r` shows one version; consumer renders without `Invalid hook call` |
| 6. Contracts ahead of live endpoints | SDK-adapter foundation + each surface | Live-vs-contract inventory exists; not-yet-live surfaces mocked from spec; completion gated on real-endpoint call |
| 7. Tenancy remodel under-modeled (project axis, role) | Tenant-context foundation | Context exposes `{orgId, orgSlug, role, userId, projectId}`; role gating present; project selection sourced from context |
| 8. Next.js coupling shimmed not removed | Decoupling phase | CI import-guard: zero `next/` and `@clerk/nextjs/server` imports |
| 9. `use-data-grid.ts` ported wholesale | Design-system portability | Characterization tests pass; hook has injectable data source; no Helm imports |
| 10. `@/*` alias resolves wrong / pulls out-of-scope | Decoupling + build-tooling | `knip`/`madge` shows no out-of-scope (CRM/campaign) imports; resolves under package tsconfig |
| 11. Porting UX debt as canon | Design-system + each surface | No `alert()`/`confirm()`; loading+error states; chart tokens; `PageHeader` normalized |

## Sources

- React docs — `'use client'` directive semantics (boundary, must be top-of-file): https://react.dev/reference/rsc/use-client — HIGH
- `rollup-preserve-directives` / `rollup-plugin-preserve-directives` / `rollup-plugin-preserve-use-client` (directive preservation, preserveModules, terser caveat): https://github.com/Ephem/rollup-plugin-preserve-directives , https://www.npmjs.com/package/rollup-plugin-preserve-use-client , https://github.com/rollup/rollup/issues/4699 — HIGH
- Next.js docs — bundlers may strip `'use client'`; third-party packages should mark client components: https://nextjs.org/docs/app/getting-started/server-and-client-components — HIGH
- Tailwind v4 monorepo sharing — CSS-first `@theme`, `exports` of theme.css, the `@source` scanning gotcha: https://nx.dev/blog/sharing-tailwind-styles-nx-monorepo , https://scottspence.com/posts/shared-tailwind-css-themes-in-svelte-monorepos , https://github.com/tailwindlabs/tailwindcss/discussions/18770 — HIGH
- React Flow docs — required CSS import, Tailwind v4 import-order, error 004 (parent needs width/height), `ReactFlowProvider` placement, `overflow:hidden` edge clobber: https://reactflow.dev/learn/troubleshooting/common-errors , https://reactflow.dev/learn/customization/theming , https://reactflow.dev/learn/advanced-use/hooks-providers — HIGH
- pnpm duplicate-React / Invalid hook call (peerDependencies, overrides, verification): https://github.com/pnpm/pnpm/issues/2695 , https://github.com/pnpm/pnpm/issues/2743 — HIGH
- Multi-tenant cross-tenant leakage + stale tenant context (frontend not the authority; cache keyed without tenant; validate per request): https://clerk.com/articles/multi-tenancy-in-react-applications-guide , https://agnitestudio.com/blog/preventing-cross-tenant-leakage/ , https://marmelab.com/blog/2022/12/14/multitenant-spa.html — MEDIUM (multiple sources agree)
- React Query / SWR per-org cache keys + invalidate-on-org-switch; Clerk `useOrganization()` only manages its own resources: https://clerk.com/docs/hooks/use-organization , https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation , https://swr.vercel.app/docs/advanced/cache — HIGH
- Contract-first / mock drift / types compile but runtime 404 (mock servers, Tolerant Reader, Zod runtime validation): https://smartbear.com/blog/api-first-development-and-the-case-for-api-mocking/ , https://medium.com/@instatunnel/automated-contract-testing-how-to-detect-api-drift-before-it-reaches-production-6c2a77baa2a3 , https://openapi-ts.dev/ — MEDIUM–HIGH
- Barrel-file tree-shaking bloat, `sideEffects: false` (protect CSS), per-component `exports` entry points: https://github.com/vercel/next.js/issues/12557 , https://webpack.js.org/guides/tree-shaking/ — HIGH
- Project context: `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md` (tenancy invariant, 3,273-line hook, untyped node configs), `.planning/codebase/UI-REVIEW.md` (48 `alert()`, hardcoded chart hex, missing loading states) — HIGH (in-repo)

---
*Pitfalls research for: Next.js-coupled React UI → portable component library on a new org/project tenancy model (Helm → Farsight)*
*Researched: 2026-05-29*
