# AI-SDR Implementation Checklist

> Maintained by **farsight** (automated watchdog). Updated as Netrunner commits code.
> Last updated: 2026-05-13

---

## Status Key
- ⬜ Not started
- 🔄 In progress
- ✅ Complete
- ❌ Skipped / deferred

---

## Phase 1 — Critical Fixes (app is broken without these)

| # | Gap | Status | Commit | Notes |
|---|-----|--------|--------|-------|
| GAP-01 | Workflow Save Breaks All Edge Connections | ⬜ | — | Fix ID mapping after node re-insert |
| GAP-02 | "New Campaign" Button Has No Handler | ⬜ | — | Wire to POST /api/campaigns |
| GAP-03 | "Add Prospects" Button in Campaign Detail Is Inert | ⬜ | — | Wire to enrollment endpoint |
| GAP-04 | Wait Node Throws Error, Marking Prospects as Failed | ⬜ | — | Fix wait node duration handling |

---

## Phase 2 — High Priority Features

| # | Gap | Status | Commit | Notes |
|---|-----|--------|--------|-------|
| GAP-05 | Missing Individual Prospect Endpoints (GET / PUT / DELETE) | ⬜ | — | Create app/api/prospects/[id]/route.ts |
| GAP-06 | No Way to Add Prospects to a List | ⬜ | — | POST/DELETE on list members |
| GAP-07 | Conversations API Returns All Prospect Messages | ⬜ | — | Scope by conversation, not prospect |
| GAP-08 | Reply Route Uses Wrong Message for Channel | ⬜ | — | Use most recent message |
| GAP-09 | Campaign List Pause/Start Buttons Inert | ⬜ | — | Wire activate/pause endpoints |
| GAP-10 | Cross-Campaign Analytics Returns Hardcoded Data | ⬜ | — | Real DB queries |
| GAP-11 | A/B Variant Stats Never Updated | ⬜ | — | Track sends/opens/replies per variant |
| GAP-12 | Email Open/Reply Tracking Never Sets Fields | ⬜ | — | openedAt / repliedAt fields |
| GAP-13 | No Campaign-to-List Prospect Enrollment Flow | ⬜ | — | Enrollment modal + endpoint |

---

## Phase 3 — Polish & Completeness

| # | Gap | Status | Commit | Notes |
|---|-----|--------|--------|-------|
| GAP-14 | Campaign Analytics Chart Uses Unix Timestamps | ⬜ | — | Fix date comparison |
| GAP-15 | Dashboard "Change" Percentages Are Hardcoded | ⬜ | — | Real period-over-period calcs |
| GAP-16 | Email Account Credentials Stored in Plaintext | ⬜ | — | Encrypt or use env vars |
| GAP-17 | No Prospect Tags API or UI | ⬜ | — | Tags table + endpoints |
| GAP-18 | Campaign "Settings" Tab Is a Placeholder | ⬜ | — | Build settings form |
| GAP-19 | Analytics avgTimeHours Is Math.random() | ⬜ | — | Real avg calculation |
| GAP-20 | Missing Template Delete Button | ⬜ | — | Add delete to templates UI |
| GAP-21 | No Pagination on Prospects List | ⬜ | — | Add page/limit/search params |
| GAP-22 | Reply Webhook Uses First Message | ⬜ | — | Fix to use most recent message |

---

## Extras (from task prompt)

| Item | Status | Commit | Notes |
|------|--------|--------|-------|
| SMTP stub (`lib/email-sender.ts`) | ⬜ | — | console.log only, no real sending |
| LinkedIn OAuth flow (`app/api/auth/linkedin/`) | ⬜ | — | Full OAuth + token storage |
| LinkedIn sender stub (`lib/linkedin-sender.ts`) | ⬜ | — | console.log stub |
| LinkedIn Settings UI section | ⬜ | — | Connect/disconnect in Accounts tab |
| Cron endpoint (`app/api/cron/route.ts`) | ⬜ | — | Process pending workflow steps every 5 min |
| vercel.json cron config | ⬜ | — | `"crons": [{ "path": "/api/cron", "schedule": "*/5 * * * *" }]` |

---

## Build & Deploy

| Step | Status | Notes |
|------|--------|-------|
| `npm run build` exits 0 (no TS errors) | ⬜ | Required before push |
| All 22 gaps committed to `phase-1-critical-fixes` branch | ⬜ | |
| Vercel deployment green | ⬜ | https://vercel.com/farsght/ai-sdr |

---

## Review Notes

*farsight code review observations will appear here as commits land.*

---

*This file is auto-updated by farsight's watchdog cron (every 15 min). Do not edit manually — changes will be overwritten.*
