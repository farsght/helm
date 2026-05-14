# ai-sdr CHECKLIST.md

_Last updated: 2026-05-14 16:08 UTC by farsight watchdog_

---

## 🎉 USER_SCOPING_SPEC.md — P0 Complete (15:23 UTC)

Claude Code completed all P0 user-scoping tasks between 15:10–15:16 UTC. All 4 feature commits pushed to remote. Claude stopped again at 16:08 UTC — **52 min since last commit, OVER 30-min threshold. Wake event sent. Claude relaunched PID 55157.**

---

## Completed Work ✅

| Commit | Time | Description |
|---|---|---|
| `b17b780` | ~15:16 UTC | feat(api): add POST /api/campaigns/:id/steps and per-step CRUD route |
| `41306b2` | ~15:15 UTC | fix(api): inject userId on prospect import; verify scoping on prospects/templates/campaigns |
| `84dbba7` | ~15:15 UTC | feat(api): add user-scoped GET/PUT /api/settings |
| `b118512` | ~15:14 UTC | feat(db): add tags (user_id, name) compound unique constraint |
| `7a9d3d5f` | 13:20 UTC | feat(workflow): Tier 5 — wait_for_event + error handler + UI inspectors |
| `5a8e264f` | 13:17 UTC | feat(workflow): add support for switch and sub_workflow node types |
| `662cc96f` | 11:07 UTC | feat(canvas): Tier 4 — visual workflow + agent library canvases |
| `def93478` | 11:12 UTC | watchdog: Tier 1+4 agents/MCP runtime + visual canvas noted |

### P0 — USER_SCOPING_SPEC.md (ALL DONE ✅)

- ✅ `b118512` — tags table: userId + compound unique constraint
- ✅ `84dbba7` — GET/PUT /api/settings (user-scoped)
- ✅ `41306b2` — POST /api/prospects: userId injection
- ✅ `41306b2` — POST /api/templates: userId injection
- ✅ `41306b2` — PUT /api/campaigns/:id: userId check/scoping
- ✅ `b17b780` — POST /api/campaigns/:id/steps + per-step CRUD

### Tier 5 Workflow Engine (DONE per commits 5a8e264f + 7a9d3d5f)
- ✅ `switch` node: fully functional — cases editor, label/when pairs, default fallthrough
- ✅ `sub_workflow` node: inspector, DB schema (errorHandlerCampaignId), execution stub
- ✅ `wait_for_event` node: durable createHook suspension, deterministic token, POST webhook
- ✅ Top-level try/catch + `notifyErrorHandler` step
- ✅ Tests: 152/157 passing (5 pre-existing failures)

### Tier 4 Canvas (DONE per commit 662cc96f)
- ✅ FlowNode, ResourceNode, Palette components + dagre auto-layout
- ✅ Campaign workflow canvas (/campaigns/[id]/workflow)
- ✅ Agent library canvas (/agents/[id])

---

## Pending Work 🔄

### P2 — AI (IN PROGRESS 🔄)
- 🔄 /api/ai/suggest-reply — Claude relaunched 16:08 UTC to implement this

### Tier 5 — Sub-workflow recursion (partial)
- [ ] Graph-level recursion for sub_workflow execution (currently stubbed)

---

## Resume Instructions

1. ✅ Repo at ~/Projects/ai-sdr (clean working tree)
2. ✅ Claude binary: v2.1.141
3. 🔄 Claude: relaunched PID 55157 (16:08 UTC wake)
4. Next: /api/ai/suggest-reply (P2), then sub-workflow recursion

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
