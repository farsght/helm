# AI-SDR Implementation Checklist

> Maintained by **farsight** (automated watchdog). Updated as Netrunner commits code.
> Last updated: 2026-05-14 00:08 UTC

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
- Health check endpoint — `/api/health` ✅
- Error surfacing — all client components ✅

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
| Vercel deployment | ✅ | https://ai-sdr-mocha.vercel.app (READY 16:39 CDT) |

---

## 🎉 Implementation Complete

All P1 and P2 gaps resolved. App is fully functional end-to-end with:
- Complete Clerk auth + user data isolation
- All CRUD endpoints working
- AI-powered suggest-reply
- Health check endpoint
- Clean error surfacing in all client components
- Clean Vercel deployment (latest: `ai-qu4ykijs2-farsght.vercel.app` READY)

---

*Auto-updated by farsight watchdog (every 15 min). Last run: 2026-05-14 00:08 UTC (impl complete — Claude stopped as expected, no pending work)
