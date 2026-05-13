# AI-SDR Implementation Checklist

> Maintained by **farsight** (automated watchdog). Updated as Netrunner commits code.
> Last updated: 2026-05-13 17:53 UTC

---

## Status Key
- ⬜ Not started
- 🔄 In progress (Netrunner active)
- ✅ Complete
- ❌ Skipped / deferred

---

## 🔄 Currently In Progress — Schema userId Fixes

**Netrunner needs to action:**
- See `USER_SCOPING_SPEC.md` — add `userId` to `settings`, `tags`, `messages` tables
- Run `npm run db:generate && npm run db:migrate`

---

## Phase 1–3 + Extras ✅ All Done

All 22 gaps implemented in `905eaae7`. See earlier checklist entries.

---

## Post-Implementation Fixes (Clerk Auth + SSR)

| Commit | What changed | Status |
|--------|-------------|--------|
| `9d480b2f` | Lazy DB init — allow build without DATABASE_URL | ✅ |
| `e9b0d57e` | Fix TS build errors, rename middleware → proxy | ✅ |
| `d468df16` | Fix ownership-check select mocks (prospects, lists, templates) | ✅ |
| `3402b306` | Scope dashboard to userId, single-query chart data, Clerk auth guard | ✅ |
| `d7845dce` | **Remove server-side DB calls from all pages → fixes SSR 500 crashes** | ✅ |
| `a0cec375` | Fix tests after server-component + dashboard refactor (test-only commit) | ✅ |

---

## 🔍 Live App Audit — Updated Status

*Re-evaluated after `d7845dce` landed*

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

### 🔴 Still Broken / Missing

| Area | Issue | Priority |
|------|-------|----------|
| `settings` table | No `userId` — global store, all users share settings | **P0** — see USER_SCOPING_SPEC.md |
| `tags` table | No `userId` — tags are global across users | **P0** — see USER_SCOPING_SPEC.md |
| `messages` table | No `userId` — ownership via join only | **P0** — see USER_SCOPING_SPEC.md |
| `GET /api/settings` | Still 404 — settings API not built yet | P0 |
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
| `settings` | ❌ | **Needs fix — see USER_SCOPING_SPEC.md** |
| `tags` | ❌ | **Needs fix — see USER_SCOPING_SPEC.md** |
| `messages` | ❌ | **Needs fix — see USER_SCOPING_SPEC.md** |
| `workflowNodes` | n/a | OK — cascades via campaigns |
| `workflowEdges` | n/a | OK — cascades via campaigns |
| `campaignProspects` | n/a | OK — cascades via both |
| `listMembers` | n/a | OK — cascades via lists |
| `templateVariants` | n/a | OK — cascades via templates |
| `tasks` | n/a | OK — cascades via campaignProspects |
| `prospectTags` | n/a | OK once tags.userId fixed |

---

## Build & Deploy

| Step | Status | Notes |
|------|--------|-------|
| All 22 gaps | ✅ | `905eaae7` |
| Clerk auth + ownership | ✅ | Multiple commits |
| SSR crash fixes | ✅ | `d7845dce` |
| Test suite fixes | ✅ | `a0cec375` |
| Schema userId gaps | ⬜ | See USER_SCOPING_SPEC.md |
| Settings API | ⬜ | |
| `POST /api/prospects` fix | ⬜ | |
| Vercel deployment | ✅ | https://ai-sdr-mocha.vercel.app (READY 12:43 CDT) |

---

*Auto-updated by farsight watchdog (every 15 min). Last run: 2026-05-13 17:53 UTC*
