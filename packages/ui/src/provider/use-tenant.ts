/**
 * @farsight/ui — useTenant hook.
 *
 * STUB: Placeholder created by Plan 03-01. Plan 03-02 replaces with real implementation.
 */
import * as React from "react"
import { FarsightContext } from "./farsight-provider"
import type { TenantContext } from "./farsight-provider"

export function useTenant(): TenantContext {
  const ctx = React.useContext(FarsightContext)
  if (!ctx) throw new Error("useTenant: must be used inside <FarsightProvider>")
  return ctx.tenant
}
