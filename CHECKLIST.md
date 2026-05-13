# AI-SDR Implementation Checklist

> Maintained by **farsight** (automated watchdog). Updated as Netrunner commits code.
> Last updated: 2026-05-13 18:08 UTC

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

---

## 🔍 Live App Audit — Updated Status

*Re-evaluated after `1103469b` landed*

### ✅ Now Fixed

| Was broken | Fix |
|---|---|
| `/campaigns/:id` → HTTP 500 | ✅ Pages converted to thin shells, client fetches |
| `/prospects/:id` → HTTP 500 | ✅ Same fix |
| `/campaigns/new` → HTTP 500 | ✅ Same fix |
| `GET /api/campaigns/:id/prospects` → 405 | ✅ Added in `d7845dce` |
| `GET /api/prospects/:id/campaigns` → 404 | ✅ Added in `d7845dce` |
| `GET /api/messages` without auth | ✅ Auth + `?campaignId` / `?prospectId` filter added |
| `/api/conversations` no auth | ✅ Clerk auth + prospect join added |
| Dashboard not user-scoped | ✅ Scoped in `3402b306` |
| Test suite failures (server-component + dashboard) | ✅ Fixed in `a0cec375` |
| `settings` table — no userId | ✅ Added in `1103469b` (migration 0002) |
| `tags` table — no userId | ✅ Added in `1103469b` (migration 0002) |
| `messages` table — no userId | ✅ Added in `1103469b` (migration 0002) |
| `GET /api/settings` → 404 | ✅ general + linkedin routes auth-guarded + user-scoped in `1103469b` |
| Campaign execute — tag find-or-create not user-scoped | ✅ Fixed in `1103469b` |

### 🔴 Still Broken / Missing

| Area | Issue | Priority |
|------|-------|----------|
| `POST /api/prospects` | Still 500 — create prospect broken | P1 |
| `POST /api/templates` | Still 500 — create template broken | P1 |
| `PUT /api/campaigns/:id` | Still 500 — update campaign broken | P1 |
| `GET /api/campaigns/:id/steps` | Still 404 — sequence tab empty | P1 |
| `POST /api/ai/suggest-reply` | Still 404 — AI suggestion broken | P2 |

### ✅ Working End-to-End (confirmed)

- Dashboard — real data, user-scoped ✅
- `/campaigns` list — renders with `prospectCount` + `stepCount` ✅
- `/campaigns/:id` — no longer 500s ✅
- `/prospects` table — paginated, user-scoped ✅
- `/prospects/:id` — no longer 500s ✅
- `/lists` — `memberCount` included ✅
- `/templates` + `/templates/:id` — full A/B variant management ✅
- `/conversations` — thread view, reply send, Clerk-auth'd ✅
- `/analytics` — core KPIs real ✅
- Settings API — general + linkedin, fully user-scoped ✅

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
| `POST /api/prospects` fix | ⬜ | Still 500 |
| `POST /api/templates` fix | ⬜ | Still 500 |
| `PUT /api/campaigns/:id` fix | ⬜ | Still 500 |
| `GET /api/campaigns/:id/steps` | ⬜ | Still 404 |
| `POST /api/ai/suggest-reply` | ⬜ | Still 404 |
| Vercel deployment | ✅ | https://ai-sdr-mocha.vercel.app (READY 13:05 CDT) |

---

*Auto-updated by farsight watchdog (every 15 min). Last run: 2026-05-13 18:08 UTC*
