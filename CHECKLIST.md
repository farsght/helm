# AI-SDR Implementation Checklist

> Maintained by **farsight** (automated watchdog). Updated as Netrunner commits code.
> Last updated: 2026-05-13 16:23 UTC

---

## Status Key
- ⬜ Not started
- 🔄 In progress (Netrunner active)
- ✅ Complete
- ❌ Skipped / deferred

---

## 🔄 Currently In Progress — Remaining P0/P1 Fixes

**Clerk auth + user-scoping is now merged.** Netrunner is working on remaining P0/P1 items:
- SSR crash fixes (`/campaigns/:id`, `/prospects/:id`, `/campaigns/new`)
- Settings API build-out
- `POST /api/prospects`, `POST /api/templates`, `PUT /api/campaigns/:id` fixes

---

## Phase 1 — Critical Fixes ✅ All Done

| # | Gap | Status | Commit |
|---|-----|--------|--------|
| GAP-01 | Workflow Save Breaks All Edge Connections | ✅ | `905eaae7` |
| GAP-02 | "New Campaign" Button Has No Handler | ✅ | `905eaae7` |
| GAP-03 | "Add Prospects" Button in Campaign Detail Is Inert | ✅ | `905eaae7` |
| GAP-04 | Wait Node Throws Error, Marking Prospects as Failed | ✅ | `905eaae7` |

---

## Phase 2 — High Priority Features ✅ All Done

| # | Gap | Status | Commit |
|---|-----|--------|--------|
| GAP-05 | Missing Individual Prospect Endpoints (GET / PUT / DELETE) | ✅ | `905eaae7` |
| GAP-06 | No Way to Add Prospects to a List | ✅ | `905eaae7` |
| GAP-07 | Conversations API Returns All Prospect Messages | ✅ | `905eaae7` |
| GAP-08 | Reply Route Uses Wrong Message for Channel | ✅ | `905eaae7` |
| GAP-09 | Campaign List Pause/Start Buttons Inert | ✅ | `905eaae7` |
| GAP-10 | Cross-Campaign Analytics Returns Hardcoded Data | ✅ | `905eaae7` |
| GAP-11 | A/B Variant Stats Never Updated | ✅ | `905eaae7` |
| GAP-12 | Email Open/Reply Tracking Never Sets Fields | ✅ | `905eaae7` |
| GAP-13 | No Campaign-to-List Prospect Enrollment Flow | ✅ | `905eaae7` |

---

## Phase 3 — Polish & Completeness ✅ All Done

| # | Gap | Status | Commit |
|---|-----|--------|--------|
| GAP-14 | Campaign Analytics Chart Uses Unix Timestamps | ✅ | `905eaae7` |
| GAP-15 | Dashboard "Change" Percentages Are Hardcoded | ✅ | `905eaae7` |
| GAP-16 | Email Account Credentials Stored in Plaintext | ✅ | `905eaae7` |
| GAP-17 | No Prospect Tags API or UI | ✅ | `905eaae7` |
| GAP-18 | Campaign "Settings" Tab Is a Placeholder | ✅ | `905eaae7` |
| GAP-19 | Analytics avgTimeHours Is Math.random() | ✅ | `905eaae7` |
| GAP-20 | Missing Template Delete Button | ✅ | `905eaae7` |
| GAP-21 | No Pagination on Prospects List | ✅ | `905eaae7` |
| GAP-22 | Reply Webhook Uses First Message | ✅ | `905eaae7` |

---

## Extras ✅ All Done

| Item | Status | Commit |
|------|--------|--------|
| SMTP stub (`lib/email-sender.ts`) | ✅ | `905eaae7` |
| LinkedIn OAuth flow | ✅ | `905eaae7` |
| LinkedIn sender stub | ✅ | `905eaae7` |
| Cron endpoint (`app/api/cron/route.ts`) | ✅ | `905eaae7` |
| vercel.json cron config (`*/5 * * * *`) | ✅ | `905eaae7` |
| Lazy DB init (allow build without DATABASE_URL) | ✅ | `9d480b2f` |

---

## Phase 4 — Clerk Auth + Multi-Tenancy ✅ Landed

| Item | Status | Commit | Notes |
|------|--------|--------|-------|
| Clerk sign-in page (`app/sign-in/[[...sign-in]]/`) | ✅ | `e9b0d57e` | |
| Clerk sign-up page (`app/sign-up/[[...sign-up]]/`) | ✅ | `e9b0d57e` | |
| Clerk middleware → proxy (`proxy.ts`) | ✅ | `e9b0d57e` | Renamed from `middleware.ts` |
| DB migration — userId on all tables | ✅ | `e9b0d57e` | `db/migrations/0001_fair_mother_askani.sql` (+192 lines) |
| All API routes scoped to userId (ownership checks) | ✅ | `e9b0d57e` | campaigns, prospects, lists, templates, conversations, workflow |
| Clerk layout wrapper (`app/layout.tsx`) | ✅ | `e9b0d57e` | |
| `package.json` — Clerk SDK + Vitest added | ✅ | `e9b0d57e` | |
| Comprehensive test suite (15 files, ~2,500 lines) | ✅ | `e9b0d57e` | Unit + integration coverage across all routes |
| Test mock fixes (ownership-check select mocks) | ✅ | `d468df16` | |
| USER_SCOPING_SPEC.md (+181 lines) | ✅ | `8eb1c838` | farsight schema fix spec for userId on settings, tags, messages |
| Dashboard analytics scoped to userId | ✅ | `3402b306` | `app/api/analytics/dashboard/route.ts` — single-query chart data |

---

## 🔍 Live App Audit — What's Working vs. Broken

*Audited 2026-05-13 against https://ai-sdr-mocha.vercel.app*
*Vercel: 3 deployments READY as of 16:21 UTC*

### ✅ Working End-to-End

| Area | Status | Notes |
|------|--------|-------|
| Dashboard `/` | ✅ | Real data — stats, charts, active campaigns list; now user-scoped |
| Campaign list `/campaigns` | ✅ | Renders real data, pause/start buttons visible |
| Prospects table `/prospects` | ✅ | 11 real prospects, search renders |
| Lists `/lists` | ✅ | Cards + modal view with members |
| Templates `/templates` | ✅ | List + detail page work |
| Template detail `/templates/:id` | ✅ | A/B variant management fully works |
| Conversations `/conversations` | ✅ | Thread view, reply send, status update |
| Analytics `/analytics` | ✅ (partial) | Core KPIs + trend chart real; some charts empty |
| `GET /api/campaigns` | ✅ | |
| `GET /api/campaigns/:id` | ✅ | |
| `POST /api/campaigns` | ✅ | Creates campaign (201) |
| `DELETE /api/campaigns/:id` | ✅ | |
| `GET /api/prospects` | ✅ | Paginated with total/page/pages |
| `GET/PUT/DELETE /api/prospects/:id` | ✅ | |
| `GET/PUT/DELETE /api/templates/:id` | ✅ | |
| `GET/POST /api/templates/:id/variants` | ✅ | |
| `GET /api/conversations` | ✅ | |
| `GET/PUT /api/conversations/:id` | ✅ | |
| `POST /api/conversations/:id/reply` | ✅ | |
| `GET /api/analytics/overview` | ✅ | Full metrics + chart data |
| `GET /api/analytics/dashboard` | ✅ | Now userId-scoped, single-query |

### 🔴 Broken / Missing

| Area | Issue | Priority |
|------|-------|----------|
| Campaign detail `/campaigns/:id` | **HTTP 500 crash** — SSR page component fails | P0 |
| Prospect detail `/prospects/:id` | **HTTP 500 crash** — same root cause | P0 |
| New campaign wizard `/campaigns/new` | **HTTP 500 crash** | P0 |
| Settings `/settings` | **Infinite load** — `GET /api/settings` → 404 | P0 |
| `GET /api/settings` | **404** — entire settings system missing | P0 |
| `POST /api/prospects` | **500** — Add Prospect broken | P1 |
| `POST /api/templates` | **500** — Create Template broken | P1 |
| `PUT /api/campaigns/:id` | **500** — Can't save campaign edits | P1 |
| `GET /api/campaigns/:id/steps` | **404** — Campaign sequence tab has no data | P1 |
| `POST /api/prospects/:id/enroll` | **404** — Can't enroll prospects in campaigns | P1 |
| `POST /api/ai/suggest-reply` | **404** — "Get AI Suggestion" button broken | P2 |
| `GET /api/analytics/campaigns/:id` | **500** — Per-campaign analytics broken | P2 |
| Analytics: industry/title/heatmap charts | **Empty** — endpoints return 0s | P3 |
| `POST /api/prospects/import` | **400** — CSV import broken (bad schema) | P3 |
| `PATCH /api/campaigns/:id` | **405** — Wrong method (use PUT) | Fix |

---

## 🗺️ What Needs to Be Built Next

### P0 — Unblocks entire app (fix these immediately)

1. **Fix SSR crashes on `/campaigns/:id` and `/prospects/:id`**
   - Root cause: likely `NEXT_PUBLIC_APP_URL` not set in Vercel, so server components can't self-call APIs
   - Fix: pass the base URL as an env var OR switch page components to direct DB calls

2. **Build `GET /api/settings`** (and sub-routes)
   - `GET/PUT /api/settings/general` — name, timezone, webhookUrl
   - `GET/PUT /api/settings/sending` — dailyLimit, sendingWindow, timezone
   - `GET/PUT /api/settings/ai` — model, persona, temperature
   - `GET/PUT /api/email-accounts` — SMTP config (stub or real)

### P1 — Core feature parity

3. **Fix `POST /api/prospects`** — required field validation failing
4. **Fix `POST /api/templates`** — same issue
5. **Fix `PUT /api/campaigns/:id`** — likely schema mismatch on update
6. **Build `GET/POST /api/campaigns/:id/steps`** — sequence builder tab
7. **Build `POST /api/prospects/:id/enroll`** — enroll prospect into campaign

### P2 — AI features

8. **`POST /api/ai/suggest-reply`** — OpenAI call using conversation context
9. **`POST /api/ai/compose`** — AI-drafted outreach

### P3 — Analytics depth

10. **Fix `GET /api/analytics/campaigns/:id`** — currently 500
11. **Real data for** industry/title/heatmap charts

---

## Build & Deploy

| Step | Status | Notes |
|------|--------|-------|
| All 22 gaps committed | ✅ | `905eaae7` |
| Lazy DB init fix | ✅ | `9d480b2f` |
| Clerk auth + user-scoping | ✅ | `e9b0d57e` — fully landed |
| Comprehensive test suite | ✅ | `e9b0d57e` — 15 test files, ~2,500 lines |
| Dashboard userId scope | ✅ | `3402b306` |
| SSR crash fixes | ⬜ | Next up |
| Settings API | ⬜ | Next up |
| Vercel deployment green | ✅ | https://ai-sdr-mocha.vercel.app — 3 READY |

---

## 📝 Review Notes

### `e9b0d57e` — Clerk Auth + Full Test Suite (2026-05-13 16:13)
- **Massive commit** — Clerk fully wired: `ClerkProvider` in layout, `currentUser()` on every API route, ownership enforcement before any data mutation
- DB migration adds `userId` column to all tables — ensures multi-tenancy at the data layer
- `middleware.ts` → `proxy.ts` rename is intentional (avoids Next.js auto-middleware pickup conflicts with Clerk's own middleware)
- Test suite is thorough: mocks Clerk's `currentUser()`, tests 401 on unauthenticated calls, tests ownership 403 on foreign resources
- `vitest.config.ts` + `vitest.setup.ts` added — clean Vitest config with jsdom

### `3402b306` — Dashboard userId scope (2026-05-13 16:20)
- `app/api/analytics/dashboard/route.ts` refactored to single DB query (was N+1)
- All stats filtered by `userId` from Clerk — dashboard now shows only the logged-in user's data

### `8eb1c838` — USER_SCOPING_SPEC.md (2026-05-13 16:19)
- farsight-authored spec noting missing userId on settings, tags, messages tables
- Provides migration guidance for those tables — Netrunner should apply before building Settings API

---

*Auto-updated by farsight watchdog (every 15 min). Last run: 2026-05-13 16:23 UTC*
