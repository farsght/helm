# shadcn.io Block Intake Checklist

**Created:** 2026-05-29 (during Phase 2 discussion)
**Applies to:** Phases 2–4. Any time we pull a component/block from the **shadcn.io** registry (MCP `shadcnio`) into `packages/ui`.
**Status:** Process reference for planner/executor. Not a license to vendor — see the Licensing Gate below.

---

## Why this exists

shadcn.io is a large registry (~7,800 items; **6,167 blocks** across 56 categories) of mostly **pre-composed surfaces**, not headless primitives. Several categories map directly onto our roadmap (`skeleton`, `empty-state`, `error`, `notification`, `tables`, `settings`, `chat`, `kanban`, `dashboard`). The items are **demos** — a presentational shell + baked-in mock data + self-contained local state. Turning one into a library component is a *decoupling* exercise, identical in spirit to the rest of this project. This doc makes that conversion mechanical and repeatable.

**Default posture: shadcn.io is a PATTERN SOURCE, not a dependency.** Do **not** `shadcn add` blocks into `packages/ui`. Copy-and-decouple only the handful that earn their place.

---

## What a registry item looks like (MCP `get_item_source`)

```jsonc
{
  "name": "tables-bulk-actions",
  "type": "registry:block",            // ui | block | hook | chart | example | style
  "files": [{ "path": "...", "content": "<raw source>", "target": "..." }],
  "dependencies": ["framer-motion", "lucide-react"],   // npm deps
  "registryDependencies": ["badge", "button", "checkbox", "table"], // other registry items
  "premium": true,                     // shadcn.io Pro — licensing matters
  "author": "shadcn.io"
}
```

Key facts observed:
- Imports use the **`~/` alias** (`~/components/ui/skeleton`, `~/lib/utils`) — not Helm's `@/`.
- Blocks use **`export default function`** — opposite of our named-export convention.
- `'use client'` is on line 1 (our tsdown pipeline already preserves it).
- `registryDependencies` resolve to **our own ported primitives** — the dependency chain closes inside `packages/ui`. ✅
- The "Next.js" in descriptions is marketing; the two sampled (`skeleton-card-grid`, `tables-bulk-actions`) had **no `next/*` imports**. Navigation/marketing categories (`login`, `navbar`, `hero`) are the ones likely to carry `next/link` / `next/image` — audit per block.

---

## Item-type triage

| `type` | What it is | Intake effort | Verdict |
|---|---|---|---|
| `registry:ui` | A primitive (e.g. shadcn.io's `empty`, `spinner`) | alias rewrite + named export | Port like Phase 1 if it fills a gap |
| `registry:block` | Surface composition + mock data + local state | full pipeline below | Decouple only curated picks |
| `registry:hook` | Utility hook | alias rewrite; verify no framework deps | Port if useful |
| `registry:chart` | Recharts preset | rewrite palette → `tokens.chart[n]` | Use as chart source |
| `registry:example` | Demo | — | **Don't ship.** Use as test/story fixtures |
| `registry:style`/themes/background/shaders/text | Meta / decorative | — | Out of scope for the data-app domain |

---

## The transform pipeline (per block)

Mechanical steps (1–3) + judgment steps (4–5) + per-block audits (6–8). A block isn't "done" until the Acceptance Criteria pass.

1. **Alias rewrite.** `~/components/ui/X` and `@/components/ui/X` → package-relative path to `src/components/ui/X`; `~/lib/utils` / `@/lib/utils` → relative to `src/lib/utils`. Compute the depth from the file's final location (Phase 1 verified: from `src/components/ui/` the util path is `../../lib/utils` — recompute for deeper dirs like `src/components/blocks/<cat>/`).
2. **Named export, no default.** `export default function Foo()` → `export function Foo()`; add to the file's named exports. (Phase 1 "No Default Export" convention.)
3. **Preserve `'use client'`** on line 1 if present. Don't add it to server-safe components.
4. **Lift mock data to typed props.** Delete the baked-in `const rows = [...]`; introduce a `data`/`items` prop with an exported TS type. Render-slot anything app-specific (cell renderers, icons) rather than hardcoding.
5. **Lift state + callbacks to a controlled-with-uncontrolled-default seam.** Self-contained `useState` + `handleX` become optional controlled props (`value`/`onValueChange`, `onAction`) with an internal-state fallback — the **same seam chosen for DataTable (CONTEXT D-05)**. Keep zero-config usability; allow consumer control.
6. **Strip `next/*`.** `next/link` → `href` + `onClick`/`asChild` prop; `next/image` → `<img>` or an `image` render slot. (Audit — absent in dataless blocks, common in `login`/`navbar`/`hero`.)
7. **Reconcile npm `dependencies`.** Map each against our peer/dep policy. `framer-motion`/`motion` is heavy — prefer a peer, or drop the animation if it's decorative. `lucide-react` follows our icon policy (note the pending 0.576→1.x audit).
8. **Verify `registryDependencies`.** Each must already exist as a ported `packages/ui` primitive. If a block needs a primitive we haven't ported, port the primitive first (or drop the block).

---

## Acceptance criteria (a converted block must pass)

- [ ] CI import-guard clean: **zero `next/*`**, zero `@clerk/nextjs/server`, zero `~/`/unresolved `@/`
- [ ] **No `alert()` / `confirm()`** (CORE-04 convention — destructive → `ConfirmDialog`, transient → toast)
- [ ] **Named export, no default**; `'use client'` preserved if needed
- [ ] **No baked-in mock data**; renders from props (dataless blocks like skeletons are exempt)
- [ ] State/callbacks exposed via the controlled/uncontrolled seam (interactive blocks)
- [ ] `registryDependencies` resolve to ported package primitives
- [ ] Tree-shakeable: lands at its own subpath export, no new barrel
- [ ] a11y baseline holds (focus rings, keyboard, `aria-label` on icon-only buttons — CORE-05)
- [ ] Chart palettes use `tokens.chart[n]`, not hardcoded hex (charts only)

---

## Licensing gate (BLOCKING before any source is vendored)

Sampled blocks are `premium: true`, `author: "shadcn.io"`. Official shadcn/ui is MIT, but **shadcn.io is a separate commercial product**; redistributing its premium source inside `@farsight/ui` (which is copied into the Farsight monorepo) is **redistribution** and may be restricted by the Pro license.

**Verify the shadcn.io Pro license permits redistribution-in-a-derived-package before any block source lands in `packages/ui`.** Surface the concrete terms + implications first. Dataless layout patterns (skeletons) that we re-implement from scratch (rather than copy verbatim) carry the least risk; verbatim premium source carries the most.

---

## Phase fit & candidate picks

- **Phase 2 (cleanest):** `skeleton-*` and `empty-state-*` / `error-*` blocks — 1 file, depend only on `skeleton`/primitives, **no data-lifting** (inherently dataless). Seed candidates for CONTEXT D-03 / D-02:
  - `card-grid-skeleton` ← `skeleton-card-grid`
  - `list-skeleton` ← `skeleton-article-list` / `skeleton-activity-feed`
  - `detail-skeleton` ← `skeleton-dashboard-full` / `skeleton-blog-post`
  - `EmptyState` / `ErrorState` styling ← `empty-state-*`, `error` category
  - Also evaluate official `@shadcn/empty` + `@shadcn/spinner` primitives.
- **Phase 3 (notifications):** `notification-center`, `notification-bell-dropdown`, `notification-api-error`, `notification-empty-state` — *pattern source*; rebuilt onto contracts + the adapter seam.
- **Phase 4 (surfaces):** `tables-*`, `kanban`, `dashboard-*`, `chat`, `settings` — *pattern source* for datasets/pipelines/agents.
- **Charts:** the 53 presets — intake = palette swap to `tokens.chart[n]`.
- **Examples (1,101):** characterization-test fixtures / Storybook stories, not shipped code.

---

*Reference for: Farsight UI Library (Helm Extraction). Source registry: shadcn.io via MCP `shadcnio`.*
