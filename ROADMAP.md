# Helm Roadmap

What's shipped, what's next, what's deferred. Lean and current as of May 2026.

For deep historical context (phase reports, migration notes, original spec), see [`docs/archive/`](docs/archive/).

---

## Shipped

### Outreach
- Campaign CRUD, status lifecycle (draft → active → paused → completed)
- Visual canvas (xyflow) with 11 node types: email, linkedin_message, linkedin_connection, linkedin_profile_view, wait, condition, ai_decision, manual_task, tag, move_to_campaign, end
- Strict-DAG interpreter (`lib/workflow-engine.ts`) — per-prospect execution state, `nextRunAt` scheduling, branch evaluation
- Workflow primitives: condition branching, n-decision routing, AI decision routing
- Sub-workflow inline recursion (Tier 5)
- Template library with A/B variants, send/open/reply/click counters, "set winner" promotion
- Conversation inbox with thread view, status pipeline (new → in_progress → interested → meeting_booked → not_interested → unsubscribed)
- AI suggest-reply + AI message generation (`gpt-4o-mini`)
- Email open/click/reply webhooks via Resend
- Email sending: Resend for campaigns, nodemailer/SMTP for one-off `/api/messages/send`

### Audience & CRM
- Prospects (CRUD, paginated search, bulk CSV import, custom fields)
- Segments (static + dynamic with filter rules)
- Tags
- Companies, Contacts, Deals (separate CRM entities — contacts ≠ SDR prospects)
- Deal ↔ contact relationships

### Data plane
- Datasets as a staging workspace (CSV upload, row browse, multi-source: `csv`, `obsidian_vault`, etc.)
- Visual ETL pipelines (xyflow canvas, 15+ node types including 9 Fireflies-specific meeting pipeline nodes)
- Pipeline runs with execution history
- Notebooks (cells, execution)

### Connections (Tier 3 — Sprint 1)
- `connections` table with AES-256-GCM encrypted credentials
- Service layer: create, update, revoke, list, getForRuntime (kind-asserted), test
- API routes: CRUD + test + revoke
- `/connections` management page (list, create/edit, test, revoke)
- Pipeline inspector: connection dropdowns for Fireflies + OpenAI nodes
- Spec: `docs/pipelines-connections-foundation.md`

### Agents (Tier 1)
- Agent definitions with system prompt + model selection
- Attachable skills (`agent_skills` + `agent_skill_links`) — procedural, inline (<10KB)
- Attachable MCP servers (`mcp_servers` + `agent_mcp_links`) — non-deterministic tool surface
- Agent runs table for execution tracking
- `lib/agent-runtime.ts` — `runAgent()` loads skills, MCP tools, and knowledge in parallel

### Knowledge / RAG (Tier 2)
- `knowledge_chunks` table with 1536-dim pgvector + ivfflat cosine index
- `agent_knowledge_links` for per-agent attachment with optional `pathPrefix` filter and `topK` override
- `lib/knowledge-ingest.ts` — vault walker, gray-matter parser, ~800-token chunker, OpenAI `text-embedding-3-small` batched embedder, idempotent upsert keyed on `(datasetId, sourcePath, chunkIndex)`, incremental via content_hash diff
- 4 API routes: dataset ingest, dataset search, agent knowledge list/add/remove, per-attachment patch/delete
- `scripts/ingest-vault.ts` CLI
- Bitwage Vault ingested (dataset 11 — 2,299 files, 14,834 chunks)
- OpenClaw Vault ingested (dataset 12 — 31 files, 181 chunks)

### Inngest Durable Pipeline Execution (Tier 6)
- Inngest v4.4.0 integrated
- `lib/inngest/functions/pipeline-run.ts` — each pipeline node is a durable `step.run()`
- `pipeline_step_data` table for staging large intermediate data between steps (avoids 4MB Inngest step limit)
- `/api/inngest` serve endpoint with `maxDuration=300s`
- `/api/pipelines/[id]/run` sends Inngest event (non-blocking)
- Per-node retries, concurrency control (limit: 3)

### Fireflies Meetings Pipeline — Verified ✅
- 9 typed node executors: `fireflies_poll`, `persist_raw_pair`, `classify_meeting`, `extract_entities`, `chunk_text`, `embed`, `promote_meetings`, `promote_entities`, `promote_chunks`
- Pipeline engine with topological sort + executor dispatch
- Trigger model: manual, cron, webhook
- 55 meetings classified, 280 entities extracted, 39 chunks embedded
- Running end-to-end through Inngest

### Infra
- Clerk auth on every route, `userId`-scoped queries everywhere
- Neon Postgres + Drizzle, pgvector enabled
- Vitest suite (13 lib test files, 118 tests passing)
- Sentry wired
- Vercel Workflow SDK 4.x for campaign durable execution
- Custom domain: helm.gs (apex primary, www redirects)
- Inngest dev server for local pipeline execution

---

## Next up

### Meetings review UI
Build `/meetings` page — queue of classified meetings with `workflow='needs-review'`, approve/edit taxonomy inline, replace Obsidian review step.

### Inngest AI observability
Wrap OpenAI calls in `classify_meeting`, `extract_entities`, `embed` with `step.ai.wrap()` for token tracking, prompt replay, and AI metrics in Inngest dashboard.

### Inngest realtime pipeline progress
Use `useRealtime` hooks to stream live step-by-step progress into the pipeline canvas UI — nodes light up as they complete.

### Connections Sprint 2
OAuth flows for HubSpot, Gmail, Google Sheets. Token refresh, re-authorization UI.

### AI Enrich node (generic)
"For each row, fill field X with this prompt" — the highest-value missing pipeline node.

### → HubSpot upsert node
Push enriched meeting/entity data back to CRM.

### Embed fix: long transcript splitting
16 chunks were skipped because transcripts exceeded 8192 tokens per item even after truncation. Fix by splitting long transcripts into multiple smaller chunks in `chunk_text` before embedding.

### Tier 5 follow-ups
- Error handler invocation (currently only logging — wire into workflow runner)
- Error-handler picker UI in campaign Settings
- `wait_for_event` timeout enforcement

### Test debt
- 3 `__tests__/api/campaigns.test.ts` failures — `/activate` validator
- 2 `__tests__/components/prospects-client.test.tsx` waitFor flakes
- 6 `__tests__/components/campaigns-list.test.tsx` component flakes

### Security
- 45 dependabot alerts (1 critical, 8 high, 30 moderate, 6 low) — triage pass
- Rotate Inngest signing key (was shared in chat)

---

## Deferred / future

### Inngest + Neon CDC
Connect Neon logical replication to Inngest — DB changes trigger pipeline functions automatically. Enables real-time meeting ingestion from Fireflies webhooks.

### Inngest flow control
Throttling for OpenAI rate limits, debounce for rapid-fire events, priority queues for critical pipelines.

### AgentKit integration
Inngest's multi-agent framework for building AI agent networks. Potential for Helm agents to collaborate on complex tasks.

### Cortex MCP fleet absorption
Move the 11 MCP servers from Mac mini into Helm-managed infrastructure.

### Visual ETL generalizes
Same pipeline primitives apply to HubSpot sync, enrichment, dedup pipelines beyond Fireflies.

### Phase B docs
- `docs/architecture.md` — system overview
- `docs/agents.md` — agent runtime
- `docs/rag.md` — knowledge_chunks semantics
- `docs/inngest.md` — pipeline execution model

### Cleanup
- Decommission netrunner Mac mini pipeline after parallel run validates
- Clean up stale pipeline_runs (runs 5-8, 17-21 stuck in "running")
- Trim dead-code file-upload components
