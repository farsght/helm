import * as React from "react"
import { FarsightContext } from "./farsight-provider"
import type { TenantContext } from "./farsight-provider"

/**
 * Returns the current tenant context from FarsightProvider.
 * Exposes { userId, orgId, orgSlug, role, projectSlug? }.
 * Throws when used outside <FarsightProvider>.
 */
export function useTenant(): TenantContext {
  const ctx = React.useContext(FarsightContext)
  if (!ctx) throw new Error("useTenant: must be used inside <FarsightProvider>")
  return ctx.tenant
}
