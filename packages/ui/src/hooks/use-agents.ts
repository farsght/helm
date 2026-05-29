/**
 * @farsight/ui — agent chat polling hooks.
 *
 * Provides queryOptions factory with 2s polling for real-time chat UX (D-07
 * amended: tighter interval for agents vs 10s notifications) and a submit
 * mutation that invalidates the specific chat thread on success.
 *
 * No "use client" — hook files do not carry the directive; the component that calls them does.
 *
 * NOTE: Agents are NOT project-scoped in the Farsight contracts — no orgSlug/projectSlug
 * in agentsRoutes params. Do NOT add an enabled:!!projectSlug guard (T-04-05-ID accepted).
 * The agentDefinitionId is consumer-provided (static registry entry).
 *
 * NOTE: The @farsight/sdk ApiClient type infers methods as no-arg when the
 * `apiRoutes as const satisfies ApiRoutesManifest` loses generic precision.
 * Calls that pass args are cast via `(fn as AnyFn)({...})` — the runtime
 * implementation is correct; this is a known TS inference limitation in the SDK.
 */
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { useFarsightContext } from "../provider/farsight-provider"

// ─── Key factory ──────────────────────────────────────────────────────────────

/**
 * Agent query key factory.
 *
 * Scoped by agentDefinitionId only — agents are not project-scoped.
 * chatId defaults to "default" when not provided so the key remains stable.
 */
export const agentKeys = {
  messages: (agentDefinitionId: string, chatId?: string) =>
    ["agents", agentDefinitionId, chatId ?? "default", "messages"] as const,
}

// ─── Type helpers for SDK call workaround ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => Promise<any>

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns a queryOptions object for polling agent chat messages.
 *
 * Per D-07 (amended for agents):
 * - refetchInterval: 2_000 — 2s poll for chat UX (tighter than notification 10s)
 * - refetchIntervalInBackground: false — polling pauses when tab is hidden
 * - staleTime: 1_000
 * - enabled: !!agentDefinitionId — disabled when no agent selected
 *
 * Agents are NOT project-scoped — no enabled:!!projectSlug guard (see T-04-05-ID).
 */
export function useAgentMessagesQueryOptions(agentDefinitionId: string, chatId?: string) {
  const { client } = useFarsightContext()
  return queryOptions({
    queryKey: agentKeys.messages(agentDefinitionId, chatId),
    queryFn: () =>
      (client.agents.messages as AnyFn)({
        params: { agentDefinitionId },
        query: chatId ? { chatId } : undefined,
      }),
    refetchInterval: 2_000,              // 2s poll for real-time chat UX (D-07)
    refetchIntervalInBackground: false,  // pauses when tab hidden (T-04-05-D accepted)
    staleTime: 1_000,
    enabled: !!agentDefinitionId,
  })
}

/**
 * Submit a message to an agent chat thread.
 *
 * On success: invalidates the messages key for the returned chatId so the
 * polling query immediately re-fetches the updated thread.
 *
 * The returned `data.chatId` is used for invalidation — not the input `body.chatId` —
 * because the first submit creates a new chat thread and returns the server-assigned ID.
 */
export function useSubmitAgentMessage(agentDefinitionId: string) {
  const { client } = useFarsightContext()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { message: string; chatId?: string }) =>
      (client.agents.submit as AnyFn)({ params: { agentDefinitionId }, body }),
    onSuccess: (data) =>
      qc.invalidateQueries({
        queryKey: agentKeys.messages(agentDefinitionId, data.chatId),
      }),
  })
}
