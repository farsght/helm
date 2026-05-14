# ai-sdr CHECKLIST.md

_Last updated: 2026-05-14 13:08 UTC by farsight watchdog_

---

## 🔴 STALL DETECTED — Claude has been stopped for ~121 minutes

Last real commit: `662cc96f` at 11:07 UTC — Tier 4 canvas (visual workflow + agent library)
Wake events sent at: 11:41 UTC, 11:55 UTC, 12:08 UTC, 12:23 UTC, 12:38 UTC, 12:53 UTC, 13:08 UTC

⚠️ **Working directory gone** — the ai-sdr repo was in a macOS temp dir (`/private/var/folders/_8/.../T/tmp-YZJOqouVeY`) that has been cleaned up.
✅ **Repo re-cloned at 13:08 UTC** — `~/Projects/ai-sdr` now exists with `node_modules` installed.
🔴 **Claude Code NOT INSTALLED on Netrunner** — `claude` binary not found. Cannot auto-restart. **Scott must manually install or launch.**

---

## Completed Work ✅

| Commit | Time | Description |
|---|---|---|
| `662cc96f` | 11:07 UTC | feat(canvas): Tier 4 — visual workflow + agent library canvases |
| `def93478` | 11:12 UTC | watchdog: Tier 1+4 agents/MCP runtime + visual canvas noted |

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

---

## Resume Instructions

1. ✅ Repo already cloned at `~/Projects/ai-sdr` (done by watchdog at 13:08 UTC)
2. ✅ `npm install` already done
3. Install Claude Code if needed: `npm install -g @anthropic-ai/claude-code`
4. `cd ~/Projects/ai-sdr`
5. Read `USER_SCOPING_SPEC.md` for next tasks
6. Start with `db/schema.ts` — add userId to settings, tags, messages tables
7. Run migration, then build /api/settings GET+PUT routes

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
| 13:08 | Stopped | ✅ Repo re-cloned + npm install done. 🔴 claude binary NOT FOUND on Netrunner — escalated to Scott |
