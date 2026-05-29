"use client"

/**
 * AgentChatView — full-height chat surface with polling, auto-scroll, and composer.
 *
 * Polls agent messages at a 2s interval (or consumer-supplied interval) via
 * useAgentMessagesQueryOptions. Renders a message list with loading/error/empty
 * three-branch, auto-scrolls to the bottom on new messages, and provides a
 * Textarea + submit button composer.
 *
 * A11y contract:
 * - role="log" aria-live="polite" on message list (screen-reader live region)
 * - aria-label="Message input" on Textarea
 * - aria-label="Send message" on send Button
 * - Ctrl+Enter / Cmd+Enter submits (not bare Enter — multi-line input)
 * - aria-describedby="composer-hint" + sr-only hint text
 */
import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Bot, Send, Loader2, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { ScrollArea } from "../ui/scroll-area"
import { Skeleton } from "../ui/skeleton"
import { ErrorState } from "../page/error-state"
import { EmptyState } from "../page/empty-state"
import { AgentMessage, type Message } from "./agent-message"
import { useAgentMessagesQueryOptions, useSubmitAgentMessage } from "../../hooks/use-agents"

// ─── Props ─────────────────────────────────────────────────────────────────────

export type AgentChatViewProps = {
  /** Consumer-supplied agent registry ID (e.g. "research-agent"). */
  agentDefinitionId: string
  /** Human-readable label shown in the header. Defaults to agentDefinitionId. */
  agentLabel?: string
  /** Chat thread ID for resuming an existing conversation. */
  chatId?: string
  /**
   * Polling interval in ms. Set to `false` to disable polling.
   * Defaults to 2_000 per D-07 (chat UX — tighter than notifications).
   */
  interval?: number | false
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentChatView({ agentDefinitionId, agentLabel, chatId, interval }: AgentChatViewProps) {
  const qOptions = useAgentMessagesQueryOptions(agentDefinitionId, chatId)
  const { data, isLoading, isError, refetch, isFetching } = useQuery(qOptions)
  const submitMutation = useSubmitAgentMessage(agentDefinitionId)
  const [message, setMessage] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const messages: Message[] = (data?.messages ?? []) as Message[]

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    submitMutation.mutate(
      { message, chatId },
      { onError: () => toast.error("Could not send message. Try again.") },
    )
    setMessage("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      // Cast: React.KeyboardEvent → React.FormEvent for handleSubmit signature
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div data-slot="agent-chat-view" className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2 flex-shrink-0">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-base font-medium">{agentLabel ?? agentDefinitionId}</h2>
        {isFetching && (
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
        )}
        <span className="sr-only" aria-live="polite">
          {isFetching ? "New messages" : ""}
        </span>
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div
          role="log"
          aria-label="Chat messages"
          aria-live="polite"
          className="p-4 space-y-2"
        >
          {isLoading ? (
            // 3 skeleton rows per UI-SPEC §7
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)
          ) : isError ? (
            <ErrorState
              title="Could not load messages"
              description="Check your connection and try again."
              onRetry={refetch}
            />
          ) : messages.length === 0 ? (
            <EmptyState
              title="Start a conversation"
              description="Send a message to begin."
              icon={MessageCircle}
            />
          ) : (
            messages.map((msg) => <AgentMessage key={msg.id} message={msg} />)
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t bg-card px-4 py-2 flex-shrink-0">
        <form className="flex gap-2 items-end" onSubmit={handleSubmit}>
          <Textarea
            placeholder="Message the agent..."
            className="flex-1 min-h-[80px] resize-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message input"
            aria-describedby="composer-hint"
          />
          <span id="composer-hint" className="sr-only">
            Press Ctrl+Enter to send
          </span>
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || submitMutation.isPending}
            aria-label="Send message"
            className="flex-shrink-0 self-end"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
