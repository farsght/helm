/**
 * Reusable test wrapper for <FarsightProvider> with a mock SDK client.
 * Used as the `wrapper` option in renderHook / render calls across all Phase-3 tests.
 */
import * as React from "react";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "@farsight/sdk";
import { FarsightProvider } from "../../src/provider/farsight-provider";
import { createMockFetch } from "./mock-fetch";

export const mockFetch = createMockFetch();

export const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      // Disable gc so tests can assert on stale data without cache eviction
      gcTime: Infinity,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const testApiClient = createApiClient({
  baseUrl: "",
  getToken: async () => "test-token",
  fetchImpl: mockFetch as typeof fetch,
});

export type TestProviderProps = {
  children: React.ReactNode;
  orgSlug?: string | null;
  userId?: string;
  projectSlug?: string | null;
  queryClient?: QueryClient;
};

/**
 * TestProvider wraps children in FarsightProvider with a mock SDK client
 * and a fresh QueryClient (retry: 0) for predictable test behaviour.
 */
export function TestProvider({
  children,
  orgSlug = "test-org",
  userId = "user_test",
  projectSlug = null,
  queryClient,
}: TestProviderProps) {
  const qc = queryClient ?? testQueryClient;

  return (
    <FarsightProvider
      baseUrl=""
      projectSlug={projectSlug}
      queryClient={qc}
      _testClient={testApiClient}
      _testUserId={userId}
      _testOrgSlug={orgSlug}
    >
      {children}
    </FarsightProvider>
  );
}
