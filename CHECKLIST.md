# ai-sdr CHECKLIST.md

_Last updated: 2026-05-14 14:23 UTC by farsight watchdog_

---

## 🔴 Claude Stopped — Wake Event Sent (14:23 UTC)

Claude Code dropped to 0 processes (was 1 at 14:08 UTC). Last feature commit: `7a9d3d5f` at 13:20 UTC (63 min ago). Watchdog restarted Claude via `nohup claude --dangerously-skip-permissions` in ~/Projects/ai-sdr. Telegram alert sent to Scott.

---

## Completed Work ✅

| Commit | Time | Description |
|---|---|---|
| `7a9d3d5f` | 13:20 UTC | feat(workflow): Tier 5 — wait_for_event + error handler + UI inspectors |
| `5a8e264f` | 13:17 UTC | feat(workflow): add support for switch and sub_workflow node types |
| `662cc96f` | 11:07 UTC | feat(canvas): Tier 4 — visual workflow + agent library canvases |
| `def93478` | 11:12 UTC | watchdog: Tier 1+4 agents/MCP runtime + visual canvas noted |

### Tier 5 Workflow Engine (DONE per commits 5a8e264f + 7a9d3d5f)
- ✅ `switch` node: fully functional — cases editor, label/when pairs, default fallthrough, valid edge labeling
- ✅ `sub_workflow` node: inspector (subCampaignId picker), DB schema updated (errorHandlerCampaignId), execution stub (returns completed, recursion pending)
- ✅ `wait_for_event` node: durable createHook suspension, deterministic token, POST webhook to resume
- ✅ switch inspector, sub_workflow inspector, wait_for_event inspector panels
- ✅ `defaultConfigForType` helper — validator-passing scaffold per node type
- ✅ Top-level try/catch in workflow function + `notifyErrorHandler` step (routes to campaigns.errorHandlerCampaignId on failure)

### Tier 4 Canvas (DONE per commit 662cc96f)
- ✅ FlowNode, ResourceNode, Palette components
- ✅ auto-layout.ts (dagre LR)
- ✅ Campaign workflow canvas (/campaigns/[id]/workflow)
- ✅ Agent library canvas (/agents/[id])
- ✅ Type-specific inspector panels
- ✅ Drag-from-palette, click-to-inspect
- ✅ dagre auto-arrange on empty positions
- ✅ Removed dead reactflow v11 package
- Tests: 152/157 passing (5 pre-existing failures)

---

## Pending Work 🔄

### P0 — USER_SCOPING_SPEC.md: userId fixes

**db/schema.ts** — add userId to:
- [ ] settings table
- [ ] tags table  
- [ ] messages table
- [ ] Run migrations

**API Routes:**
- [ ] GET/PUT /api/settings (user-scoped)
- [ ] POST /api/prospects (userId injection)
- [ ] POST /api/templates (userId injection)
- [ ] PUT /api/campaigns/:id (userId check)
- [ ] Campaign steps API (/api/campaigns/[id]/steps/)

### P2 — AI
- [ ] /api/ai/suggest-reply

### Tier 5 — Sub-workflow recursion (partial)
- [ ] Graph-level recursion for sub_workflow execution (currently stubbed)

---

## Resume Instructions

1. ✅ Repo at ~/Projects/ai-sdr
2. 🔄 Claude restarted by watchdog at 14:23 UTC (PID 86716)
3. Next: continue from USER_SCOPING_SPEC.md — userId on settings/tags/messages tables + API routes

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
| 12:38 | Stopped | Wake event #5 — repo still NOT re-cloned at ~/Projects/ai-sdr |
| 12:53 | Stopped | Wake event #6 — 106 min stall, repo still missing, Telegram alert sent |
| 13:08 | Stopped | ✅ Repo re-cloned + npm install done. 🔴 claude binary NOT FOUND escalated |
| 13:23 | ✅ Running | ✅ Claude resumed — Tier 5 workflow commits (switch, sub_workflow, wait_for_event) |
| 13:38 | ✅ Running | ✅ Healthy — last feature commit 13:20 UTC (18 min ago), 3 processes |
| 13:53 | ⚠️ Running | ⚠️ Process count 3→1, no feature commits in 33 min. Watching. |
| 14:08 | ⚠️ Running | ⚠️ Still 1 process, 48 min since last feature commit. No wake sent — Claude still alive. |
| 14:23 | 🔴 Stopped | 🔴 Claude dropped to 0 processes (63 min since last feature commit). Watchdog restarted claude (PID 86716). Telegram alert sent. |
