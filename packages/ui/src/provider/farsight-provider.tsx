"use client"
/**
 * @farsight/ui — FarsightProvider context.
 *
 * STUB: This file is a placeholder created by Plan 03-01 (Wave-0).
 * Plan 03-02 replaces this with the real implementation.
 */
import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ApiClient } from "@farsight/sdk"

export type TenantContext = {
  userId: string
  orgId: string | null
  orgSlug: string | null
  role: string | null
  projectSlug?: string | null
}

export type FarsightContextValue = {
  client: ApiClient
  tenant: TenantContext
}

export const FarsightContext = React.createContext<FarsightContextValue | null>(null)

export type FarsightProviderProps = {
  baseUrl?: string
  projectSlug?: string | null
  queryClient?: QueryClient
  onError?: (error: unknown, code: string | null) => void
  children: React.ReactNode
  // Test-only props (Wave-0 stub; real implementation uses Clerk hooks)
  _testClient?: ApiClient
  _testUserId?: string
  _testOrgSlug?: string | null
}

const DEFAULT_QUERY_CLIENT = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
})

export function FarsightProvider({
  projectSlug = null,
  queryClient,
  children,
  _testClient,
  _testUserId = "",
  _testOrgSlug = null,
}: FarsightProviderProps) {
  // STUB: Real implementation uses useAuth() + useOrganization() from @clerk/react.
  // Test-only path: props are injected directly.
  const qc = queryClient ?? DEFAULT_QUERY_CLIENT

  if (!_testClient) {
    // In production, FarsightProvider would call createApiClient here.
    // This stub throws to prevent silent use outside tests.
    throw new Error(
      "FarsightProvider STUB: _testClient must be provided until Plan 03-02 ships the real implementation.",
    )
  }

  const tenant: TenantContext = {
    userId: _testUserId,
    orgId: _testOrgSlug ? `org_${_testOrgSlug}` : null,
    orgSlug: _testOrgSlug,
    role: null,
    projectSlug: projectSlug ?? null,
  }

  const value: FarsightContextValue = {
    client: _testClient,
    tenant,
  }

  return React.createElement(
    FarsightContext.Provider,
    { value },
    React.createElement(QueryClientProvider, { client: qc }, children),
  )
}

export function useFarsightContext(): FarsightContextValue {
  const ctx = React.useContext(FarsightContext)
  if (!ctx) throw new Error("useFarsightContext: must be used inside <FarsightProvider>")
  return ctx
}
