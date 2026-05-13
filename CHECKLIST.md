# AI-SDR Implementation Checklist

> Maintained by **farsight** (automated watchdog). Updated as Netrunner commits code.
> Last updated: 2026-05-13 16:05 UTC

---

## Status Key
- ⬜ Not started
- 🔄 In progress (Netrunner active)
- ✅ Complete
- ❌ Skipped / deferred

---

## 🔄 Currently In Progress — Clerk Auth + Multi-Tenancy

**Netrunner is actively implementing:**
- Clerk authentication (sign-in, sign-up, session management)
- All data models scoped to a logged-in user (userId / orgId on every table)
- This touches: campaigns, prospects, lists, templates, conversations, settings, analytics

This is a foundational change — everything in the database will be user-scoped after this lands. Do not build on top of the current unauth'd APIs until this is merged.

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

## 🔍 Live App Audit — What's Working vs. Broken

*Audited 2026-05-13 against https://ai-sdr-mocha.vercel.app*

### ✅ Working End-to-End

| Area | Status | Notes |
|------|--------|-------|
| Dashboard `/` | ✅ | Real data — stats, charts, active campaigns list |
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

> ⚠️ Hold on P1+ items until Clerk auth lands — all new endpoints need to be user-scoped from the start.

### P0 — Unblocks entire app (fix these immediately)

1. **Fix SSR crashes on `/campaigns/:id` and `/prospects/:id`**
   - Root cause: likely `NEXT_PUBLIC_APP_URL` not set in Vercel, so server components can't self-call APIs
   - Fix: pass the base URL as an env var OR switch page components to direct DB calls

2. **Build `GET /api/settings`** (and sub-routes)
   - `GET/PUT /api/settings/general` — name, timezone, webhookUrl
   - `GET/PUT /api/settings/sending` — dailyLimit, sendingWindow, timezone
   - `GET/PUT /api/settings/ai` — model, persona, temperature
   - `GET/PUT /api/email-accounts` — SMTP config (stub or real)

### P1 — Core feature parity (after Clerk lands)

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
| Clerk auth + user-scoping | 🔄 | **In progress — Netrunner active** |
| SSR crash fixes | ⬜ | Blocked on understanding root cause |
| Settings API | ⬜ | |
| Vercel deployment green | ✅ | https://ai-sdr-mocha.vercel.app |

---

*Auto-updated by farsight watchdog (every 15 min). Last run: 2026-05-13 16:05 UTC*
