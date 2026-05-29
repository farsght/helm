"use client"

/**
 * NotificationPreferences — three-row preferences panel.
 *
 * Per D-11: query failure → ErrorState; mutation failure → toast (no auto-toast in hook).
 * Per UI-SPEC §4: product/marketing toggles; security row always-on (locked/disabled).
 * Per T-03-09: toast.error uses a safe user-facing string only; error.details not surfaced.
 */
import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "../ui/switch"
import { Label } from "../ui/label"
import { Separator } from "../ui/separator"
import { Skeleton } from "../ui/skeleton"
import { ErrorState } from "../page/error-state"
import {
  preferenceKeys,
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferences,
} from "../../hooks/use-notification-preferences"
import { useFarsightContext } from "../../provider/farsight-provider"

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationPreferences() {
  const { tenant } = useFarsightContext()
  const preferencesQueryOptions = useNotificationPreferencesQuery()
  const updateMutation = useUpdateNotificationPreferences()

  const { data, isLoading, isError, refetch } = useQuery(preferencesQueryOptions)

  function handleToggle(
    category: "product" | "marketing",
    emailEnabled: boolean,
  ) {
    updateMutation.mutate(
      { [category]: { emailEnabled } },
      {
        onSuccess: () => {
          toast.success("Preferences saved")
        },
        onError: () => {
          toast.error("Could not save preferences. Try again.")
        },
      },
    )
  }

  // Loading state: 3 skeleton rows with separators
  if (isLoading) {
    return (
      <div
        data-slot="notification-preferences"
        className="rounded-lg border bg-card p-6 space-y-4"
      >
        <h3 className="text-base font-medium mb-4">Notification preferences</h3>
        <Skeleton className="h-8 w-full" />
        <Separator />
        <Skeleton className="h-8 w-full" />
        <Separator />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div
        data-slot="notification-preferences"
        className="rounded-lg border bg-card p-6"
      >
        <ErrorState
          title="Could not load preferences"
          description="Check your connection and try again."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div
      data-slot="notification-preferences"
      className="rounded-lg border bg-card p-6 space-y-4"
    >
      <h3 className="text-base font-medium mb-4">Notification preferences</h3>

      {/* Product row */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="pref-product" className="text-sm font-medium">
            Product updates
          </Label>
          <p className="text-xs text-muted-foreground">
            Feature releases and improvements
          </p>
        </div>
        <Switch
          id="pref-product"
          checked={data?.product.emailEnabled ?? false}
          onCheckedChange={(checked) => handleToggle("product", checked)}
          disabled={updateMutation.isPending}
          aria-label="Product updates email notifications"
        />
      </div>

      <Separator />

      {/* Marketing row */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="pref-marketing" className="text-sm font-medium">
            Marketing
          </Label>
          <p className="text-xs text-muted-foreground">
            News, tips, and special offers
          </p>
        </div>
        <Switch
          id="pref-marketing"
          checked={data?.marketing.emailEnabled ?? false}
          onCheckedChange={(checked) => handleToggle("marketing", checked)}
          disabled={updateMutation.isPending}
          aria-label="Marketing email notifications"
        />
      </div>

      <Separator />

      {/* Security row — always on, locked */}
      <div className="flex items-center justify-between gap-4 opacity-50 cursor-not-allowed">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <Label htmlFor="pref-security" className="text-sm font-medium cursor-not-allowed">
              Security alerts
            </Label>
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Account security and sign-in activity
          </p>
        </div>
        <Switch
          id="pref-security"
          checked={true}
          disabled={true}
          aria-label="Security alerts email notifications"
        />
      </div>
    </div>
  )
}
