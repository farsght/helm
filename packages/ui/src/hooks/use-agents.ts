// 04-01 import-safe stub. Fleshed out in 04-05 (AGNT-01).
//
// No "use client" — hook files do not carry the directive; only components do.

// ─── Key factory (LOCKED shape — agent-scoped, no org/project) ───────────────

export const agentKeys = {
  messages: (agentDefinitionId: string, chatId?: string) =>
    ["agents", agentDefinitionId, chatId ?? "default", "messages"] as const,
}

// ─── Placeholder hooks (throwing stubs) ─────────────────────────────────────

/** Stub — implemented in 04-05. */
export function useAgentMessagesQueryOptions(): never {
  throw new Error("useAgentMessagesQueryOptions: stub — implemented in 04-05 (AGNT-01)")
}

/** Stub — implemented in 04-05. */
export function useSubmitAgentMessage(): never {
  throw new Error("useSubmitAgentMessage: stub — implemented in 04-05 (AGNT-01)")
}
