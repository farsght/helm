"use client"

import * as React from "react"
import { useAuth, useOrganization } from "@clerk/react"
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query"
import { createApiClient, type ApiClient } from "@farsight/sdk"
import { toFarsightError, matchCode } from "../errors/farsight-error"

// ─── Tenant context shape ──────────────────────────────────────────────────

export type TenantContext = {
  userId: string
  orgId: string | null
  orgSlug: string | null
  role: string | null
  projectSlug?: string | null
}

// ─── FarsightContext value type ────────────────────────────────────────────

export type FarsightContextValue = {
  client: ApiClient
  tenant: TenantContext
}

export const FarsightContext = React.createContext<FarsightContextValue | null>(null)

// ─── Provider props ────────────────────────────────────────────────────────

export type FarsightProviderProps = {
  /**
   * Base URL for the Farsight API. Defaults to '' (same-origin).
   * Example: 'https://api.farsght.com'
   */
  baseUrl?: string
  /**
   * The active project slug, supplied by the consumer (apps/web owns routing).
   * Webhook hooks require this; notifications/preferences hooks work without it.
   *
   * @note D-03 CONSUMER RESPONSIBILITY:
   * To prevent cross-tenant cache bleed on org or project switch, the consumer
   * MUST key this provider on the active org + project:
   *
   *   <FarsightProvider
   *     key={`${orgSlug}:${projectSlug ?? ''}`}
   *     projectSlug={projectSlug}
   *   >
   *
   * Changing the `key` prop causes React to fully unmount + remount the provider,
   * which discards the QueryClient cache. Query keys are also namespaced by slug
   * as defense-in-depth, but the key= remount is the primary cache-reset mechanism.
   */
  projectSlug?: string | null
  /**
   * Injectable QueryClient. If omitted, a new QueryClient with sane defaults is
   * created. The default client has QueryCache and MutationCache onError handlers
   * that fire the consumer's onError prop for auth.* and rbac.* codes.
   */
  queryClient?: QueryClient
  /**
   * Cross-cutting error handler. Called by QueryCache/MutationCache onError
   * for auth.* (re-auth required) and rbac.* (forbidden) error codes.
   * Per-form validation.* errors are surfaced at the hook/component level.
   */
  onError?: (error: unknown, code: string | null) => void
  children: React.ReactNode
  /**
   * @internal Test-only: inject a pre-built ApiClient to bypass Clerk hooks.
   * In tests, pass a client built via createApiClient({ fetchImpl: mockFetch }).
   */
  _testClient?: ApiClient
  /**
   * @internal Test-only: override the userId (bypasses useAuth).
   */
  _testUserId?: string
  /**
   * @internal Test-only: override the orgSlug (bypasses useOrganization).
   */
  _testOrgSlug?: string | null
}

// ─── FarsightProvider ──────────────────────────────────────────────────────

export function FarsightProvider({
  baseUrl,
  projectSlug = null,
  queryClient,
  onError,
  children,
  _testClient,
  _testUserId,
  _testOrgSlug,
}: FarsightProviderProps) {
  // Clerk hooks (no-op when _testClient is provided — test path)
  const auth = useAuth()
  const { organization } = useOrganization()

  // Derive tenant from Clerk claims OR test-injection props
  const userId: string = _testUserId ?? auth.userId ?? ""
  const orgSlug: string | null = _testOrgSlug !== undefined
    ? _testOrgSlug
    : organization?.slug ?? null
  const orgId: string | null = organization?.id ?? (orgSlug ? `org_${orgSlug}` : null)
  const role: string | null = auth.orgRole ?? null

  // Cross-cutting error handler: fires onError for auth.* and rbac.* codes (D-10)
  const handleCrossError = React.useCallback(
    (e: unknown) => {
      const fe = toFarsightError(e)
      if (
        fe &&
        fe.kind === "api" &&
        (matchCode(e, "auth.*") || matchCode(e, "rbac.*"))
      ) {
        onError?.(e, fe.code)
      }
    },
    [onError],
  )

  // Injectable QueryClient with sane defaults (D-04)
  // Constructed inside useMemo so handleCrossError is captured as a dep.
  // NOT a module-level const — that would prevent injectable override.
  const qc = React.useMemo(
    () =>
      queryClient ??
      new QueryClient({
        queryCache: new QueryCache({ onError: handleCrossError }),
        mutationCache: new MutationCache({ onError: handleCrossError }),
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
    [queryClient, handleCrossError],
  )

  // SDK client: thin-wrap createApiClient (D-05)
  // getToken comes from Clerk's useAuth(); SDK calls it per-request (T-03-02: never stored in state)
  const client = React.useMemo(
    () =>
      _testClient ??
      createApiClient({
        baseUrl: baseUrl ?? "",
        getToken: auth.getToken,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [_testClient, baseUrl, auth.getToken],
  )

  const tenant: TenantContext = {
    userId,
    orgId,
    orgSlug,
    role,
    projectSlug: projectSlug ?? null,
  }

  const value: FarsightContextValue = { client, tenant }

  return (
    <FarsightContext.Provider value={value}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </FarsightContext.Provider>
  )
}

// ─── useFarsightContext ────────────────────────────────────────────────────

/**
 * Returns the current FarsightContextValue.
 * Throws a clear error when used outside <FarsightProvider>.
 * Used by all surface hooks (useTenant, useApiClient, useNotificationsQueryOptions, etc.).
 */
export function useFarsightContext(): FarsightContextValue {
  const ctx = React.useContext(FarsightContext)
  if (!ctx) throw new Error("useFarsightContext: must be used inside <FarsightProvider>")
  return ctx
}
