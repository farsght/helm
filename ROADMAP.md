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
- Visual ETL pipelines (xyflow canvas, 15 node types: source_dataset, map_fields, filter, clean, deduplicate, enrich, ai_classify, split, run_notebook, plus 5 `promote_*` targets)
- Pipeline runs with execution history
- Notebooks (cells, execution)

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
- `lib/knowledge-retrieval.ts` — per-attachment cosine search, citation-formatted context block
- 4 API routes: dataset ingest, dataset search, agent knowledge list/add/remove, per-attachment patch/delete
- `scripts/ingest-vault.ts` CLI
- Bitwage Vault ingested (dataset 11 — 2,299 files, 14,834 chunks)
- OpenClaw Vault ingested (dataset 12 — 31 files, 181 chunks)
- End-to-end retrieval verified — real meeting transcript citations with heading paths and cosine scores

### Infra
- Clerk auth on every route, `userId`-scoped queries everywhere
- Neon Postgres + Drizzle, pgvector enabled
- Vitest suite (152/157 passing — 5 pre-existing flakes)
- Sentry wired
- Vercel Workflow SDK 4.x for durable execution
- Custom domain: helm.gs

---

## Next up

### Visual ETL builder for Fireflies pipeline (Helm Ops)
Replace netrunner's Mac mini meetings pipeline with native Helm visual nodes.
- Mirror netrunner's schema in Helm's Neon: `meetings`, `chunks`, `entities` tables with 14-axis taxonomy columns
- New pipeline node types: `fireflies_poll`, `persist_raw_pair`, `classify_meeting` (port battle-tested 3-pass enrichment prompt), `extract_entities`, `chunk_text` (section-aware), `embed`, `promote_knowledge`
- Run parallel to netrunner, compare outputs, eventually decommission Mac mini code
- Source for porting: `~/Projects/bitwage-netrunner/packages/meetings-pipeline/scripts/` (export-fireflies 641 LOC, enrich-fireflies 492 LOC, chunker, embedder, extract-entities, sync-approvals, reconcile)

### Knowledge architecture polish
- MCP-mediated hybrid search (vector + tag categories) — agents query a Neon-MCP-style server instead of attaching datasets directly. Direct attachment UI deferred until categorization emerges from real tag data.
- Background re-ingest job triggered on vault file changes (currently manual via `scripts/ingest-vault.ts`)

### Tier 5 follow-ups
- Error handler invocation (currently only logging — wire into workflow runner)
- Error-handler picker UI in campaign Settings
- `wait_for_event` timeout enforcement
- (`sub_workflow` recursion: ✅ shipped)

### Test debt
- 3 `__tests__/api/campaigns.test.ts` failures — `/activate` validator gate returns 422 for empty/invalid workflows; tests expect 200/404
- 2 `__tests__/components/prospects-client.test.tsx` waitFor flakes

### Security
- 44 dependabot alerts (1 critical, 7 high, 30 moderate, 6 low) — triage pass

---

## Deferred / future

### Phase B docs (write alongside implementation)
- `docs/architecture.md` — system overview
- `docs/agents.md` — agent runtime (skills, MCP, knowledge attachments)
- `docs/rag.md` — knowledge_chunks ingest + retrieval semantics
- `docs/datasets-and-pipelines.md` — Ops deep-dive
- `docs/meetings-pipeline.md` — Fireflies absorption (write when building)

### Bigger bets
- Cortex MCP fleet absorption — eventually run the 11 MCP servers (meetings, tasks, blackboard, events, site-intel, seo-intel, code-intel, nats-docs, dataforseo, gateway) inside Helm rather than on the Mac mini
- Visual ETL builder generalizes — same primitives apply to enrichment, dedup, and sync pipelines beyond Fireflies
- May eventually replace Obsidian as the primary knowledge workspace (Helm becomes the operator surface for Bitwage knowledge, not just marketing)
- 44-tile design system / brand polish pass once IA is fully settled

### Cleanup
- Decommission netrunner Mac mini pipeline after parallel run validates
- Trim `components/blocks/file-upload/*` dead-code `~/` alias files (15 files, kept per request)
- `hooks/use-data-grid.ts` vendor path tsc errors

---

## Recently completed renames

- `ai-sdr` → `helm` (project name, GitHub repo, package name, Sentry project, Vercel project, custom domain helm.gs)
- "Sales Automation" → "Marketing OS" framing throughout UI
