# AI-SDR Implementation Checklist

> Maintained by **farsight** (automated watchdog). Updated as Netrunner commits code.
> Last updated: 2026-05-14 07:08 UTC

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
- `/lists` → `/segments` — `memberCount` included, dynamic filter-rule membership ✅
- `/templates` + `/templates/:id` — full A/B variant management ✅
- `POST /api/templates` — create template working ✅
- `/conversations` — thread view, reply send, Clerk-auth'd ✅
- `/analytics` — core KPIs real ✅
- Settings API — general + linkedin, fully user-scoped ✅
- AI suggest-reply — gpt-4o-mini powered ✅
- Health check endpoint — `/api/health` ✅
- Error surfacing — all client components ✅
- Prospect enrichment fields — `companyWebsite` + `companyLinkedinUrl` ✅
- CRM — `/companies`, `/contacts`, `/deals` (CRUD + deal-contacts join) ✅
- Datasets v2 — editable DataGrid, dynamic columns, CSV export, Add Row, bulk Delete ✅
- Pipelines v1 — ReactFlow canvas, 13 node types, save/run, run history ✅
- Notebooks v1 — monospace cell editor, per-cell JS execution (vm sandbox), Python stub ✅

---

## Schema: userId Coverage

| Table | userId | Status |
|---|---|---|
| `campaigns` | ✅ | OK |
| `lists` / `segments` | ✅ | OK |
| `prospects` | ✅ | OK |
| `conversations` | ✅ | OK |
| `templates` | ✅ | OK |
| `connectedAccounts` | ✅ | OK |
| `settings` | ✅ | Fixed in `1103469b` |
| `tags` | ✅ | Fixed in `1103469b` |
| `messages` | ✅ | Fixed in `1103469b` |
| `companies` | ✅ | Added in `2b81e6e2` |
| `contacts` | ✅ | Added in `2b81e6e2` |
| `deals` | ✅ | Added in `2b81e6e2` |
| `datasets` | ✅ | Added in `01b0b147` |
| `pipelines` | ✅ | Added in `f8d4b688` |
| `notebooks` | ✅ | Added in `f8d4b688` |
| `workflowNodes` | n/a | OK — cascades via campaigns |
| `workflowEdges` | n/a | OK — cascades via campaigns |
| `campaignProspects` | n/a | OK — cascades via both |
| `listMembers` / `segmentMembers` | n/a | OK — cascades via segments |
| `templateVariants` | n/a | OK — cascades via templates |
| `tasks` | n/a | OK — cascades via campaignProspects |
| `prospectTags` | n/a | OK — cascades via both |
| `pipelineNodes/Edges/Runs` | n/a | OK — cascades via pipelines |
| `notebookCells` | n/a | OK — cascades via notebooks |

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
| CRM v1 (companies/contacts/deals) | ✅ | `2b81e6e2` — migration 0005 |
| lists → segments rename | ✅ | `2b81e6e2` — migration 0006 |
| Datasets v1 | ✅ | `01b0b147` — migration 0004 |
| Sidebar nav reorganization | ✅ | `5cc6b885` |
| Dynamic segments (HubSpot-style filter rules) | ✅ | `bdec7fa4` |
| Datasets v2 (editable DataGrid, dynamic columns) | ✅ | `f8d4b688` |
| Pipelines v1 (ReactFlow canvas, 13 node types, run simulation) | ✅ | `f8d4b688` |
| Notebooks v1 (cell editor, JS vm sandbox execution) | ✅ | `f8d4b688` |
| Segments members test fixes | ✅ | `a7e3af43` |
| Vercel deployment | ✅ | https://ai-sdr-mocha.vercel.app (READY) |

---

## 🌓 Theme System Migration — Light/Dark Mode (shadcn pattern)

**Goal:** Replace all hardcoded color literals with shadcn semantic tokens so the entire app responds to light/dark mode via a single `class="dark"` toggle on `<html>`.

### Phase A — Foundation ✅
- [x] Audit current color literals: **647 matches** in `app/` + `components/` (baseline 2026-05-13)
- [x] Verify shadcn CSS variables are present in `app/globals.css`
- [x] **Removed conflicting `@theme` color overrides**
- [x] `next-themes` installed (`^0.4.6`)
- [x] `<Providers>` wired in `app/layout.tsx`
- [x] `ThemeToggle` component created at `components/theme-toggle.tsx`
- [x] Toggle added to sidebar footer next to `UserButton`

### Phase B — Codemod sweep ✅
Ran `scripts/theme-codemod.py --apply`. **647 → 3 hardcoded literals** (all LinkedIn brand blue `#0A66C2`, intentionally preserved).

### Phase C — Page-by-page verification (HUMAN PASS REQUIRED)
- [ ] `app/dashboard/`
- [ ] `app/campaigns/` + `app/campaigns/[id]/`
- [ ] `app/prospects/` + `app/prospects/[id]/`
- [ ] `app/segments/` (formerly lists)
- [ ] `app/templates/` + `app/templates/[id]/`
- [ ] `app/conversations/`
- [ ] `app/analytics/`
- [ ] `app/settings/`
- [ ] `app/datasets/` + `app/datasets/[id]/`
- [ ] `app/pipelines/` + `app/pipelines/[id]/`
- [ ] `app/notebooks/` + `app/notebooks/[id]/`
- [ ] `app/companies/`, `app/contacts/`, `app/deals/`
- [ ] Sidebar / top nav / layout shell
- [ ] Auth pages (sign-in, sign-up)

### Phase D — Data grid theming ✅
- [x] `components/data-grid/*` — **0 hardcoded color literals**
- [x] `components/ui/*` — **0 hex literals** (intentional primitives only)

### Phase E — Quality gates ✅
- [x] `rg "bg-\[#|text-\[#|border-\[#"` → **3 matches** (all LinkedIn brand blue, intentionally preserved)
- [x] `rg "text-white|text-gray-[0-9]"` in `app/` → **0 matches**
- [x] Tailwind v4 dark variant configured
- [x] `next-themes` `attribute="class"` confirmed working
- [x] TypeScript clean
- [ ] Visual smoke test — pending Phase C human pass

---

## 🆕 Post-Theme Feature Enhancements (2026-05-14)

| Commit | What changed | Files | Status |
|--------|-------------|-------|--------|
| `e5866d91` | **Theme: fix campaign canvas inline styles** — ReactFlow nodes use CSS vars | `components/campaign-canvas.tsx` | ✅ |
| `26a4eb35` | **Lists → full tanstack data-table** — `data-table/` infrastructure added | 19 files, +2290 lines | ✅ |
| `bdec7fa4` | **Dynamic filter-rule membership (HubSpot-style segments)** — `lib/list-filters.ts` + filter builder UI | 7 files, +493 lines | ✅ |
| `01b0b147` | **Datasets v1 — CSV upload + browse staging workspace** — migration 0004, full API + UI | 21 files, +4180 lines | ✅ |
| `5cc6b885` | **Sidebar: 5-section nav** — Insights / Outreach / Audience / Ops / Monitoring | 1 file, +44/-14 | ✅ |
| `2b81e6e2` | **CRM v1 + lists→segments rename** — migrations 0005+0006, companies/contacts/deals CRUD, full API + UI | 47 files, +1613 lines | ✅ |
| `394a118a` | **fix: analytics tests + grid-pattern** | 2 files | ✅ |
| `912ddeda` | **docs: full README rewrite** | `README.md` | ✅ |
| `f8d4b688` | **DataOps v1 — Pipelines + Notebooks + Datasets v2** — migrations for pipelines/pipelineNodes/pipelineEdges/pipelineRuns/notebooks/notebookCells; Datasets v2 editable DataGrid (dynamic column schema, pagination, Export CSV, Add Row, bulk Delete); Pipelines: ReactFlow canvas + 13 node types + run simulation + history; Notebooks: cell editor + per-cell JS vm sandbox execution | Large — many files | ✅ |
| `a7e3af43` | **test: fix segments members tests after DataOps build** — POST /api/segments/[id]/members now checks segment existence first; fixed mock bleed-through from test 1 → test 2 | Test files | ✅ |

### Review Notes (07:08 UTC)
- **DataOps v1 is massive** — Pipelines + Notebooks + Datasets v2 in a single commit (`f8d4b688`). This is a major capability milestone — ai-sdr now has a full data pipeline + notebook execution layer.
- Segments members test fix (`a7e3af43`) is a signal that Netrunner was cleaning up after the DataOps commit; Claude Code appears to have completed its session naturally (last commit 1 min before this watchdog run)
- Claude Code: NOT running at 07:08 UTC — but last commit was 07:07 UTC (1 min ago), so this is a clean stop, not a stall
- No wake event sent — within 1 min of last commit

---

## 🎉 Implementation Complete + DataOps v1

All P1/P2 gaps resolved. CRM, Segments, Datasets v2, Pipelines, and Notebooks shipped. App is a full SDR + data ops platform.

---

*Auto-updated by farsight watchdog (every 15 min). Last run: 2026-05-14 07:08 UTC (Claude Code stopped cleanly — last commit 1 min ago `a7e3af43` — no action taken)*
