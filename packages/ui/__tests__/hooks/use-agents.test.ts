/**
 * Tests for useAgents polling hooks — AGNT-01.
 *
 * Wave-0: Concrete key-factory assertions run against the import-safe stub
 * created in Plan 04-01. Deeper behaviour covered by it.todo stubs, promoted
 * to live assertions in Plan 04-05 once the full implementation ships.
 */
import { describe, expect, it } from "vitest"
import { agentKeys } from "../../src/hooks/use-agents"

describe("useAgents — AGNT-01", () => {
  it("agentKeys.messages scoped to agentDefinitionId and chatId", () => {
    const key = agentKeys.messages("agent-1", "chat-1")

    // Key must contain both the agentDefinitionId and chatId
    expect(key).toContain("agent-1")
    expect(key).toContain("chat-1")
    expect(Array.isArray(key)).toBe(true)
  })

  it("agentKeys.messages different agentDefinitionId → different key (isolation)", () => {
    const keyA = agentKeys.messages("agent-alpha", "chat-x")
    const keyB = agentKeys.messages("agent-beta", "chat-x")
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB))
  })

  it("agentKeys.messages defaults chatId to 'default' when not provided", () => {
    const key = agentKeys.messages("agent-1")
    expect(key).toContain("default")
  })

  it.todo("useAgentMessagesQueryOptions enabled=false when agentDefinitionId is empty string")

  it.todo("useAgentMessagesQueryOptions has refetchInterval=2000 for polling (D-07)")

  it.todo("useSubmitAgentMessage calls POST .../submit and invalidates messages key on success")
})
