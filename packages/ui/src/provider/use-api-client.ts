import * as React from "react"
import { FarsightContext } from "./farsight-provider"
import type { ApiClient } from "@farsight/sdk"

/**
 * Returns the typed API client from FarsightProvider context.
 * Throws when used outside <FarsightProvider>.
 *
 * Consumers should use surface-specific hooks (useNotificationsQueryOptions,
 * useWebhooksQueryOptions, etc.) rather than calling the client directly.
 */
export function useApiClient(): ApiClient {
  const ctx = React.useContext(FarsightContext)
  if (!ctx) throw new Error("useApiClient: must be used inside <FarsightProvider>")
  return ctx.client
}
