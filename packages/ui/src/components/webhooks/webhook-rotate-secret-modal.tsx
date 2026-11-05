"use client"

import * as React from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "../page/confirm-dialog"
import { WebhookSecretReveal } from "./webhook-secret-reveal"
import { useRotateWebhookSecretMutation } from "../../hooks/use-webhooks"

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebhookRotateSecretModalProps = {
  /** The webhook ID to rotate — null when not rotating */
  webhookId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Two-step rotate-secret flow (D-15):
 *  Step 1 — ConfirmDialog (destructive=true) to confirm rotation.
 *  Step 2 — On confirm + success: WebhookSecretReveal shows new secret once.
 *
 * D-14 (LOCKED): revealedSecret lives only in local useState — cleared by
 * setRevealedSecret(null) when the reveal modal closes. Never stored in cache.
 * D-15 (LOCKED): ConfirmDialog gates the rotation — no bypass via component UI.
 */
export function WebhookRotateSecretModal({
  webhookId,
  open,
  onOpenChange,
}: WebhookRotateSecretModalProps) {
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)
  const rotateMutation = useRotateWebhookSecretMutation()

  function handleConfirm() {
    if (!webhookId) return
    rotateMutation.mutate(webhookId, {
      onSuccess: (data) => {
        setRevealedSecret(data.signingSecret)
        onOpenChange(false)
      },
      onError: () => {
        toast.error("Could not rotate secret. Try again.")
      },
    })
  }

  return (
    <>
      {/* Step 1: ConfirmDialog gate */}
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Rotate signing secret?"
        description="Your current secret will be invalidated immediately. Any webhook consumers using the old secret will start receiving 401 errors until they update."
        confirmLabel={rotateMutation.isPending ? "Rotating..." : "Rotate secret"}
        cancelLabel="Keep current"
        destructive={true}
        onConfirm={handleConfirm}
      />

      {/* Step 2: Show new secret exactly once on success */}
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
