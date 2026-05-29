/**
 * Tests for createApiClient thin-wrap and context hook — DATA-02.
 *
 * Wave-0: createApiClient is re-exported from src/client/create-client.ts.
 */
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../../src/client/create-client";
import { createMockFetch } from "../helpers/mock-fetch";

describe("createApiClient — DATA-02", () => {
  it("createApiClient constructed with getToken and baseUrl", () => {
    const getToken = vi.fn().mockResolvedValue("tok_test");
    const mockFetch = createMockFetch();

    const client = createApiClient({
      baseUrl: "https://api.farsght.com",
      getToken,
      fetchImpl: mockFetch as typeof fetch,
    });

    // Client must have the expected resource namespaces from @farsight/contracts
    expect(typeof client.notifications).toBe("object");
    expect(typeof client.notifications.list).toBe("function");
    expect(typeof client.webhooks).toBe("object");
    expect(typeof client.webhooks.list).toBe("function");
  });

  it("createApiClient attaches Bearer token on requests", async () => {
    const getToken = vi.fn().mockResolvedValue("my-jwt-token");
    const mockFetch = createMockFetch();
    mockFetch.respondWith({
      notifications: [],
      unreadCount: 0,
      hasMore: false,
    });

    const client = createApiClient({
      baseUrl: "",
      getToken,
      fetchImpl: mockFetch as typeof fetch,
    });

    await client.notifications.list({ query: {} });

    // Verify the fetch was called with the Authorization header
    expect(mockFetch).toHaveBeenCalledOnce();
    const [_url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-jwt-token");
  });

  it("client is exposed via useApiClient context hook (stub — wired in Plan 02)", () => {
    // This test verifies that src/client/create-client.ts re-exports createApiClient correctly
    expect(typeof createApiClient).toBe("function");
  });
});
