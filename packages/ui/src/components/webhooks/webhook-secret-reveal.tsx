"use client"

import * as React from "react"
import { AlertTriangle, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebhookSecretRevealProps = {
  /** The one-time signing secret to display — parent manages this in local state and clears it on close. */
  secret: string
  open: boolean
  /** Called when user clicks "I've saved it — close". Parent must clear the secret from state. */
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Copy-once reveal modal for webhook signing secrets.
 *
 * D-14 (LOCKED): secret is a prop — this component does NOT store it in local
 * state. The parent manages `revealedSecret: string | null` and clears it by
 * calling onClose, which sets parent state to null. Secret is never cached
 * persistently — it lives only in the parent's component state.
 *
 * Not dismissible by outside-click (onInteractOutside e.preventDefault()).
 * Focus is trapped inside by Radix Dialog.
 */
export function WebhookSecretReveal({ secret, open, onClose }: WebhookSecretRevealProps) {
  const [copyLabel, setCopyLabel] = React.useState<"Copy to clipboard" | "Copied!">("Copy to clipboard")

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(secret)
      setCopyLabel("Copied!")
      setTimeout(() => setCopyLabel("Copy to clipboard"), 2000)
    } catch {
      toast.error("Could not copy. Select the text above and copy manually.")
    }
  }

  // Reset copy label when modal closes
  React.useEffect(() => {
    if (!open) setCopyLabel("Copy to clipboard")
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="max-w-sm"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Save your signing secret</DialogTitle>
        </DialogHeader>

        {/* Warning banner */}
        <div className="flex gap-2 rounded-md bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">
            Copy this secret now. You won&apos;t be able to see it again.
          </p>
        </div>

        {/* Secret display */}
        <code className="block w-full rounded-md bg-muted px-3 py-2 text-sm font-mono break-all select-all">
          {secret}
        </code>

        {/* Copy button */}
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          aria-label="Copy signing secret to clipboard"
          onClick={handleCopy}
        >
          {copyLabel === "Copied!" ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy to clipboard
            </>
          )}
        </Button>

        {/* Close button */}
        <Button className="w-full mt-4" onClick={onClose}>
          I&apos;ve saved it — close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
