"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { EventTypesInput } from "./event-types-input"
import { WebhookSecretReveal } from "./webhook-secret-reveal"
import { useCreateWebhookMutation } from "../../hooks/use-webhooks"
import { matchCode } from "../../errors/farsight-error"

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebhookCreateModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FieldErrors = {
  url?: string
  eventTypes?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Form Dialog for creating a webhook endpoint.
 *
 * On success: closes the form and shows WebhookSecretReveal with the
 * one-time signing secret (D-14).
 *
 * D-14 (LOCKED): revealedSecret lives only in local useState — cleared by
 * setRevealedSecret(null) when the reveal modal closes. Never stored in cache.
 */
export function WebhookCreateModal({ open, onOpenChange }: WebhookCreateModalProps) {
  const [url, setUrl] = React.useState("")
  const [eventTypes, setEventTypes] = React.useState<string[]>([])
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)

  const createMutation = useCreateWebhookMutation()

  function resetForm() {
    setUrl("")
    setEventTypes([])
    setFieldErrors({})
  }

  function handleClose() {
    resetForm()
    onOpenChange(false)
  }

  function validate(): boolean {
    const errors: FieldErrors = {}
    if (!url.startsWith("https://")) {
      errors.url = "URL must use HTTPS"
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return false
    }
    setFieldErrors({})
    return true
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    createMutation.mutate(
      { url, eventTypes },
      {
        onSuccess: (data) => {
          setRevealedSecret(data.signingSecret)
          resetForm()
          onOpenChange(false)
        },
        onError: (err) => {
          if (matchCode(err, "validation.*")) {
            // Surface per-field validation errors from error.details
            const details = (err as { details?: Record<string, string[]> }).details
            if (details && typeof details === "object") {
              const newErrors: FieldErrors = {}
              if (details.url) newErrors.url = details.url[0]
              if (details.eventTypes) newErrors.eventTypes = details.eventTypes[0]
              setFieldErrors(newErrors)
            } else {
              toast.error("Could not create webhook. Try again.")
            }
          } else {
            toast.error("Could not create webhook. Try again.")
          }
        },
      }
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Endpoint URL field */}
            <div className="space-y-1">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://example.com/webhooks"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={createMutation.isPending}
              />
              {fieldErrors.url && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.url}</p>
              )}
            </div>

            {/* Event types field */}
            <div className="space-y-1">
              <Label htmlFor="webhook-event-types">Event types</Label>
              <EventTypesInput
                id="webhook-event-types"
                value={eventTypes}
                onChange={setEventTypes}
                error={fieldErrors.eventTypes}
                disabled={createMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Use glob patterns, e.g. <code className="font-mono">dataset.*</code>. Max 50.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add webhook"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* D-14: Show secret exactly once after successful create */}
      {revealedSecret !== null && (
        <WebhookSecretReveal
          secret={revealedSecret}
          open={true}
          onClose={() => setRevealedSecret(null)}
        />
      )}
    </>
  )
}
