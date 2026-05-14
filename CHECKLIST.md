# ai-sdr CHECKLIST.md

_Last updated: 2026-05-14 16:23 UTC by farsight watchdog_

---

## 🎉 Tier 5 Sub-workflow Recursion DONE (16:16 UTC)

Claude committed `476946e` at 16:16 UTC — sub_workflow inline recursion implemented. **Local only, not yet pushed to remote.** Claude exited cleanly after commit (7 min ago — under 30-min threshold, no wake sent).

---

## Completed Work ✅

| Commit | Time | Status | Description |
|---|---|---|---|
| `476946e` | 16:16 UTC | ⚠️ LOCAL ONLY | feat(workflow): implement sub_workflow inline recursion (Tier 5) |
| `b17b780` | ~15:16 UTC | ✅ Remote | feat(api): add POST /api/campaigns/:id/steps and per-step CRUD route |
| `41306b2` | ~15:15 UTC | ✅ Remote | fix(api): inject userId on prospect import; verify scoping on prospects/templates/campaigns |
| `84dbba7` | ~15:15 UTC | ✅ Remote | feat(api): add user-scoped GET/PUT /api/settings |
| `b118512` | ~15:14 UTC | ✅ Remote | feat(db): add tags (user_id, name) compound unique constraint |
| `7a9d3d5f` | 13:20 UTC | ✅ Remote | feat(workflow): Tier 5 — wait_for_event + error handler + UI inspectors |
| `5a8e264f` | 13:17 UTC | ✅ Remote | feat(workflow): add support for switch and sub_workflow node types |
| `662cc96f` | 11:07 UTC | ✅ Remote | feat(canvas): Tier 4 — visual workflow + agent library canvases |
| `def93478` | 11:12 UTC | ✅ Remote | watchdog: Tier 1+4 agents/MCP runtime + visual canvas noted |

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
- ✅ `476946e` — Sub-workflow inline recursion: graph-level recursion for sub_workflow execution (**LOCAL ONLY, not pushed**)
- ✅ Tests: 152/157 passing (5 pre-existing failures)

### Tier 4 Canvas (DONE ✅)
- ✅ FlowNode, ResourceNode, Palette components + dagre auto-layout
- ✅ Campaign workflow canvas (/campaigns/[id]/workflow)
- ✅ Agent library canvas (/agents/[id])

---

## Pending Work 🔄

### P2 — AI (NOT STARTED)
- [ ] /api/ai/suggest-reply — Not yet implemented (Claude exited after Tier 5 recursion commit)

### Git push needed
- ⚠️ `476946e` is local-only — needs `git push` to reach remote

---

## Resume Instructions

1. ✅ Repo at ~/Projects/ai-sdr (clean working tree, 1 commit ahead of origin)
2. ✅ Claude binary: v2.1.141
3. 🔴 Claude: stopped (clean exit after 16:16 UTC commit — 7 min idle)
4. Next: push `476946e`, then /api/ai/suggest-reply (P2)

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
