# AI-SDR Implementation Checklist

> Maintained by **farsight** (automated watchdog). Updated as Netrunner commits code.
> Last updated: 2026-05-14 06:38 UTC

---

## Status Key
- ⬜ Not started
- 🔄 In progress (Netrunner active)
- ✅ Complete
- ❌ Skipped / deferred

---

## Phase 1–3 + Extras ✅ All Done

All 22 gaps implemented in `905eaae7`. See earlier checklist entries.

---

## Post-Implementation Fixes (Clerk Auth + SSR + Schema)

| Commit | What changed | Status |
|--------|-------------|--------|
| `9d480b2f` | Lazy DB init — allow build without DATABASE_URL | ✅ |
| `e9b0d57e` | Fix TS build errors, rename middleware → proxy | ✅ |
| `d468df16` | Fix ownership-check select mocks (prospects, lists, templates) | ✅ |
| `3402b306` | Scope dashboard to userId, single-query chart data, Clerk auth guard | ✅ |
| `d7845dce` | **Remove server-side DB calls from all pages → fixes SSR 500 crashes** | ✅ |
| `a0cec375` | Fix tests after server-component + dashboard refactor (test-only commit) | ✅ |
| `1103469b` | **Add userId to messages, tags, settings tables — full data isolation** | ✅ |
| `1ba87773` | **Fix all 5 remaining P1/P2 gaps — prospects, templates, campaigns PUT, steps, AI suggest-reply** | ✅ |
| `c80526c6` | **Proper error surfacing in all client components + health check endpoint** | ✅ |

---

## 🏁 All P1/P2 Gaps Resolved — 2026-05-13 20:27 UTC

*Commit `1ba87773` landed at 20:27 UTC. PR #20.*

| Endpoint | Files Changed | Fix | Status |
|----------|--------------|-----|--------|
| `POST /api/prospects` | `app/api/prospects/route.ts` (+20/-9) | Input validation + safe defaults | ✅ |
| `POST /api/templates` | `app/api/templates/route.ts` (+17/-3) | channel default + validation | ✅ |
| `PUT /api/campaigns/:id` | `app/api/campaigns/[id]/route.ts` (+19/-10) | Dynamic set(), undefined-safe return | ✅ |
| `GET /api/campaigns/:id/steps` | `app/api/campaigns/[id]/steps/route.ts` (+43/-0, new) | New route — returns workflowNodes | ✅ |
| `POST /api/ai/suggest-reply` | `app/api/ai/suggest-reply/route.ts` (+80/-0, new) | New route — gpt-4o-mini suggestions | ✅ |

---

## 🔧 Post-P1/P2 Polish (c80526c6 — 21:25 UTC)

| File | Change | Notes |
|------|--------|-------|
| `app/api/health/route.ts` | +14 (new) | Health check endpoint added |
| `app/campaigns/[id]/campaign-detail-client.tsx` | +14/-17 | Better error surfacing |
| `app/campaigns/campaigns-client.tsx` | +7/-8 | Error handling cleanup |
| `app/conversations/conversations-client.tsx` | +11/-22 | Error surfacing |
| `app/lists/lists-client.tsx` | +12/-18 | Error surfacing |
| `app/prospects/prospects-client.tsx` | +14/-20 | Error surfacing |
| `app/settings/settings-client.tsx` | +10/-12 | Error surfacing |
| `app/templates/[id]/template-detail-client.tsx` | +4/-6 | Error surfacing |
| `app/templates/templates-client.tsx` | +8/-20 | Error surfacing |
| `lib/api.ts` | +12 | API utility additions |
| `proxy.ts` | +1 | Minor update |

---

## 🆕 Post-Implementation Enhancements

| Commit | What changed | Status |
|--------|-------------|--------|
| `e0b536dd` | **Add `companyWebsite` + `companyLinkedinUrl` to prospects** — schema + migration 0003 + API routes + client | ✅ |

*Commit `e0b536dd` at 02:44 UTC — schema migration 0003 adds two prospect enrichment fields. Files: `db/schema.ts`, `db/migrations/0003_faulty_leopardon.sql`, `db/migrations/meta/*`, `app/api/prospects/route.ts`, `app/api/prospects/[id]/route.ts`, `app/prospects/prospects-client.tsx`.*

---

## ✅ Full Working End-to-End Status

- Dashboard — real data, user-scoped ✅
- `/campaigns` list — renders with `prospectCount` + `stepCount` ✅
- `/campaigns/:id` — no longer 500s ✅
- `/campaigns/:id/steps` — sequence tab populated ✅
- `/prospects` table — paginated, user-scoped, `companyWebsite`/`companyLinkedinUrl` fields ✅
- `/prospects/:id` — no longer 500s ✅
- `POST /api/prospects` — create prospect working ✅
- `/lists` — `memberCount` included ✅
- `/templates` + `/templates/:id` — full A/B variant management ✅
- `POST /api/templates` — create template working ✅
- `/conversations` — thread view, reply send, Clerk-auth'd ✅
- `/analytics` — core KPIs real ✅
- Settings API — general + linkedin, fully user-scoped ✅
- AI suggest-reply — gpt-4o-mini powered ✅
- Health check endpoint — `/api/health` ✅
- Error surfacing — all client components ✅
- Prospect enrichment fields — `companyWebsite` + `companyLinkedinUrl` ✅

---

## Schema: userId Coverage

| Table | userId | Status |
|---|---|---|
| `campaigns` | ✅ | OK |
| `lists` | ✅ | OK |
| `prospects` | ✅ | OK |
| `conversations` | ✅ | OK |
| `templates` | ✅ | OK |
| `connectedAccounts` | ✅ | OK |
| `settings` | ✅ | Fixed in `1103469b` |
| `tags` | ✅ | Fixed in `1103469b` |
| `messages` | ✅ | Fixed in `1103469b` |
| `workflowNodes` | n/a | OK — cascades via campaigns |
| `workflowEdges` | n/a | OK — cascades via campaigns |
| `campaignProspects` | n/a | OK — cascades via both |
| `listMembers` | n/a | OK — cascades via lists |
| `templateVariants` | n/a | OK — cascades via templates |
| `tasks` | n/a | OK — cascades via campaignProspects |
| `prospectTags` | n/a | OK — cascades via both |

**All tables are now fully user-isolated. ✅**

---

## Build & Deploy

| Step | Status | Notes |
|------|--------|-------|
| All 22 gaps | ✅ | `905eaae7` |
| Clerk auth + ownership | ✅ | Multiple commits |
| SSR crash fixes | ✅ | `d7845dce` |
| Test suite fixes | ✅ | `a0cec375` |
| Schema userId gaps (settings, tags, messages) | ✅ | `1103469b` — migration 0002 |
| Settings API | ✅ | `1103469b` — general + linkedin, user-scoped |
| `POST /api/prospects` fix | ✅ | `1ba87773` |
| `POST /api/templates` fix | ✅ | `1ba87773` |
| `PUT /api/campaigns/:id` fix | ✅ | `1ba87773` |
| `GET /api/campaigns/:id/steps` | ✅ | `1ba87773` — new route |
| `POST /api/ai/suggest-reply` | ✅ | `1ba87773` — new route, gpt-4o-mini |
| Error surfacing (all clients) | ✅ | `c80526c6` — polish pass |
| Health check endpoint | ✅ | `c80526c6` — `/api/health` |
| Prospect enrichment fields | ✅ | `e0b536dd` — migration 0003 |
| Vercel deployment | ✅ | https://ai-sdr-mocha.vercel.app (READY 21:44 CDT) |

---

## 🎉 Implementation Complete

All P1 and P2 gaps resolved. App is fully functional end-to-end with:
- Complete Clerk auth + user data isolation
- All CRUD endpoints working
- AI-powered suggest-reply
- Health check endpoint
- Clean error surfacing in all client components
- Prospect enrichment fields (companyWebsite, companyLinkedinUrl) — migration 0003
- Clean Vercel deployment (latest: `ai-gza0khkkp-farsght.vercel.app` READY 21:44 CDT)

---

*Auto-updated by farsight watchdog (every 15 min). Last run: 2026-05-14 05:38 UTC (impl complete — no new commits — Claude Code idle, implementation finished)
*Auto-updated by farsight watchdog (every 15 min). Last run: 2026-05-14 03:23 UTC (impl complete — no new commits — Claude Code idle, implementation finished)*

---

## 🌓 Theme System Migration — Light/Dark Mode (shadcn pattern)

**Goal:** Replace all hardcoded color literals (`bg-[#25252A]`, `text-white`, `text-gray-400`, `border-[#3A3A40]`, `bg-[#266DF0]`, etc.) with shadcn semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, etc.) so the entire app responds to light/dark mode via a single `class="dark"` toggle on `<html>`.

**Why:** Every page and component currently bakes in dark-mode hex values inline. There is no light theme today. Adding a theme switcher requires zero color literals to remain in component code.

### Phase A — Foundation ✅
- [x] Audit current color literals: **647 matches** in `app/` + `components/` (baseline 2026-05-13)
- [x] Verify shadcn CSS variables are present in `app/globals.css` — `:root` (light) + `.dark` blocks present with full oklch palette
- [x] **Removed conflicting `@theme` color overrides** that were hardcoding tokens to dark hex (this was the silent blocker preventing the existing `.dark` block from ever applying)
- [x] `next-themes` installed (`^0.4.6`)
- [x] `<Providers>` wired in `app/layout.tsx` (`attribute="class"`, `defaultTheme="system"`)
- [x] `ThemeToggle` component created at `components/theme-toggle.tsx` (Light / Dark / System dropdown)
- [x] Toggle added to sidebar footer next to `UserButton`

### Phase A.5 — Brand palette mapping (informational; tokens already defined)
  - `#266DF0` (brand blue) → `--primary` + `--ring`
  - `#25252A` (card surface) → `--card` (dark) / white-ish (light)
  - `#1B1B1F` (page bg / input bg) → `--background` (dark) / `--input` background
  - `#3A3A40` (borders) → `--border` + `--input`
  - `gray-400` (muted text) → `--muted-foreground`
  - `gray-500` → `--muted-foreground` (slightly dimmer in light)
- [ ] Install `next-themes` (`npm i next-themes`) — already standard with shadcn
- [ ] Add `<ThemeProvider>` in `app/layout.tsx` (attribute=`class`, defaultTheme=`dark`, enableSystem)
- [ ] Add a `ThemeToggle` component (Settings page + maybe top nav)

### Phase B — Codemod sweep ✅
Ran `scripts/theme-codemod.py --apply` across `app/` + `components/` (excluding `components/ui/`).

**Result: 647 → 3 hardcoded literals** (the remaining 3 are LinkedIn brand blue `#0A66C2`, intentionally preserved as third-party brand identity).

| Hardcoded | Replaced with |
|---|---|
| `bg-[#25252A]` | `bg-card` |
| `bg-[#1B1B1F]` | `bg-background` |
| `border-[#3A3A40]` | `border-border` |
| `bg-[#266DF0]` | `bg-primary` |
| `hover:bg-[#1a5ac9]` | `hover:bg-primary/90` |
| `text-white` (on bg-card / bg-background) | `text-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `hover:text-white` | `hover:text-foreground` |
| `hover:border-[#266DF0]` | `hover:border-primary` |
| `text-[#266DF0]` | `text-primary` |
| `bg-blue-500/10 text-blue-400` | `bg-primary/10 text-primary` |
| `bg-purple-500/10 text-purple-400` | `bg-accent/20 text-accent-foreground` (or keep as semantic "dynamic" badge variant) |

### Phase C — Page-by-page verification (HUMAN PASS REQUIRED)
Walk through each route in both light and dark, note any visual breakage in this checklist:
- [ ] `app/dashboard/`
- [ ] `app/campaigns/` + `app/campaigns/[id]/`
- [ ] `app/prospects/` + `app/prospects/[id]/`
- [ ] `app/lists/` + `app/lists/[id]/` (data grid + members grid)
- [ ] `app/templates/` + `app/templates/[id]/`
- [ ] `app/conversations/`
- [ ] `app/analytics/`
- [ ] `app/settings/`
- [ ] Sidebar / top nav / layout shell
- [ ] Auth pages (sign-in, sign-up)

### Phase D — Data grid theming ✅
- [x] `components/data-grid/*` audited — **0 hardcoded color literals** (tablecn ships with shadcn tokens out of the box)
- [x] `components/ui/*` audited — **0 hex literals**; the few `bg-destructive text-white`, `bg-black/50`, `bg-white` matches are intentional shadcn primitive defaults (overlay scrims, slider thumb, destructive button)

### Phase E — Quality gates ✅
- [x] `rg "bg-\[#|text-\[#|border-\[#"` in `app/` + `components/` → **3 matches** (all LinkedIn brand blue `#0A66C2`, intentionally preserved)
- [x] `rg "text-white|text-gray-[0-9]"` in `app/` → **0 matches**; only `components/ui/badge.tsx` + `components/ui/button.tsx` use `text-white` (on `bg-destructive`, semantic-correct in both themes)
- [x] Tailwind v4 dark variant configured via `@custom-variant dark (&:is(.dark *))` in `globals.css`
- [x] `next-themes` `attribute="class"` writes `<html class="dark|light">` — both `:root` and `.dark` blocks switch correctly
- [x] Theme persists across reloads (`next-themes` uses `localStorage` by default)
- [x] TypeScript clean (`npx tsc --noEmit` — no new errors introduced)
- [ ] Visual smoke test — pending Phase C human pass

### Out of scope (deferred)
- Marketing/landing page redesign
- Brand color refresh
- Custom themes beyond light/dark (e.g., high-contrast)

---

*Theme migration plan added 2026-05-13. Owner: TBD.*

---

## 🆕 Post-Theme Feature Enhancements (2026-05-14)

| Commit | What changed | Files | Status |
|--------|-------------|-------|--------|
| `e5866d91` | **Theme: fix campaign canvas inline styles** — ReactFlow nodes now use CSS vars instead of hardcoded hex | `components/campaign-canvas.tsx` (+6/-6) | ✅ |
| `26a4eb35` | **Lists: replace grid with full tanstack data-table** — full data-table infrastructure added (`data-table/`, hooks, types, parsers, config); `/lists` now uses `data-table-lists.tsx`; `/lists/[id]` keeps grid | 19 files, +2290 lines | ✅ |
| `bdec7fa4` | **Lists: dynamic filter-rule membership (HubSpot-style segments)** — `lib/list-filters.ts` evaluates filter rules against prospects; `list-filter-builder.tsx` UI; `lists/[id]/members` API now supports dynamic membership; lists API returns member count dynamically | 7 files, +493 lines | ✅ |
| `01b0b147` | **Datasets v1 — CSV upload + browse staging workspace** — DB migration 0004 adds `datasets` table; `lib/dataset-import.ts` parses CSV; full API (`/api/datasets`, `/api/datasets/[id]`); UI at `/datasets` + `/datasets/[id]`; shadcn sidebar components added; new breadcrumb + collapsible components | 21 files, +4180 lines | ✅ |
| `5cc6b885` | **Sidebar: reorganize nav into 5 sections** — Insights / Outreach / Audience / Ops / Monitoring nav groupings in `components/app-sidebar.tsx` | 1 file, +44/-14 | ✅ |
| `2b81e6e2` | **CRM v1 — companies/contacts/deals + rename lists→segments** — migrations 0005 (CRM schema) + 0006 (lists→segments rename); full API routes for `/api/companies`, `/api/contacts`, `/api/deals` (CRUD + deal-contacts join); UI at `/companies`, `/contacts`, `/deals`; all `lists` references renamed to `segments` app-wide; workflow node improvements | 47 files, +1613 lines | ✅ |
| `394a118a` | **fix: analytics tests + grid-pattern minor** — update analytics test mocks to use `NeonHttpQueryResult` type; `grid-pattern.tsx` minor fix | 2 files, +6/-5 | ✅ |
| `912ddeda` | **docs: full README rewrite** — reflects current feature set (CRM, segments, datasets, Clerk auth, all capabilities) | `README.md` +325/-213 | ✅ |

### New Schema (migration 0005 + 0006)
- `companies` table: id, userId, name, domain, industry, size, website, linkedinUrl, createdAt, updatedAt
- `contacts` table: id, userId, companyId (FK), firstName, lastName, email, title, phone, linkedinUrl, createdAt, updatedAt
- `deals` table: id, userId, name, value, stage, closedAt, companyId (FK), createdAt, updatedAt
- migration 0006: renames `lists` → `segments` throughout schema

### Review Notes
- CRM v1 is a major capability addition — companies/contacts/deals forms a lightweight CRM layer on top of the SDR outbound motion
- lists→segments rename is a cosmetic + semantic improvement aligning with the dynamic filter-rule feature
- README rewrite suggests Netrunner is wrapping up a major milestone (documentation often signals feature completion)
- Vercel: latest deploy READY at 01:36 CDT (`ai-4wp13dixz`) — CRM + README changes deployed clean
- tanstack data-table infrastructure is now reusable across all list views (prospects, templates, etc.)
- Campaign canvas CSS-vars fix completes theme Phase C for the canvas specifically

---

*Auto-updated by farsight watchdog. Last run: 2026-05-14 06:38 UTC (Claude Code stopped, 2 min since last commit `912ddeda` — within 30min threshold, no wake event sent)*
