/**
 * Tests for <AgentChatView> — AGNT-01.
 *
 * Wave-0: All render/interaction tests are it.todo stubs. Wave-0 only requires
 * the import to resolve (import-safe invariant). Live tests are promoted in
 * Plan 04-05 once the full AgentChatView implementation ships.
 */
import { describe, it } from "vitest"
import { AgentChatView } from "../../src/components/agents/agent-chat-view"

// Suppress unused import warning — live import proving the import-safe invariant.
void AgentChatView

describe("AgentChatView — AGNT-01", () => {
  it.todo("renders message list with role=user and role=assistant messages")

  it.todo("role=user message renders with primary background class")

  it.todo("role=assistant message renders with muted background class")

  it.todo("chat composer textarea and submit button are present in DOM")

  it.todo("Ctrl+Enter keyboard shortcut triggers form submit")
})
