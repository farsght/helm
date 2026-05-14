# ai-sdr CHECKLIST.md

_Last updated: 2026-05-14 17:08 UTC by farsight watchdog_

---

## 🔴 17:08 UTC — Claude stopped 31min, relaunched PID 90473

Last remote feature commit `b83618b` (Tier 2 RAG) was 31 min ago — over 30-min threshold. Claude relaunched PID 90473 with task: reconcile local/remote divergence + implement /api/ai/suggest-reply (P2).

⚠️ **GIT CONFLICT**: `git pull --rebase origin main` hit conflict on `476946e`. Rebase aborted. Claude is handling the merge manually.

---

## Completed Work ✅

| Commit | Time | Status | Description |
|---|---|---|---|
| `b83618b` | 16:37 UTC | ✅ Remote | feat(rag): Tier 2 — knowledge_chunks pgvector + obsidian_vault dataset ingest + agent retrieval |
| `5c4b63b` | 16:25 UTC | ✅ Remote | chore: farsight watchdog — 16:23 UTC |
| `56f42b1` | 16:11 UTC | ✅ Remote | chore: farsight watchdog — 16:08 UTC |
| `a5aa468` | 15:56 UTC | ✅ Remote | chore: farsight watchdog — 15:53 UTC |
| `b17b780` | ~15:16 UTC | ✅ Remote | feat(api): add POST /api/campaigns/:id/steps and per-step CRUD route |
| `41306b2` | ~15:15 UTC | ✅ Remote | fix(api): inject userId on prospect import; verify scoping on prospects/templates/campaigns |
| `84dbba7` | ~15:15 UTC | ✅ Remote | feat(api): add user-scoped GET/PUT /api/settings |
| `b118512` | ~15:14 UTC | ✅ Remote | feat(db): add tags (user_id, name) compound unique constraint |
| `476946e` | ~16:16 UTC | ⚠️ LOCAL ONLY | feat(workflow): implement sub_workflow inline recursion (Tier 5) — diverged from remote |

### P0 — USER_SCOPING_SPEC.md (ALL DONE ✅)

- ✅ `b118512` — tags table: userId + compound unique constraint
- ✅ `84dbba7` — GET/PUT /api/settings (user-scoped)
- ✅ `41306b2` — POST /api/prospects: userId injection
- ✅ `41306b2` — POST /api/templates: userId injection
- ✅ `41306b2` — PUT /api/campaigns/:id: userId check/scoping
- ✅ `b17b780` — POST /api/campaigns/:id/steps + per-step CRUD

### Tier 5 Workflow Engine (ALL DONE ✅)
- ✅ `switch` node: fully functional — cases editor, label/when pairs, default fallthrough
- ✅ `sub_workflow` node: inspector, DB schema (errorHandlerCampaignId), execution stub
- ✅ `wait_for_event` node: durable createHook suspension, deterministic token, POST webhook
- ✅ Top-level try/catch + `notifyErrorHandler` step
- ✅ `476946e` — Sub-workflow inline recursion (LOCAL ONLY — not on remote, branch diverged)
- ✅ Tests: 152/157 passing (5 pre-existing failures)

### Tier 4 Canvas (DONE ✅)
- ✅ FlowNode, ResourceNode, Palette components + dagre auto-layout
- ✅ Campaign workflow canvas (/campaigns/[id]/workflow)
- ✅ Agent library canvas (/agents/[id])

### Tier 2 RAG — Knowledge Base (DONE ✅ as of 16:37 UTC)
- ✅ `knowledge_chunks` table (1536-dim pgvector, ivfflat cosine index)
- ✅ `agent_knowledge_links` table (per-agent scoping with pathPrefix + topK)
- ✅ Migration 0011 applied to Neon
- ✅ Obsidian vault walker + gray-matter + recursive char splitter (~800 tokens/100 overlap)
- ✅ OpenAI text-embedding-3-small batched ingest (idempotent upsert)
- ✅ Cosine vector search retrieval + `<knowledge_context>` injection into system prompt
- ✅ APIs: POST /api/datasets/[id]/ingest, /search, GET/POST/DELETE /api/agents/[id]/knowledge
- ✅ CLI: scripts/ingest-vault.ts with progress
- ✅ OpenClaw Vault (dataset 12): 31 files, 181 chunks, 41s ingestion verified

---

## Pending Work 🔄

### P2 — AI (IN PROGRESS 🔄)
- 🔄 /api/ai/suggest-reply — Claude relaunched PID 90473 to implement this

### Git divergence — needs resolution
- ⚠️ Local netrunner has `476946e` (Tier 5 recursion) NOT on remote
- ⚠️ Remote has RAG commits not on local (`b83618b` and prior)
- ⚠️ `git pull --rebase` hit conflict — Claude handling manual merge

---

## Resume Instructions

1. ✅ Repo at ~/Projects/ai-sdr
2. ✅ Claude binary: v2.1.141
3. 🔄 Claude PID 90473 — relaunched 17:10 UTC
4. ⚠️ Rebase conflict on `476946e` — Claude resolving
5. Next: /api/ai/suggest-reply (P2)

---

## Watchdog History

| Time UTC | Claude | Action |
|---|---|---|
| 11:08 | Running | Tier 4 canvas just committed |
| 11:23 | Stopped | Under threshold — no action |
| 11:38 | Stopped | Stall alert #1 — wake event sent |
| 11:53 | Stopped | Stall persisting — wake event #2 |
| 12:08 | Stopped | Wake event #3 — Telegram alert sent |
| 12:23 | Stopped | Wake event #4 — repo temp dir GONE, Telegram alert sent |
| 12:38 | Stopped | Wake event #5 — repo still NOT re-cloned |
| 12:53 | Stopped | Wake event #6 — 106 min stall, repo still missing |
| 13:08 | Stopped | ✅ Repo re-cloned + npm install done. 🔴 claude binary NOT FOUND |
| 13:23 | ✅ Running | ✅ Claude resumed — Tier 5 workflow commits |
| 13:38 | ✅ Running | ✅ Healthy — last feature commit 13:20 UTC (18 min ago) |
| 13:53 | ⚠️ Running | ⚠️ 1 process, 33 min since last feature commit |
| 14:08 | ⚠️ Running | ⚠️ Still 1 process, 48 min since last feature commit |
| 14:23 | 🔴 Stopped | 🔴 Claude dropped to 0. Binary not found. Telegram alert sent. |
| 14:38 | 🔴 Stopped | 🔴 Confirmed claude binary NOT INSTALLED. Telegram alert sent. |
| 14:53 | 🔴 Stopped | 🔴 Still stopped. 93 min since last feature commit. Telegram alert sent. |
| 15:08 | 🔴→✅ Fixed | ✅ Reinstalled @anthropic-ai/claude-code v2.1.141. Claude PID 8766 launched. |
| 15:23 | 🔴 Stopped | ✅ Clean exit — 4 P0 feature commits done. Last commit 15:16 UTC (7 min ago). No wake. |
| 15:38 | 🔴 Stopped | ⏳ Still stopped. 22 min since last commit. Under 30-min threshold. No action. |
| 15:53 | 🔴→🔄 Wake | 🔴 37 min since last commit. OVER threshold. Claude relaunched PID 45004. Telegram alert sent. |
| 16:08 | 🔴→🔄 Wake | 🔴 52 min since last feature commit. Clean tree. Claude relaunched PID 55157. Telegram alert sent. |
| 16:23 | 🔴 Stopped | ✅ Clean exit — `476946e` Tier 5 sub_workflow recursion committed 16:16 UTC (7 min ago). LOCAL ONLY. Under threshold, no wake. |
| 16:38 | 🔴 Stopped | ✅ Clean exit — `b83618b` Tier 2 RAG committed 16:37 UTC (1 min ago). ⚠️ Local branch diverged from remote. No wake needed. |
| 16:53 | 🔴 Stopped | ⏳ Clean exit — last feature commit `b83618b` 16 min ago. Local diverged (`476946e` unpushed). Under 30-min threshold. No action. |
| 17:08 | 🔴→🔄 Wake | 🔴 31 min since last remote feature commit. OVER threshold. Claude relaunched PID 90473. ⚠️ git rebase conflict on `476946e` — aborted, Claude resolving manually. Telegram alert sent. |
