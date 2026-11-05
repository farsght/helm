---
phase: 04-contract-gated-surfaces-monorepo-port
plan: "05"
subsystem: ui
tags: [agents, chat, polling, farsight-contracts, AGNT-01]

requires:
  - phase: 04-contract-gated-surfaces-monorepo-port
    provides: "04-01 import-safe stubs + test harness for AGNT-01"
  - phase: 03-adapter-seam-tenancy-notifications-proving-ground
    provides: "FarsightProvider + useFarsightContext + Phase-3 polling seam"

provides:
  - use-agents.ts: agentKeys factory + useAgentMessagesQueryOptions (2s poll) + useSubmitAgentMessage mutation
  - AgentMessage: role-based chat bubble component with XSS guard (React text nodes only)
  - AgentChatView: full-height chat surface with polling, auto-scroll, Ctrl+Enter, a11y attributes
  - agents/index.ts: surface barrel for agents exports
  - src/index.ts: agent hooks + agent surfaces block registered (tsdown barrel-export trap prevention)

affects:
  - packages/ui/src/hooks/use-agents.ts (overwritten stub with real implementation)
  - packages/ui/src/components/agents/agent-chat-view.tsx (overwritten stub with real implementation)
  - packages/ui/src/components/agents/agent-message.tsx (created)
  - packages/ui/src/components/agents/index.ts (created)
  - packages/ui/src/index.ts (appended agent block)

tech-stack:
  added: []
  patterns:
    - "2s refetchInterval polling pattern (tighter than notification 10s — chat UX)"
    - "Role-based chat bubble (user/assistant/system) with XSS text-node guard"
    - "AnyFn SDK cast workaround (inherited from use-notifications.ts pattern)"
    - "Ctrl+Enter / Cmd+Enter compose-and-submit (multi-line textarea)"

key-files:
  created:
    - packages/ui/src/components/agents/agent-message.tsx
    - packages/ui/src/components/agents/index.ts
  modified:
    - packages/ui/src/hooks/use-agents.ts
    - packages/ui/src/components/agents/agent-chat-view.tsx
    - packages/ui/src/index.ts

decisions:
  - "Agents are NOT project-scoped (no orgSlug/projectSlug in agentKeys or queryOptions enabled guard) — per Farsight agentsRoutes contract shape and T-04-05-ID accept decision"
  - "Message type defined locally in agent-message.tsx and re-exported to avoid circular imports from hook file"
  - "XSS guard: parts rendered as React text nodes via {p.text}; unknown part types filtered by p.type==='text'; no dangerouslySetInnerHTML anywhere"

metrics:
  duration: "~15 minutes"
  completed: "2026-05-29T21:36:37Z"
  tasks: 2
  files: 5
---

# Phase 04 Plan 05: Agents Chat Surface (AGNT-01) Summary

Agents chat vertical: real polling hook factory + `AgentChatView` / `AgentMessage` components bound to Farsight `agentsRoutes` (submit + messages), no canvas.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | use-agents.ts hook factory (polling queryOptions + submit mutation) | ffc9cf2 | packages/ui/src/hooks/use-agents.ts |
| 2 | AgentChatView + AgentMessage + index barrel + src/index.ts registration | 4776fbe | agent-chat-view.tsx, agent-message.tsx, agents/index.ts, src/index.ts |

## What Was Built

**`packages/ui/src/hooks/use-agents.ts`** — Real implementation overwriting the 04-01 stub:
- `agentKeys.messages(agentDefinitionId, chatId?)` → `["agents", agentDefinitionId, chatId ?? "default", "messages"]`
- `useAgentMessagesQueryOptions`: `refetchInterval: 2_000`, `refetchIntervalInBackground: false`, `staleTime: 1_000`, `enabled: !!agentDefinitionId`; no projectSlug guard (agents not project-scoped)
- `useSubmitAgentMessage`: `mutationFn` calls `client.agents.submit`; `onSuccess` invalidates `agentKeys.messages(agentDefinitionId, data.chatId)` using the returned chatId

**`packages/ui/src/components/agents/agent-message.tsx`** — Role-based chat bubble:
- System: centered italic muted `<p>` text
- User: `flex-row-reverse`, primary background bubble, "U" avatar
- Assistant: `flex-row`, muted background bubble, Bot icon avatar
- `article` with `aria-label="{role} message"` for screen reader disambiguation
- All parts filtered by `p.type === "text"` and rendered as `{p.text}` — no injection surface

**`packages/ui/src/components/agents/agent-chat-view.tsx`** — Full chat UI:
- `useQuery(useAgentMessagesQueryOptions)` + `useSubmitAgentMessage` wired
- Auto-scroll via `useEffect` watching `messages.length`
- Three-branch: 3 `Skeleton` rows (loading), `ErrorState` (error), `EmptyState "Start a conversation"` (empty), message list (data)
- `role="log" aria-live="polite"` on message list div
- `aria-label="Message input"` on `Textarea`, `aria-label="Send message"` on send `Button`
- `Ctrl+Enter` / `Cmd+Enter` submits via `handleKeyDown`; bare Enter does NOT submit (multi-line input)
- `submitMutation.isPending` disables send button + shows `Loader2` spinner
- `data-slot="agent-chat-view"` on root div
- sr-only polling indicator + `aria-describedby="composer-hint"` hint

## Deviations from Plan

None — plan executed exactly as written.

The XSS check `grep -r "dangerouslySetInnerHTML" packages/ui/src/components/agents/` initially returned comment lines referencing the pattern name. Comments were reworded to avoid the string; actual JSX usage was never present. The check `grep -rn "dangerouslySetInnerHTML=" packages/ui/src/components/agents/` (with `=`) confirmed clean from the start.

## Verification Results

```
npx vitest run __tests__/hooks/use-agents.test.ts
  3 passed (key-factory tests), 3 todo (it.todo stubs unchanged)

npx vitest run __tests__/components/agents.test.tsx
  5 todo (import resolves — import-safe invariant satisfied)

Full suite: 24 passed | 2 skipped (xyflow-dependent) | 0 new failures

grep -rn "dangerouslySetInnerHTML" packages/ui/src/components/agents/  → EMPTY - PASS
grep "role=\"log\"" agent-chat-view.tsx                                 → FOUND - PASS
bash scripts/check-imports.sh                                            → PASS
bash scripts/check-directives.sh                                         → PASS
npx tsc --noEmit -p tsconfig.json                                        → clean (0 errors)
```

## Threat Surface Scan

No new threat surface beyond what the plan's `<threat_model>` already catalogued:
- T-04-05-T1 (XSS via agent content) — mitigated: React text nodes, no injection surface
- T-04-05-T2 (submit input) — accepted
- T-04-05-ID (agent key scope) — accepted
- T-04-05-D (2s polling DoS) — accepted (refetchIntervalInBackground: false)

## Self-Check: PASSED

- [x] `packages/ui/src/hooks/use-agents.ts` — exists, real implementation
- [x] `packages/ui/src/components/agents/agent-chat-view.tsx` — exists, real implementation
- [x] `packages/ui/src/components/agents/agent-message.tsx` — exists
- [x] `packages/ui/src/components/agents/index.ts` — exists
- [x] `packages/ui/src/index.ts` — agent block appended (lines 141–149)
- [x] Task 1 commit ffc9cf2 — verified in git log
- [x] Task 2 commit 4776fbe — verified in git log
