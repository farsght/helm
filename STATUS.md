# Helm — Phase Status

Last updated: 2026-05-14
Session handoff doc — read this first when picking the project back up.

---

## Where we are right now (TL;DR)

Helm is a working Marketing OS with **5 tiers of platform infrastructure shipped** and a **15K-chunk RAG corpus live** over 2+ years of Bitwage institutional knowledge. The next major build is the **visual ETL pipeline editor for Fireflies meetings ingestion** in Helm's Ops section, replacing the netrunner Mac mini pipeline.

**Live:** https://helm.gs
**Repo:** github.com:farsght/helm (private, main branch)
**Local:** ~/Projects/helm (canonical, only working copy)
**Last commit:** `dd1c0cf`

---

## Tier completion

| Tier | Description | Status |
|---|---|---|
| **T1** | Agents (definitions, skills, MCP servers, runs, runtime) | ✅ Shipped |
| **T2** | RAG / Knowledge (pgvector, ingest, retrieval, agent attachment) | ✅ Shipped |
| **T3** | Connectors / Data integrations | ⏸ Partially unblocked — netrunner code inspected |
| **T4** | Visual canvases (campaign workflows + ETL pipelines) | ✅ Shipped |
| **T5** | Flow primitives (sub_workflow recursion, error handlers, wait_for_event) | ✅ Mostly shipped — 3 follow-ups deferred |

---

## What was completed this session (2026-05-14)

### Platform rename
- `ai-sdr` → `helm` across repo, package.json, Sentry project, Vercel project
- Custom domain **helm.gs** attached
- GitHub repo migrated via mirror-push; old `farsght/ai-sdr` archived
- Sentry org slug `bitwage` → `farsight-studio` → **helm-gs** (final)
- New Sentry auth token written to `.env.sentry-build-plugin` (gitignored locally; needs same value pasted into Vercel dashboard)
- "Sales Automation" → "Marketing OS" framing throughout UI

### T2 RAG fully wired and verified
- `knowledge_chunks` table — 1536-dim pgvector + ivfflat cosine index
- `agent_knowledge_links` table — per-agent attachment with pathPrefix + topK overrides
- `lib/knowledge-ingest.ts` (350 lines) — vault walker, gray-matter parser, ~800-token chunker with overlap, section-aware heading tracking, OpenAI `text-embedding-3-small` batched embedder, idempotent upsert keyed on `(datasetId, sourcePath, chunkIndex)`, incremental via content_hash diff
- `lib/knowledge-retrieval.ts` (127 lines) — cosine vector search per attachment, citation-formatted context block
- 4 API routes wired (`/api/datasets/[id]/ingest`, `/search`, `/api/agents/[id]/knowledge`, per-attachment patch)
- `lib/agent-runtime.ts` injects retrieved chunks under `<knowledge_context>` system prompt block, parallel with skills + MCP loaders, non-fatal on retrieval failure
- `scripts/ingest-vault.ts` CLI for one-shot ingestion

### Knowledge corpus live in Neon
- **Dataset 11 Bitwage Vault: 14,834 chunks across 2,299 files** (GTM, Knowledge Base, Sources, Competitive)
- **Dataset 12 OpenClaw Vault: 181 chunks across 31 files** (AI agent protocol layer research)
- End-to-end retrieval verified: query "enterprise pricing strategy" returned real meeting transcripts with section-aware heading paths and cosine scores

### Other shipments
- Tier 5 sub_workflow inline recursion (`8c075c8`, by another agent)
- 8 historical milestone docs archived to `docs/archive/`
- README rewritten from scratch (honest Marketing OS scope, 35+ table schema reality)
- `PLAN.md` → `ROADMAP.md` (shipped / next / deferred structure)
- Operational docs audited (`docs/email.md`, `docs/workflows.md`, `docs/sentry.md`)
- Orphan `~/Projects/ai-sdr` stub directory deleted

---

## Next session: pick up here

### Recommended next major build: Visual ETL pipeline editor for Fireflies meetings

The netrunner Mac mini pipeline (`~/Projects/bitwage-netrunner/packages/meetings-pipeline`) needs to be replaced with native Helm visual pipeline nodes. We've already mapped the source thoroughly:

**Netrunner pipeline shape (5 passes):**
1. **Export** — Fireflies GraphQL → Vault `Raw/{slug}-transcript.md` + `{slug}-summary.md` (`export-fireflies.ts`, 641 LOC)
2. **Enrich Pass 1** — classify into 14-axis taxonomy (`enrich-fireflies.ts`, 492 LOC, 3 LLM passes)
3. **Enrich Pass 2** — extract entities (people, companies)
4. **Enrich Pass 3** — write enriched `Meetings/{slug}.md` with `workflow=needs-review`
5. **Sync approvals** (post-human-review in Obsidian) → Neon `meetings` table, then chunk + embed → `chunks`, then publish to `events.intelligence` Redis stream

**Open decision before starting** (recommended option in **bold**):
1. **Option A: Write spec doc first (~30 min)** — design new node types + schema additions before coding. Less rebuild risk given complexity.
2. Option B: Stub schema additions for new tables (`meetings`, `entities`, `meeting_chunks`) first, then design nodes against the data.
3. Option C: Just start building node types incrementally in `components/pipelines/` and `app/api/pipelines/`.

**Proposed new pipeline node types** (~6-7 total):
- `fireflies_poll` — GraphQL polling, write Raw pairs
- `persist_raw_pair` — vault file write helper
- `classify_meeting` — port battle-tested 3-pass enrichment prompt, fill 14-axis taxonomy
- `extract_entities` — people + companies
- `chunk_text` — section-aware splitter (transcript section boundaries)
- `embed` — OpenAI embedding (reuse `lib/knowledge-ingest.ts` embedder)
- `promote_knowledge` — Neon write to `meetings` + `chunks` tables

Helm's existing `/pipelines` canvas already has 15 node types and runs xyflow — extending it is the lowest-friction path.

### Other open work (lower priority)

**Tier 5 follow-ups:**
- Error handler invocation (currently only logs — wire into workflow runner)
- Error-handler picker UI in campaign Settings
- `wait_for_event` timeout enforcement
- (sub_workflow recursion: ✅ already shipped)

**Knowledge architecture polish:**
- MCP-mediated hybrid search (vector + tag categories) — agents query a Neon-MCP-style server instead of attaching datasets directly. Direct attachment UI deferred until categorization emerges from real tag data.
- Background re-ingest job triggered on vault file changes (currently manual via `scripts/ingest-vault.ts`)

**Test debt:**
- 3 `__tests__/api/campaigns.test.ts` failures — `/activate` validator returns 422 for empty/invalid workflows; tests expect 200/404
- 2 `__tests__/components/prospects-client.test.tsx` waitFor flakes

**Security:**
- 44 dependabot alerts (1 critical, 7 high, 30 moderate, 6 low) — needs triage pass
- Rotate the Sentry auth token (it was pasted in chat — anyone with chat history can hit Sentry as helm-gs)

---

## Action items needed from Scott (dashboard work)

These can't be done from CLI — Scott needs to do them in Vercel:

1. **Set Vercel env vars** (Production + Preview + Development):
   - `SENTRY_AUTH_TOKEN` → the new helm-gs token
   - `SENTRY_ORG` → `helm-gs`
   - `SENTRY_PROJECT` → `helm`

Without these, source map uploads on Vercel deploys will fail authentication.

2. **Verify Vercel domain mapping** for helm.gs is active (was being attached at end of session).

---

## Key reference state

### Tailscale machines
- **farsight-1** (Scott's MacBook) — where Helm dev happens. SSH into this is implicit.
- **cortex** (Mac mini) — runs the 11-server MCP fleet (`github.com:farsght/bitwage-cortex`). SSH often unreachable when idle.
- **netrunner** (Mac mini) — runs the ETL pipelines (`github.com:farsght/bitwage-netrunner`). SSH works: `ssh netrunner` (config user=netrunner).
- **rick** — Mac mini, unrelated to Helm (had a stale ai-sdr build cache, since deleted).
- **ai** — additional peer.

### Important files
| Path | What |
|---|---|
| `db/schema.ts` | 35+ Drizzle tables, source of truth |
| `lib/knowledge-ingest.ts` | Vault walker + chunker + embedder |
| `lib/knowledge-retrieval.ts` | Vector search + context formatting |
| `lib/agent-runtime.ts` | `runAgent()` — loads skills + MCP + knowledge in parallel |
| `lib/workflow-engine.ts` | Strict-DAG interpreter for campaign workflows |
| `scripts/ingest-vault.ts` | CLI: ingest an Obsidian vault as a dataset |
| `components/workflow/` | Campaign canvas node types (11 types) |
| `components/pipelines/` | ETL pipeline canvas node types (15 types) — *the place to add Fireflies nodes* |
| `docs/email.md` | Resend setup, plain-text strategy, deliverability |
| `docs/workflows.md` | Vercel Workflow SDK wiring, strict-DAG validator |
| `docs/sentry.md` | Sentry config + decisions |
| `docs/archive/` | 8 historical milestone snapshots — reference only |

### Migration state
- Drizzle journal ends at idx 12 (`0012_knowledge_rag.sql`)
- All migrations applied to Neon

### Vault paths
- `~/Documents/bwVault/Bitwage Vault/` — 2,300 md files, git-backed, Smart Connections runs bge-micro-v2 locally
- `~/Documents/bwVault/OpenClaw Vault/` — 30 md files, AI agent protocol research

### Vault ingest command (for future ad-hoc runs)
```bash
cd ~/Projects/helm && unset OPENAI_API_KEY DATABASE_URL && \
  npx dotenv-cli -e .env.local -- npx tsx scripts/ingest-vault.ts <datasetId>
```
ESM import hoisting requires the `dotenv-cli` prefix — `db/index.ts` imports run before any in-script `dotenv.config()`.

---

## Open questions parking lot

- Should `meetings` data live in Helm's Neon directly (Option A, current plan) or stay on netrunner's Neon with Helm reading via foreign data wrapper? **Decision: Option A (full isolation, Helm becomes source of truth eventually).**
- Are we porting netrunner's classification prompts verbatim or rewriting? **Default: port verbatim, they're battle-tested.**
- Do we want the new Fireflies pipeline running PARALLEL to netrunner (compare outputs), or CUT OVER directly? **Default: parallel run until output parity is verified, then decommission Mac mini.**
