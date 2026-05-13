# AI-SDR Implementation Checklist

> Maintained by **farsight** (automated watchdog). Updated as Netrunner commits code.
> Last updated: 2026-05-13 21:08 UTC

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

## ✅ Full Working End-to-End Status

- Dashboard — real data, user-scoped ✅
- `/campaigns` list — renders with `prospectCount` + `stepCount` ✅
- `/campaigns/:id` — no longer 500s ✅
- `/campaigns/:id/steps` — sequence tab populated ✅
- `/prospects` table — paginated, user-scoped ✅
- `/prospects/:id` — no longer 500s ✅
- `POST /api/prospects` — create prospect working ✅
- `/lists` — `memberCount` included ✅
- `/templates` + `/templates/:id` — full A/B variant management ✅
- `POST /api/templates` — create template working ✅
- `/conversations` — thread view, reply send, Clerk-auth'd ✅
- `/analytics` — core KPIs real ✅
- Settings API — general + linkedin, fully user-scoped ✅
- AI suggest-reply — gpt-4o-mini powered ✅

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
| Vercel deployment | ✅ | https://ai-sdr-mocha.vercel.app (READY 15:28 CDT) |

---

## 🎉 Implementation Complete

All P1 and P2 gaps resolved. App is fully functional end-to-end with:
- Complete Clerk auth + user data isolation
- All CRUD endpoints working
- AI-powered suggest-reply
- Clean Vercel deployment

---

*Auto-updated by farsight watchdog (every 15 min). Last run: 2026-05-13 21:08 UTC (impl complete — watchdog standing down)*
