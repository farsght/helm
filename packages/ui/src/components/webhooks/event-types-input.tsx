"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventTypesInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  error?: string
  disabled?: boolean
  id?: string
}

// ─── Suggested patterns ───────────────────────────────────────────────────────

const SUGGESTED_PATTERNS = ["dataset.*", "agent.run.completed", "pipeline.run.completed", "webhook.*"]

const MAX_TAGS = 50
const MAX_TAG_LENGTH = 100

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Chip/tag input for free-form glob event-type patterns.
 *
 * Enter or comma key → appends tag (trimmed, deduplicated, 1-100 chars, max 50).
 * Backspace on empty input → removes last tag.
 * Suggestions shown as ghost Button chips below the input.
 */
export function EventTypesInput({ value, onChange, error, disabled, id }: EventTypesInputProps) {
  const [inputValue, setInputValue] = React.useState("")
  const labelId = id ? `${id}-label` : undefined

  function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag) return
    if (tag.length > MAX_TAG_LENGTH) return
    if (value.includes(tag)) return
    if (value.length >= MAX_TAGS) return
    onChange([...value, tag])
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(inputValue)
      setInputValue("")
    } else if (e.key === "Backspace" && inputValue === "") {
      if (value.length > 0) {
        onChange(value.slice(0, -1))
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow typing comma to trigger add; don't keep the comma in input
    const val = e.target.value
    if (val.endsWith(",")) {
      addTag(val.slice(0, -1))
      setInputValue("")
    } else {
      setInputValue(val)
    }
  }

  const atMax = value.length >= MAX_TAGS
  const showError = error || atMax

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="space-y-2"
    >
      {/* Existing tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag, index) => (
            <Badge
              key={`${tag}-${index}`}
              variant="outline"
              className={cn("gap-1", disabled && "opacity-50")}
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => removeTag(index)}
                  className="rounded-sm focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <X className="h-3 w-3 cursor-pointer" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Text input */}
      <Input
        aria-label="Event types"
        placeholder="Type and press Enter or comma"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled || atMax}
      />

      {/* Validation error */}
      {showError && (
        <p className="text-xs text-destructive">
          {error || `Maximum ${MAX_TAGS} event types allowed.`}
        </p>
      )}

      {/* Suggested patterns */}
      <div className="flex flex-wrap gap-1">
        <span className="text-xs text-muted-foreground mr-1 self-center">Suggested:</span>
        {SUGGESTED_PATTERNS.map((pattern) => (
          <Button
            key={pattern}
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={disabled || value.includes(pattern) || atMax}
            onClick={() => {
              addTag(pattern)
            }}
          >
            {pattern}
          </Button>
        ))}
      </div>
    </div>
  )
}
