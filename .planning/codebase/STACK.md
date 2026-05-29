# Technology Stack

**Analysis Date:** 2026-05-29

## Languages

**Primary:**
- TypeScript 5.x - All application code (app/, lib/, db/, workflows/, components/)
- SQL - Drizzle migrations (`db/migrations/*.sql`); raw `sql` templates in lib/ for pgvector ops

**Secondary:**
- CSS - Tailwind v4 with CSS variables via `app/globals.css`
- Bash - `scripts/postinstall.sh` and vault ingestion helpers

## Runtime

**Environment:**
- Node.js v25.8.1 (local dev); Vercel serverless / edge runtimes in production

**Package Manager:**
- npm 11.11.0
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.2.6 (App Router, Turbopack) - Full-stack framework; dev runs on port 3010 (`npm run dev`)
- React 19.2.3 - UI rendering
- Vercel Workflow SDK (`workflow` ^4.2.4) - Durable long-running campaign workflows (`workflows/*.ts`)
- Inngest ^4.4.0 - Durable pipeline execution; event-driven background jobs

**UI Component System:**
- shadcn/ui (via `shadcn` ^4.7.0 CLI, `components.json` config) - Component scaffolding, "new-york" style
- Radix UI (`radix-ui` ^1.4.3 + targeted `@radix-ui/*` packages) - Headless primitives
- Tailwind CSS v4 (`tailwindcss` ^4, `@tailwindcss/postcss` ^4) - Utility-first CSS
- Framer Motion / Motion ^12.38.0 - Animations
- `tw-animate-css` ^1.4.0 - Additional Tailwind animation utilities
- `class-variance-authority` ^0.7.1 + `clsx` ^2.1.1 + `tailwind-merge` ^3.5.0 - Class composition

**Canvas / Node Editor:**
- `@xyflow/react` ^12.10.2 - Two separate visual canvases (campaign workflow + data pipeline)
- `dagre` ^0.8.5 - DAG layout for auto-arranging nodes

**Data Grid / Tables:**
- `@tanstack/react-table` ^8.21.3 - Headless table primitives (`lib/data-grid.ts`, `lib/data-table.ts`)
- `@tanstack/react-virtual` ^3.13.24 - Row virtualization for large datasets
- `@tanstack/react-form` ^1.32.0 - Form state management

**Drag and Drop:**
- `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` ^10.0.0 + `@dnd-kit/modifiers` ^9.0.0 - DnD primitives

**URL State:**
- `nuqs` ^2.8.9 - URL-synchronized query state (`lib/parsers.ts`, hooks)

**Charts:**
- `recharts` ^3.8.0 - Analytics/dashboard charts

**Testing:**
- Vitest ^4.1.6 - Test runner (config: `vitest.config.ts`)
- `@testing-library/react` ^16.3.2 - Component testing
- `@testing-library/user-event` ^14.6.1 - User interaction simulation
- `@testing-library/jest-dom` ^6.9.1 - DOM matchers
- jsdom ^29.1.1 - Browser environment in tests

**Build/Dev:**
- Turbopack - Dev bundler (via `next dev`)
- esbuild / `tsx` ^4.21.0 - Script execution for migrations and vault ingestion
- ESLint 9 + `eslint-config-next` 16.1.6 - Linting (`eslint.config.mjs`)
- PostCSS + `@tailwindcss/postcss` - CSS processing (`postcss.config.mjs`)
- `lightningcss` ^1.32.0 - Fast CSS minification (optional arm64 variant)
- `drizzle-kit` ^0.31.10 - DB schema diffing and migration generation
- `dotenv-cli` ^11.0.0 - ENV injection for scripts (required for vault ingestion due to ESM hoisting)

## Key Dependencies

**AI / LLM:**
- `ai` ^6.0.182 (Vercel AI SDK) - `generateText`, `generateObject`, streaming; used in `lib/agent-runtime.ts`
- `@ai-sdk/openai` ^3.0.63 - OpenAI provider adapter
- `@ai-sdk/anthropic` ^3.0.77 - Anthropic provider adapter
- `openai` ^6.25.0 - Direct OpenAI client for embeddings (`lib/knowledge-retrieval.ts`)
- `zod` ^4.4.3 - Schema validation for agent outputs, pipeline node configs, MCP input schemas

**Database:**
- `drizzle-orm` ^0.45.1 - Type-safe ORM + query builder
- `@neondatabase/serverless` ^1.0.2 - Neon HTTP/WebSocket driver (used in `db/index.ts`)
- `postgres` ^3.4.8 - Backup Postgres client (available but primary path uses `neon`)

**Email:**
- `resend` ^6.12.3 - Campaign email sending (`lib/email-sender.ts`)
- `nodemailer` ^8.0.1 - One-off SMTP sends from connected accounts (`app/api/messages/send/`)

**Utilities:**
- `date-fns` ^4.1.0 - Date formatting
- `papaparse` ^5.5.3 - CSV parsing for dataset imports
- `gray-matter` ^4.0.3 - Frontmatter parsing for Obsidian vault ingestion
- `shiki` ^4.0.2 - Syntax highlighting (notebooks)
- `sonner` ^2.0.7 - Toast notifications
- `lucide-react` ^0.576.0 - Icon set
- `react-day-picker` ^10.0.0 - Date picker component
- `cmdk` ^1.1.1 - Command palette
- `next-themes` ^0.4.6 - Dark/light theme provider
- `react-wrap-balancer` ^1.1.1 - Text balancing

**Observability:**
- `@sentry/nextjs` ^10.53.1 - Error tracking, tracing, session replay, logs

**Unused / In-package but not imported in app code:**
- `@upstash/box` ^0.4.1 - Listed as dependency but no imports found in app/lib/
- `@libsql/client` ^0.17.0 - Listed as dependency but no imports found in app/lib/

## Configuration

**Environment:**
- All config via env vars; template in `.env.example`
- Local dev: `.env.local` (never committed)
- Required vars: `DATABASE_URL` (pooled Neon endpoint), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `CONNECTIONS_ENCRYPTION_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- Optional vars: `FIREFLIES_API_KEY`, `LINKEDIN_CLIENT_ID/SECRET`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `RESEND_REPLY_TO`, `CRON_SECRET`
- `DATABASE_URL` must use the `-pooler` hostname for Vercel (cold-start safety; see `db/index.ts`)

**TypeScript:**
- Config: `tsconfig.json`; `strict: true`, `moduleResolution: bundler`
- Path alias: `@/*` resolves to repo root (both tsconfig and vitest)
- Authoritative type check: `npx tsc --noEmit -p .` (lint runner uses a different tsconfig)

**Build:**
- `next.config.ts` — wraps `withSentryConfig(withWorkflow(nextConfig))`. Order is fixed: Workflow injects build-time `"use workflow"` / `"use step"` transforms before Sentry wraps.
- `drizzle.config.ts` — schema at `./db/schema.ts`, migrations in `./db/migrations`, dialect `postgresql`

## Platform Requirements

**Development:**
- Node.js (v20+ minimum per `@types/node ^20`; local uses v25.8.1)
- Neon Postgres branch with pgvector extension enabled
- Inngest CLI for local pipeline testing: `npm run inngest:dev`
- Port 3010 for dev server

**Production:**
- Vercel (Fluid Compute must be enabled — required for Workflow SDK resume without cold-starts)
- Vercel Cron (every 5 min, `vercel.json` config at `/api/cron`)
- Neon Postgres with pooled connection endpoint (DATABASE_URL must contain `-pooler`)
- Sentry org `helm-gs`, project `helm`

---

*Stack analysis: 2026-05-29*
