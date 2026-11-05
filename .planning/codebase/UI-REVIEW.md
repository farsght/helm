# UI Review — Page Surfaces (Standalone)

**Audited:** 2026-05-29
**Baseline:** abstract 6-pillar standards (no UI-SPEC)
**Screenshots:** not captured (no dev server)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | 48 `alert()` calls for all feedback; "Cancel" generic; stat changes hardcoded |
| 2. Visuals | 3/4 | Consistent card-grid hierarchy; 4 pages bypass `PageHeader` convention |
| 3. Color | 2/4 | Extensive hardcoded hex colors in chart code; semantic greens/yellows/purples outside the token system |
| 4. Typography | 3/4 | 6 distinct sizes in use; weights are disciplined; arbitrary `text-[10px]`/`text-[11px]` in detail clients |
| 5. Spacing | 3/4 | `p-8` majority consistent; contacts uses `p-6`; occasional `mb-8` vs `mb-6` drift in header gap |
| 6. Experience Design | 2/4 | Campaigns and Agents list pages show blank screen during initial fetch; 9 destructive actions use `confirm()` instead of `ConfirmDialog` |

**Overall: 15/24**

---

## Top 3 Priority Fixes

1. **48 `alert()` calls replace all success/error feedback** — Browser alert blocks the tab, steals focus, cannot be styled, and is inaccessible on mobile. Sonner (`toast`) is already installed and used correctly in `datasets`, `pipelines`, `notebooks`, and `segments`. Migrate every `alert()` call in `prospects-client.tsx`, `agents-client.tsx`, `campaigns-client.tsx`, `conversations-client.tsx`, `templates-client.tsx`, `skills-client.tsx`, `settings-client.tsx`, and `connections-client.tsx` to `toast.success()` / `toast.error()`.

2. **Campaigns and Agents list pages show a blank screen while loading** — `campaigns-client.tsx` and `agents-client.tsx` set no `loading` flag and render nothing while their `useEffect` fetches. Users see an empty grid or card area with no indication of progress. Add a `loading` state boolean and render skeleton cards (4-card or 2-card grid) identical to the pattern already used in `dashboard-client.tsx` lines 72–87.

3. **All chart colors are hardcoded hex values that will break in light mode and diverge from the design system** — `dashboard-client.tsx` (lines 177–213) and `analytics-client.tsx` (lines 114, 192, 216–351) embed `#266DF0`, `#8B5CF6`, `#10B981`, `#1B1B1F`, `#3A3A40`, and `#6B7280` as inline chart props. The dark-only tooltip style (`backgroundColor: '#1B1B1F'`) will be unreadable in light mode. Replace chart series colors with CSS variables read at render time (e.g. `getComputedStyle(document.documentElement).getPropertyValue('--primary')`) or define a chart color array from the existing `--chart-1` through `--chart-5` token set.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**WARNING — 48 alert() calls across 10+ page surfaces**

The project imports `sonner` and uses `toast.success` / `toast.error` in `datasets-client.tsx`, `pipelines-client.tsx`, `notebooks-client.tsx`, and `segments` components. However, the majority of page surfaces still use `window.alert()`:
- `prospects-client.tsx`: 6 alert calls (lines 108, 123, 158, 167, 224, 242, 276)
- `agents-client.tsx`: 2 alert calls (lines 86, 100)
- `campaigns-client.tsx`: 2 alert calls (lines 47, 66)
- `settings-client.tsx`: 4 alert calls (lines 133, 145, 158, 162)
- `conversations-client.tsx`: 2 alert calls (lines 148, 171)
- `templates-client.tsx`: 2 alert calls (lines 77, 95)
- `skills-client.tsx`: 2 alert calls (lines 60, 73)
- `integrations/mcp-servers-client.tsx`: 7 alert calls (lines 61, 69, 73, 90, 217, 218, 226)

The inconsistency means users get a polished inline toast on Datasets but a blocking browser dialog on Prospects.

**Hardcoded stat change labels (WARNING)**

`dashboard-client.tsx` lines 118–138 hardcode `"+12%"`, `"+8%"`, `"+15%"`, `"+23%"` as static strings for metric deltas. These are not computed from the API response. Users will always see the same optimistic numbers regardless of actual trend data.

**Generic "Cancel" in dialogs (WARNING)**

`Cancel` appears in dialog footers across `prospects-client.tsx` (lines 518, 562, 661), `contacts-client.tsx` (line 171), `deals-client.tsx` (line 207), and `settings-client.tsx` (line 702). While not catastrophically bad, `Cancel` is the weakest possible CTA label in a dialog — "Discard changes" or "Keep editing" would better communicate consequence.

**"Save Changes" repeated three times on settings page (WARNING)**

`settings-client.tsx` renders identical `{saving ? 'Saving...' : 'Save Changes'}` buttons at lines 440, 530, and 591, one per tab. There is no visual signal of which section's save button belongs to which form block.

**Empty state copy is generally good (positive)**

`campaigns-client.tsx` line 100: "Create your first campaign to start automating your outreach" — specific and actionable. `contacts-client.tsx` uses `EmptyState` component correctly with description and action. `pipelines-client.tsx` and `notebooks-client.tsx` have on-brand, specific empty copy.

**`settings-client.tsx` uses raw `<h1>` instead of `PageHeader` (WARNING)**

Line 180–181 manually renders `<h1 className="text-3xl font-bold text-foreground">Settings</h1>` rather than `<PageHeader>`. This bypasses the shared primitive.

---

### Pillar 2: Visuals (3/4)

**PageHeader consistency gap (WARNING)**

Four in-scope page surfaces bypass `PageHeader`:
- `settings-client.tsx` line 180: manual `<h1>`
- `datasets-client.tsx` line 272: manual `<h1>` inside a manual flex row
- `pipelines-client.tsx` line 179: manual `flex items-center justify-between` div with `<h1>`
- `notebooks-client.tsx` line 168: same manual pattern

The CONVENTIONS.md explicitly states "Do NOT wrap `PageHeader` in an outer flex row — pass controls through `actions`." Pipelines and Notebooks do exactly the prohibited pattern (manual justify-between div wrapping an h1 and a button).

**Visual hierarchy is clear on card-grid pages (positive)**

Campaigns, Agents, Datasets all use a consistent card-grid layout with `CardTitle` (larger), `CardDescription` (muted), and metadata rows. The hierarchy from header → description → stat → action is readable.

**Icon-only destructive buttons lack aria-labels (WARNING)**

In `prospects-client.tsx` lines 370–385, the `Pencil` and `Trash2` icon buttons are `h-7 w-7 p-0` with no `aria-label`. The `pipelines-client.tsx` and `notebooks-client.tsx` Trash2 buttons do include `aria-label="Delete pipeline"` / `aria-label="Delete notebook"` — the pattern is known but not universally applied. The `settings-client.tsx` line 241 `Trash2` button for disconnecting LinkedIn has no aria-label.

**Conversations layout is unique — no PageHeader at all (WARNING)**

`conversations-client.tsx` renders a split-pane layout without using `PageHeader`. The left column header (lines 187–191) is a manual `<h2>` + `<p>` constructed inline with no shared primitive. This is a different visual treatment from all other surfaces and lacks the standardized header zone.

**Dashboard metric deltas always show green (WARNING)**

All four metric cards in `dashboard-client.tsx` show `text-green-500` deltas that are hardcoded strings, not conditional on positive/negative trend. A declining metric would still show green.

---

### Pillar 3: Color (2/4)

**Hardcoded hex colors in charts — 30+ instances (BLOCKER-class defect)**

Both `dashboard-client.tsx` and `analytics-client.tsx` pass raw hex strings directly to Recharts:
- `dashboard-client.tsx` lines 177–213: `stroke="#3A3A40"`, `stroke="#6B7280"`, `backgroundColor: '#1B1B1F'`, `fill="#266DF0"`, `fill="#8B5CF6"`, `fill="#10B981"`
- `analytics-client.tsx` lines 114, 192, 216–351: same set plus `#F59E0B`, `#EF4444`, `from-[#266DF0]`, `to-[#1a5ac9]`, inline `rgba(38, 109, 240, ${intensity})`

The tooltip `backgroundColor: '#1B1B1F'` and `border: '1px solid #3A3A40'` hardcode dark-mode values. In light mode these tooltips will render near-invisible dark backgrounds. The app uses `Providers` with `defaultTheme="system"`, meaning light mode users see broken chart tooltips.

**Semantic status colors use Tailwind named colors, not design tokens (WARNING)**

Status badges use `text-green-500`, `text-yellow-500`, `text-yellow-400`, `text-red-400`, `text-purple-400` across `campaigns-client.tsx` (lines 129, 132), `conversations-client.tsx` (lines 43–47), `dashboard-client.tsx` (line 259), and `settings-client.tsx` (lines 197–204). These are Tailwind palette values not connected to the design token system (`--primary`, `--destructive`, etc.). While semantically reasonable, they will not automatically adapt if the design system changes, and they diverge from the token discipline the rest of the UI practices.

**`text-[#0A66C2]` hardcoded LinkedIn brand color (WARNING)**

`settings-client.tsx` line 214 and 254 use `text-[#0A66C2]` for the LinkedIn icon. This is a brand color (acceptable) but set as an arbitrary Tailwind value rather than a CSS variable or constant. If the icon needs to adapt to theme context, it won't.

**Primary token usage is appropriately scoped (positive)**

`bg-primary` is correctly scoped to primary action buttons only. `text-primary` is used for accent text (agent model badges, analytics rank numbers, reply rates) with reasonable frequency. The 60/30/10 principle is broadly respected — `bg-background` and `bg-card` dominate the surfaces.

---

### Pillar 4: Typography (3/4)

**Font sizes across audited page surfaces:**
- `text-3xl` (1): page titles via `PageHeader`
- `text-2xl` (5): metric values in dashboard/analytics cards
- `text-xl` (1): one instance
- `text-lg` (2): empty state headings
- `text-sm` (31): body text, table cells, descriptions
- `text-xs` (22): metadata, badges, helper text

Six distinct sizes in use — one over the informal "4 sizes" guideline, but the distribution is reasonable for a data-dense internal app with metrics, tables, and badges all coexisting.

**Font weights are disciplined (positive)**

- `font-bold` (9): page titles and metric values only
- `font-medium` (22): row names, card titles, column headers
- `font-semibold` (1): one instance in `PageHeader`

Three weight levels with clear intent hierarchy. No weight applied arbitrarily.

**Arbitrary font sizes in detail clients (WARNING)**

Files nominally out of scope but composited into surfaces: `pipeline-node.tsx` line 35 uses `text-[11px]`, `pipeline-detail-client.tsx` lines 141, 787, 813, 841 use `text-[10px]` and `text-[11px]`, `connections-client.tsx` line 495 uses `text-[11px]`. These break the Tailwind scale and will not respond to type scale changes. Recommend `text-xs` (12px) for these elements.

**`CardTitle` used with `text-sm font-medium` override (WARNING)**

In `dashboard-client.tsx` lines 152 and analytics counterpart, the metric card headers render `CardTitle` with an explicit override to `text-sm font-medium` — semantically misusing the card title element as a label. Use `<p>` or `<Label>` for this pattern to avoid semantic mismatch.

---

### Pillar 5: Spacing (3/4)

**Root page padding is consistent at `p-8` (positive)**

All 14 in-scope surfaces that render a page-level div use `p-8`. Exception: `contacts-client.tsx` line 84 uses `p-6`. This is a single divergence.

**Header gap inconsistency: `mb-8` vs `mb-6` (WARNING)**

Pages using `PageHeader` wrap it in `<div className="mb-8">` (campaigns, dashboard, agents, analytics) while `segments-client.tsx` line 86 uses `<div className="mb-6">`. Pipelines and Notebooks skip the wrapper div entirely and use `mb-6` on the manual header container. The gap between the page header and the content below it oscillates between 24px and 32px with no discernible rule.

**Arbitrary spacing values are confined to detail-level clients (positive)**

In-scope page surfaces do not use arbitrary `[Npx]` spacing classes. The arbitrary values found (`[130px]`, `[58px]`, `[120px]`) are all in pipeline node and detail components, which are out of scope for this audit.

**Card grid gaps are consistent (positive)**

`gap-4` for metric rows, `gap-6` for standard card grids, `gap-8` for paired chart panels — a coherent ascending scale used across dashboard, campaigns, and analytics.

---

### Pillar 6: Experience Design (2/4)

**BLOCKER — Campaigns and Agents list pages have no loading state**

`campaigns-client.tsx` has no `loading` state. The `useEffect` at line 29 fetches campaigns silently; while the fetch is in flight, the empty-state UI (`<Target h-12 w-12... "No campaigns yet">`) renders. A user with existing campaigns will see the empty state flash before data arrives. Same pattern in `agents-client.tsx`: the `useEffect` at line 41 fetches agents; no loading guard means an empty grid flickers until resolution.

Compare: `dashboard-client.tsx` lines 68–89 has a proper skeleton loading state (animate-pulse cards), `analytics-client.tsx` lines 68–89 replicates it. This good pattern exists but was not applied to the two most-visited list surfaces.

**9 destructive actions use `confirm()` instead of `ConfirmDialog` (WARNING)**

`ConfirmDialog` is built and used correctly in `prospects-client.tsx`, `contacts-client.tsx`, `deals-client.tsx`, and `agents-client.tsx`. However, `confirm()` browser dialogs remain in:
- `settings-client.tsx` lines 96, 138: LinkedIn disconnect, account delete
- `datasets-client.tsx` line 131: dataset delete
- `pipelines-client.tsx` line 49: pipeline delete
- `notebooks/notebooks-client.tsx` line 43: notebook delete
- `segments/components/data-table-segments.tsx` line 44: segment delete

`confirm()` cannot be styled, is blocked by many browser content policies, and provides no loading state. Each of these should use `ConfirmDialog` with a `destructive` prop.

**Error boundary absent at route level (WARNING)**

No `error.tsx` file was found in any of the audited route directories (`app/campaigns/`, `app/agents/`, `app/analytics/`, etc.). Next.js App Router supports per-route `error.tsx` boundaries that catch runtime errors from client components. Without them, an unhandled exception in any page surface will propagate to the root error boundary (if any exists). Recommend adding route-level `error.tsx` at minimum for campaigns, agents, and analytics.

**`settings-client.tsx` loading state is a bare text string (WARNING)**

Line 169: `return <div className="p-8 text-muted-foreground">Loading settings...</div>`. This is functional but visually inconsistent with the skeleton approach used in dashboard and analytics. Settings has multiple sections (tabs, cards) — a skeleton skeleton that reflects the tab layout would be appropriate.

**Conversations page has no error state (WARNING)**

`conversations-client.tsx` lines 53–57 fetch conversations with `.catch(err => console.error(...))` — errors are swallowed silently. The user sees an empty conversation list with no explanation if the API fails. Add an error state render path.

**Some surfaces use toast (positive)**

`pipelines-client.tsx`, `notebooks-client.tsx`, `datasets-client.tsx` all use `toast.success` / `toast.error` from Sonner, which is the correct pattern. These surfaces fully cover their success and error feedback paths.

---

## Additional Findings (Beyond Top 3)

**Settings page skips PageHeader** — `settings-client.tsx` line 180 manually builds the header. Inconsistent with the established convention.

**`prospects-client.tsx` CSV export ignores pagination** — line 248 calls `/api/prospects` with no page or limit params, fetching only page 1 of 50. Users exporting a large list get a partial download with no warning.

**Dashboard metric changes are static strings** — `"+12%"`, `"+8%"`, `"+15%"`, `"+23%"` are hardcoded in `dashboard-client.tsx` lines 119–137, not derived from API data. The `DashboardData` type includes no trend delta fields, so the displayed changes are fabricated.

**`conversations-client.tsx` has no PageHeader** — the left-panel header uses a raw `<h2>` and `<p>`, outside the shared component system.

---

## Registry Audit

Registry audit: skipped (no UI-SPEC declaring third-party registries).

---

## Files Audited

**Page surfaces (in scope):**
- `app/layout.tsx`
- `app/globals.css`
- `app/dashboard-client.tsx`
- `app/campaigns/campaigns-client.tsx`
- `app/prospects/prospects-client.tsx`
- `app/contacts/contacts-client.tsx`
- `app/companies/companies-client.tsx` (partial — confirmed loading/empty pattern)
- `app/deals/deals-client.tsx` (partial — confirmed loading/empty pattern)
- `app/segments/segments-client.tsx`
- `app/datasets/datasets-client.tsx` (header section)
- `app/agents/agents-client.tsx`
- `app/agents/runs/runs-client.tsx` (grep audit)
- `app/pipelines/pipelines-client.tsx`
- `app/connections/connections-client.tsx` (grep audit)
- `app/integrations/connections/connections-client.tsx` (grep audit)
- `app/integrations/mcp-servers/mcp-servers-client.tsx` (grep audit)
- `app/conversations/conversations-client.tsx`
- `app/templates/templates-client.tsx` (grep audit)
- `app/skills/skills-client.tsx` (grep audit)
- `app/notebooks/notebooks-client.tsx`
- `app/analytics/analytics-client.tsx`
- `app/settings/settings-client.tsx`

**Shared primitives:**
- `components/page/page-header.tsx`
- `components/page/empty-state.tsx`
- `components/app-sidebar.tsx`

**Excluded (per scope):**
- `components/workflow/`, `components/canvas/`, `*-canvas-client.tsx`
- `components/data-grid/`, `components/data-table/`
- `app/*/[id]/` detail clients (except as referenced for grep evidence)
- `app/sentry-example-page/`
