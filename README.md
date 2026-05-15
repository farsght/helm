# Helm

The operating layer for Bitwage / Paystand marketing. A unified workspace for outbound campaigns, audience and CRM, content pipelines, and AI agents — all running on the same data plane.

**Live:** https://helm.gs

---

## What Helm is

Helm started as a campaign tool and grew into the centralized platform marketing runs on. Today it covers:

- **Outreach** — Visual canvas campaigns, multi-channel (email + LinkedIn), A/B variants, conversation inbox.
- **Audience** — Prospects, segments, datasets (CSV staging workspace).
- **CRM** — Companies, contacts, deals.
- **Ops** — Visual ETL pipelines, notebooks, dataset cleaning/enrichment, agent workflows.
- **Agents** — First-class agent definitions with attachable skills, MCP servers, and knowledge sources.
- **Knowledge / RAG** — pgvector-backed retrieval over Obsidian vaults and other corpora.

Helm is internal infrastructure. Treat docs and APIs as living specs — the schema and surfaces evolve fast.

---

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Auth:** Clerk (every row is `userId`-scoped, no cross-tenant reads)
- **UI:** shadcn/ui + Tailwind v4 (semantic tokens, dark/light)
- **DB:** Neon Postgres + Drizzle ORM, pgvector for embeddings
- **Canvas:** @xyflow/react (campaign + pipeline editors share primitives)
- **AI:** OpenAI (`gpt-4o-mini` for messaging, `text-embedding-3-small` for RAG)
- **Pipeline execution:** Inngest v4 — durable per-node steps, retries, concurrency control
- **Connections:** AES-256-GCM encrypted credential storage for external integrations
- **Email:** Resend (campaign sends) + nodemailer/SMTP (one-off /api/messages/send)
- **Workflow engine:** Vercel Workflow SDK 4.x — durable campaign sequence execution
- **Testing:** Vitest + React Testing Library

---

## Quick start

```bash
npm install
cp .env.example .env.local        # fill in keys
npm run db:generate               # only if schema.ts changed
npm run db:migrate                # apply migrations to your Neon branch
npm run dev                       # http://localhost:3000
```

To ingest a local Obsidian vault as a Helm dataset:

```bash
npx dotenv-cli -e .env.local -- npx tsx scripts/ingest-vault.ts <datasetId>
```

Datasets with `source = 'obsidian_vault'` and a `sourcePath` pointing at a local vault directory are walked, chunked (~800 tokens, 100 overlap), embedded, and stored in `knowledge_chunks`.

---

## Environment

```bash
# Database — pooled endpoint required on Vercel
DATABASE_URL=postgresql://...-pooler.region.aws.neon.tech/...?sslmode=require

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# OpenAI (messaging + embeddings)
OPENAI_API_KEY=

# Email
RESEND_API_KEY=

# LinkedIn OAuth (optional, for connection)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=
```

> The Neon **pooled** endpoint (`-pooler` in hostname) is required for serverless cold starts.

---

## Project layout

```
helm/
├── app/
│   ├── api/                  # Clerk-auth, userId-scoped
│   │   ├── agents/           # Agent CRUD + skills/mcp/knowledge attachments + runs
│   │   ├── ai/               # suggest-reply, ai-generate
│   │   ├── analytics/        # dashboard, per-campaign, cross-campaign
│   │   ├── auth/linkedin/    # OAuth flow
│   │   ├── campaigns/        # CRUD + activate/pause/execute/workflow/steps/prospects
│   │   ├── companies|contacts|deals/   # CRM
│   │   ├── conversations/    # Inbox + reply
│   │   ├── cron/             # Workflow tick (public — internal scheduler)
│   │   ├── datasets/         # CSV + vault ingest + vector search
│   │   ├── messages/         # Outbound + send + AI generation/reply
│   │   ├── notebooks/        # Notebook + cells
│   │   ├── pipelines/        # Visual ETL canvas (nodes + edges + runs)
│   │   ├── prospects/        # CRUD + import + campaign history
│   │   ├── segments/         # Audience segments + members
│   │   ├── settings/         # Accounts, general, linkedin
│   │   └── webhooks/email/   # Open/click/reply tracking
│   ├── agents/               # Agent UI (definitions, runs, attachments)
│   ├── campaigns/[id]/       # Canvas, prospects, messages, analytics
│   ├── pipelines/[id]/       # ETL canvas
│   ├── datasets/[id]/        # Dataset detail
│   ├── notebooks/[id]/       # Notebook detail
│   └── ...                   # prospects, segments, contacts, deals, conversations, templates, settings, sign-in, sign-up, dashboard
├── components/
│   ├── ui/                   # shadcn
│   ├── workflow/             # Campaign canvas node types + config
│   ├── pipelines/            # Pipeline canvas node types (15 types incl. ETL + promote_*)
│   └── ...
├── db/
│   ├── schema.ts             # 35+ Drizzle tables
│   └── migrations/           # SQL + journal
├── lib/
│   ├── agent-runtime.ts      # runAgent — loads skills, MCP tools, knowledge context
│   ├── knowledge-ingest.ts   # Vault walker + chunker + embedder
│   ├── knowledge-retrieval.ts# Cosine search + context formatting
│   ├── email-sender.ts       # Resend wrapper + nodemailer fallback
│   ├── workflow-engine.ts    # Strict-DAG interpreter for campaign workflows
│   └── crypto.ts             # AES-256-GCM for SMTP creds
├── scripts/
│   └── ingest-vault.ts       # CLI: ingest an Obsidian vault as a dataset
├── __tests__/                # Vitest suite (152/157 currently passing)
└── docs/                     # See below
```

---

## Database (high-level)

35+ tables grouped by domain. Every table includes `userId` for Clerk-tenant isolation.

| Domain | Tables |
|---|---|
| Outreach | `campaigns`, `workflow_nodes`, `workflow_edges`, `campaign_prospects`, `messages`, `conversations`, `tasks` |
| Audience | `prospects`, `segments`, `segment_members`, `tags`, `prospect_tags` |
| Content | `templates`, `template_variants` |
| CRM | `companies`, `contacts`, `deals`, `deal_contacts` |
| Data | `datasets`, `dataset_rows` |
| Pipelines | `pipelines`, `pipeline_nodes`, `pipeline_edges`, `pipeline_runs`, `pipeline_step_data` |
| Notebooks | `notebooks`, `notebook_cells` |
| Agents | `agent_definitions`, `agent_runs`, `agent_skills`, `agent_skill_links`, `mcp_servers`, `agent_mcp_links` |
| Knowledge | `knowledge_chunks` (1536-dim pgvector), `agent_knowledge_links` |
| Meetings | `meetings`, `meeting_chunks`, `entities` |
| Connections | `connections` (AES-256-GCM encrypted credentials) |
| Settings | `connected_accounts`, `settings` |

The canonical source is [`db/schema.ts`](db/schema.ts). Run `npm run db:studio` to browse.

---

## Sidebar navigation

```
Insights        Dashboard, Analytics
Outreach        Campaigns, Conversations, Templates
Audience        Prospects, Segments, Datasets
CRM             Companies, Contacts, Deals
Ops             Pipelines, Notebooks, Agents, Settings
Monitoring      Runs, Health
```

---

## API reference

See [`docs/api.md`](docs/api.md) if it exists; otherwise the routes mirror the directory layout above and are all Clerk-protected. Public exceptions:

- `POST /api/cron` — workflow execution tick (internal scheduler)
- `POST /api/webhooks/email` — Resend open/click/reply callbacks
- `GET /api/health` — uptime check
- `/sign-in`, `/sign-up` — Clerk

---

## Development

```bash
npm run dev          # Turbopack dev server (port 3010)
npm run inngest:dev  # Inngest dev server + dashboard (localhost:8288)
npm run build        # Production build
npm test             # Vitest (118 lib tests passing)
npm run test:watch
npm run db:generate  # After schema.ts edits
npm run db:migrate   # Apply migrations to your Neon branch
npm run db:studio    # Drizzle Studio
npx tsc --noEmit -p .  # Authoritative TS check
```

Commit hygiene: prefer `git push --force-with-lease`. Farsight's watchdog cron auto-commits every 15 minutes — always inspect divergent histories before force-pushing.

---

## Deployment (Vercel)

Push to `main` → auto-deploy. Required env vars in Vercel project settings:

```
DATABASE_URL            (Neon pooled — required)
OPENAI_API_KEY
RESEND_API_KEY
FIREFLIES_API_KEY
CONNECTIONS_ENCRYPTION_KEY  (32-byte base64 for AES-256-GCM)
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
INNGEST_DEV=1               (local dev only)
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

Sentry is wired via `next.config.ts` (project `helm`).

---

## Status and roadmap

See [`ROADMAP.md`](ROADMAP.md) for what's shipped, what's next, and what's deferred. Historical milestone snapshots (phase reports, migration notes, the original 1,700-line implementation spec) live in [`docs/archive/`](docs/archive/) for reference.

---

## Companion machines

Helm runs alongside two Mac mini workers on the Tailscale network:

- **Cortex** (`github.com:farsght/bitwage-cortex`) — MCP server fleet (meetings, tasks, blackboard, events, site-intel, seo-intel, code-intel, dataforseo, nats-docs, gateway). Agents in Helm consume these tools.
- **Netrunner** (`github.com:farsght/bitwage-netrunner`) — ETL pipelines, currently the source of truth for the Fireflies → Vault → Neon meetings pipeline (626 meetings, ~6,500 chunks). Being progressively absorbed into Helm's Ops section as native visual pipelines.

---

## License

Private — © Farsight Studio
