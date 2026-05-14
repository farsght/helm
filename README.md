# Helm — the operating layer for Bitwage marketing

AI-powered Sales Development Representative tool that automates multi-channel outreach via email and LinkedIn. Features a visual canvas workflow builder, CRM, prospect database, segmentation, datasets, and AI-assisted messaging.

**Live:** [ai-sdr-mocha.vercel.app](https://ai-sdr-mocha.vercel.app)

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Auth:** Clerk (user isolation — all data scoped to `userId`)
- **UI:** shadcn/ui, Tailwind CSS v4, CSS custom properties theme
- **Database:** Neon Postgres + Drizzle ORM
- **Canvas:** React Flow (@xyflow/react)
- **AI:** OpenAI gpt-4o-mini (message generation, suggest-reply)
- **Testing:** Vitest + React Testing Library (123 tests)

---

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in .env.local (see Environment Variables below)
npm run db:generate
npm run db:migrate
npm run dev          # http://localhost:3000
```

---

## Environment Variables

```bash
# Database (Neon — use pooled endpoint for serverless)
DATABASE_URL=postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require

# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# LinkedIn OAuth (for account connection)
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=https://yourdomain.com/api/auth/linkedin/callback

# OpenAI
OPENAI_API_KEY=sk-...
```

---

## Project Structure

```
helm/
├── app/
│   ├── api/                    # API routes (all Clerk-auth'd, userId-scoped)
│   │   ├── ai/                 # suggest-reply, ai-generate
│   │   ├── analytics/          # dashboard, campaigns/[id], cross-campaign
│   │   ├── auth/linkedin/      # OAuth flow (callback)
│   │   ├── campaigns/          # CRUD + activate/pause/execute/workflow/steps/prospects
│   │   ├── companies/          # CRM companies CRUD
│   │   ├── contacts/           # CRM contacts CRUD
│   │   ├── conversations/      # inbox threads + reply
│   │   ├── cron/               # workflow execution engine (public — called by scheduler)
│   │   ├── datasets/           # CSV dataset upload + browse
│   │   ├── deals/              # CRM deals CRUD + contacts
│   │   ├── health/             # health check (/api/health)
│   │   ├── messages/           # outbound messages + send + ai-reply
│   │   ├── prospects/          # CRUD + import + campaigns history
│   │   ├── segments/           # audience segments CRUD + members
│   │   ├── settings/           # accounts, general, linkedin
│   │   ├── templates/          # CRUD + variants + set-winner
│   │   └── webhooks/email/     # open/click/reply tracking
│   ├── analytics/              # Analytics page
│   ├── campaigns/[id]/         # Campaign detail (canvas, prospects, messages, analytics)
│   ├── campaigns/              # Campaign list
│   ├── companies/              # CRM companies
│   ├── contacts/               # CRM contacts
│   ├── conversations/          # Inbox
│   ├── datasets/[id]/          # Dataset detail
│   ├── datasets/               # Dataset browser
│   ├── deals/                  # CRM deals
│   ├── prospects/[id]/         # Prospect detail
│   ├── prospects/              # Prospect table
│   ├── segments/[id]/          # Segment detail + members
│   ├── segments/               # Audience segments
│   ├── settings/               # Settings
│   ├── sign-in/                # Clerk sign-in
│   ├── sign-up/                # Clerk sign-up
│   ├── templates/[id]/         # Template detail + A/B variants
│   ├── templates/              # Templates list
│   ├── layout.tsx              # Root layout (ClerkProvider + sidebar)
│   └── page.tsx                # Dashboard
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── workflow/               # Canvas node types + config panel
│   ├── campaign-canvas.tsx     # React Flow canvas
│   └── sidebar.tsx             # Nav sidebar (Insights/Outreach/Audience/Ops/Monitoring)
├── db/
│   ├── schema.ts               # 22-table Drizzle schema
│   ├── index.ts                # Neon serverless connection (lazy init)
│   ├── migrate.ts              # Migration runner
│   └── migrations/             # Generated SQL migrations
├── lib/
│   ├── api.ts                  # apiFetch helper (surfaces server error messages)
│   ├── crypto.ts               # AES-256-GCM encryption (SMTP credentials)
│   ├── email-sender.ts         # SMTP email stub (console.log)
│   ├── linkedin-sender.ts      # LinkedIn message stub (console.log)
│   └── webhook.ts              # Outbound webhook firing
├── __tests__/                  # 123 Vitest tests
│   ├── api/                    # API route tests
│   ├── components/             # Component tests (React Testing Library)
│   ├── integration/            # End-to-end flow tests
│   └── lib/                    # Unit tests
├── .agents/skills/             # Clerk agent skills (19 installed)
├── proxy.ts                    # Clerk middleware (protects all routes)
├── vitest.config.ts
├── vitest.setup.ts
└── drizzle.config.ts
```

---

## Database Schema (22 tables)

### Outreach
| Table | Description |
|---|---|
| `campaigns` | Campaign definitions (status: draft/active/paused/completed) |
| `workflow_nodes` | Canvas nodes (email, linkedin_message, wait, condition, tag, etc.) |
| `workflow_edges` | Node connections with condition support |
| `campaign_prospects` | Prospect enrollment + execution state + nextRunAt |
| `messages` | Sent/received messages with open/click/reply tracking |
| `conversations` | Inbox threads (status: new/in_progress/interested/meeting_booked) |
| `tasks` | Manual task nodes awaiting human action |

### Audience
| Table | Description |
|---|---|
| `prospects` | Contact database (firstName, lastName, email, company, title, linkedinUrl, companyWebsite, companyLinkedinUrl, industry, location, phone, customFields) |
| `segments` | Audience segments (static or dynamic with filter rules) |
| `segment_members` | Prospect↔segment membership |
| `tags` | Prospect tags (user-scoped) |
| `prospect_tags` | Tag assignments |

### Content
| Table | Description |
|---|---|
| `templates` | Email/LinkedIn message templates with variable support |
| `template_variants` | A/B test variants with send/open/reply/click counts |

### CRM
| Table | Description |
|---|---|
| `companies` | Company records |
| `contacts` | CRM contacts (separate from SDR prospects) |
| `deals` | Deal pipeline |
| `deal_contacts` | Deal↔contact relationships |

### Data
| Table | Description |
|---|---|
| `datasets` | Uploaded CSV datasets (staging workspace) |
| `dataset_rows` | Individual rows from uploaded CSVs |

### Settings
| Table | Description |
|---|---|
| `connected_accounts` | Email/LinkedIn accounts (SMTP config, OAuth tokens) |
| `settings` | Key-value settings store (user-scoped) |

All tables include `userId` for full multi-tenant data isolation via Clerk.

---

## API Reference

### Campaigns
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/campaigns` | List / create |
| GET/PUT/DELETE | `/api/campaigns/[id]` | Read / update / delete |
| GET/PUT | `/api/campaigns/[id]/workflow` | Workflow nodes + edges |
| GET | `/api/campaigns/[id]/steps` | Workflow steps (nodes) |
| POST | `/api/campaigns/[id]/activate` | Set status → active |
| POST | `/api/campaigns/[id]/pause` | Set status → paused |
| GET/POST | `/api/campaigns/[id]/prospects` | Enrolled prospects / enroll |
| POST | `/api/campaigns/[id]/execute` | Run execution tick |

### Prospects
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/prospects` | List (paginated, searchable) / create |
| GET/PUT/DELETE | `/api/prospects/[id]` | Read / update / delete |
| POST | `/api/prospects/import` | Bulk CSV import |
| GET | `/api/prospects/[id]/campaigns` | Campaign history |

### Segments
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/segments` | List / create |
| GET/PUT/DELETE | `/api/segments/[id]` | Read / update / delete |
| GET/POST/DELETE | `/api/segments/[id]/members` | Members / add / remove |

### CRM
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/companies` | Companies list / create |
| GET/PUT/DELETE | `/api/companies/[id]` | Company CRUD |
| GET/POST | `/api/contacts` | Contacts list / create |
| GET/PUT/DELETE | `/api/contacts/[id]` | Contact CRUD |
| GET/POST | `/api/deals` | Deals list / create |
| GET/PUT/DELETE | `/api/deals/[id]` | Deal CRUD |
| GET/POST | `/api/deals/[id]/contacts` | Deal↔contact relationships |

### Templates
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/templates` | List / create |
| GET/PUT/DELETE | `/api/templates/[id]` | Read / update / delete |
| GET/POST | `/api/templates/[id]/variants` | A/B variants |
| PUT | `/api/templates/[id]/variants/[variantId]` | Update variant |
| POST | `/api/templates/[id]/variants/[variantId]/set-winner` | Promote winner |

### Conversations & Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/conversations` | Inbox list |
| GET | `/api/conversations/[id]` | Thread detail |
| POST | `/api/conversations/[id]/reply` | Send reply |
| GET | `/api/messages` | Messages (filterable by campaignId/prospectId) |
| POST | `/api/messages/send` | Send message |
| POST | `/api/messages/ai-generate` | Generate message with AI |
| POST | `/api/messages/ai-reply` | AI reply suggestion |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/suggest-reply` | gpt-4o-mini reply suggestion |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | KPIs + chart data + campaign performance |
| GET | `/api/analytics/campaigns/[id]` | Per-campaign analytics |
| GET | `/api/analytics/cross-campaign` | Reply rate by industry |

### Datasets
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/datasets` | List / upload |
| GET/DELETE | `/api/datasets/[id]` | Read / delete |

### Auth & Settings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/auth/linkedin` | Initiate LinkedIn OAuth |
| GET | `/api/auth/linkedin/callback` | OAuth callback |
| GET/POST | `/api/settings/general` | General settings |
| GET | `/api/settings/accounts` | Connected accounts |
| POST | `/api/settings/accounts` | Add account |
| DELETE | `/api/settings/accounts/[id]` | Remove account |
| GET | `/api/settings/linkedin` | LinkedIn connection status |

### System
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check (auth + DB status) |
| POST | `/api/cron` | Workflow execution tick (public) |
| POST | `/api/webhooks/email` | Email open/click/reply tracking |

---

## Workflow Canvas — Node Types

| Node | Description |
|---|---|
| `email` | Send email via SMTP |
| `linkedin_message` | Send LinkedIn message |
| `linkedin_connection` | Send connection request |
| `linkedin_profile_view` | View profile (warms up) |
| `wait` | Delay (duration + unit) |
| `condition` | Branch on open/click/reply |
| `ai_decision` | AI-powered routing |
| `manual_task` | Human action required |
| `tag` | Apply/remove prospect tag |
| `move_to_campaign` | Enroll in another campaign |
| `end` | Mark prospect complete |

---

## Sidebar Navigation

```
Insights        → Dashboard, Analytics
Outreach        → Campaigns, Conversations, Templates
Audience        → Prospects, Segments, Datasets
CRM             → Companies, Contacts, Deals
Ops             → Settings
```

---

## Authentication

All routes protected by Clerk via `proxy.ts`. Public routes:
- `/sign-in`, `/sign-up`
- `/api/webhooks/email` (tracking pixel callbacks)
- `/api/cron` (internal scheduler)
- `/api/health` (monitoring)

Every DB query is filtered by `userId` from `auth()` — no cross-user data leakage.

---

## Development

```bash
npm run dev            # Dev server (Turbopack, port 3000)
npm run build          # Production build
npm test               # Vitest (123 tests)
npm run test:watch     # Watch mode
npm run db:generate    # Generate migration after schema change
npm run db:migrate     # Apply migrations
npm run db:studio      # Drizzle Studio
```

---

## Deployment (Vercel)

Push to `main` → auto-deploy. Required env vars in Vercel project settings:

```
DATABASE_URL          (Neon pooled endpoint — required for serverless)
OPENAI_API_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
LINKEDIN_REDIRECT_URI
```

> **Note:** Use the Neon **pooled** connection endpoint (`-pooler` in the hostname) for serverless compatibility. The direct endpoint can time out on cold starts.

---

## What's Stubbed / In Progress

| Feature | Status |
|---|---|
| SMTP email sending | Stub (console.log) — awaiting ENCRYPTION_KEY env var + user SMTP setup |
| LinkedIn message sending | Stub (console.log) — OAuth token captured, API calls pending |
| Workflow execution engine | `/api/cron` route exists, logic in `execute/route.ts` — needs scheduler |
| PhantomBuster integration | Planned — LinkedIn scraping via PB API |
| Prospect enrichment | Planned — Proxycurl or PB |
| CSV import | Route exists at `/api/prospects/import` |

---

## License

Private — © farsght
