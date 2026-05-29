/**
 * Tests for useNotifications query hooks — DATA-03, DATA-06.
 *
 * Wave-0: Tests run against the stub implementation created in Plan 03-01.
 * Plan 03-02 will wire the full implementation.
 */
import { renderHook, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { notificationKeys, useMarkReadMutation, useNotificationsQueryOptions } from "../../src/hooks/use-notifications";
import { TestProvider } from "../helpers/test-provider";

describe("useNotifications — DATA-03, DATA-06", () => {
  it("notificationKeys.list includes userId", () => {
    const key = notificationKeys.list("user_abc");
    // Key must include userId to prevent cross-tenant cache bleed (DATA-03)
    expect(key).toContain("user_abc");
    expect(Array.isArray(key)).toBe(true);
  });

  it("notificationKeys.list different userId → different key", () => {
    const keyA = notificationKeys.list("user_abc");
    const keyB = notificationKeys.list("user_xyz");
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB));
  });

  it("useMarkReadMutation rolls back on error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 0, gcTime: Infinity }, mutations: { retry: 0 } },
    });

    // Seed the cache with existing notification data
    const seedKey = notificationKeys.list("user_test");
    queryClient.setQueryData(seedKey, {
      notifications: [
        {
          id: "notif-1",
          readAt: null,
          title: "Test",
          eventType: "test",
          category: "product",
          body: null,
          href: null,
          severity: null,
          orgId: null,
          projectId: null,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      unreadCount: 1,
      hasMore: false,
    });

    const { result } = renderHook(() => useMarkReadMutation(), {
      wrapper: ({ children }) => (
        <TestProvider userId="user_test" queryClient={queryClient}>
          {children}
        </TestProvider>
      ),
    });

    // Simulate a mutation — the mockFetch has no response queued, so it will fail
    await act(async () => {
      try {
        await result.current.mutateAsync("notif-1");
      } catch {
        // Expected to throw (no mock response queued)
      }
    });

    // After rollback, cache should be restored to its pre-mutation state
    const data = queryClient.getQueryData(seedKey) as { unreadCount: number } | undefined;
    expect(data?.unreadCount).toBe(1);
  });

  it("refetchIntervalInBackground is false (tab-hidden polling pause — D-07)", () => {
    const { result } = renderHook(() => useNotificationsQueryOptions(), {
      wrapper: TestProvider,
    });

    // D-07: refetchIntervalInBackground must be false to pause polling when tab is hidden
    expect(result.current.refetchIntervalInBackground).toBe(false);
  });
});
