"use client"

/**
 * AgentMessage — role-based chat bubble component.
 *
 * Renders user/assistant/system messages with role-appropriate visual treatment.
 *
 * XSS GUARD (T-04-05-T1): Parts are rendered as React text nodes only.
 * React's JSX escaping prevents injection via agent response content.
 * Unknown part types (type !== "text") are silently skipped.
 */
import { cn } from "../../lib/utils"
import { Bot } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentMessagePart = { type: string; text?: string }

export type Message = {
  id: string
  role: "user" | "assistant" | "system"
  parts: AgentMessagePart[]
  createdAt?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentMessage({ message }: { message: Message }) {
  const { role, parts } = message

  // System messages: centered italic muted text
  if (role === "system") {
    return (
      <p className="text-xs text-muted-foreground italic text-center my-2 px-4">
        {parts.filter((p) => p.type === "text").map((p) => p.text).join("")}
      </p>
    )
  }

  return (
    <article
      aria-label={`${role} message`}
      className={cn(
        "flex items-end gap-2 mb-2",
        role === "user" ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      {role === "user" ? (
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium flex-shrink-0">
          U
        </div>
      ) : (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2",
          role === "user"
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {parts
          .filter((p) => p.type === "text")
          .map((p, i) => (
            // XSS guard: render as plain text node — React escapes all special chars
            <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
              {p.text}
            </p>
          ))}
      </div>
    </article>
  )
}
