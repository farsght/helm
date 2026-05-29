/**
 * @farsight/ui — useApiClient hook.
 *
 * STUB: Placeholder created by Plan 03-01. Plan 03-02 replaces with real implementation.
 */
import * as React from "react"
import { FarsightContext } from "./farsight-provider"
import type { ApiClient } from "@farsight/sdk"

export function useApiClient(): ApiClient {
  const ctx = React.useContext(FarsightContext)
  if (!ctx) throw new Error("useApiClient: must be used inside <FarsightProvider>")
  return ctx.client
}
