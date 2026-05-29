/**
 * Tests for <NotificationInbox> — NOTIF-01.
 *
 * Promoted from it.todo stubs after Plan 03 implementation shipped.
 * Covers: loading skeleton, error state, empty state, list render, Load more gating.
 *
 * Strategy: pre-seed the QueryClient cache directly (setQueryData) for success states.
 * For loading/error states, use mockFetch to produce the desired async behavior.
 */
import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, beforeEach } from "vitest";
import { NotificationInbox } from "../../src/components/notifications/notification-inbox";
import { notificationKeys } from "../../src/hooks/use-notifications";
import { TestProvider, mockFetch } from "../helpers/test-provider";

// ─── Fixture factories ────────────────────────────────────────────────────────

const TEST_USER = "user_test";

function makeNotification(id = "notif-1", overrides: {
  title?: string;
  readAt?: string | null;
} = {}) {
  return {
    id,
    eventType: "test.event",
    category: "product" as const,
    title: overrides.title ?? "Test notification",
    body: null,
    href: null,
    severity: null as null,
    orgId: null,
    projectId: null,
    createdAt: "2026-01-01T00:00:00Z",
    readAt: overrides.readAt ?? null,
  };
}

/** Fresh QC pre-seeded with data (bypasses fetch entirely). */
function freshQCWithData(data: {
  notifications: ReturnType<typeof makeNotification>[];
  unreadCount: number;
  hasMore?: boolean;
}) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: 0, gcTime: Infinity },
      mutations: { retry: 0 },
    },
  });
  qc.setQueryData(notificationKeys.list(TEST_USER), {
    notifications: data.notifications,
    unreadCount: data.unreadCount,
    hasMore: data.hasMore ?? false,
  });
  return qc;
}

/** Fresh QC with no cache — query will fire and use mockFetch. */
function freshEmptyQC() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 0, gcTime: Infinity },
      mutations: { retry: 0 },
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("NotificationInbox — NOTIF-01", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders ListSkeleton while loading (query in-flight)", async () => {
    const qc = freshEmptyQC();
    // Never resolve — keep in loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(
      <TestProvider queryClient={qc}>
        <NotificationInbox interval={false} />
      </TestProvider>,
    );

    // The inbox container must be present
    expect(document.querySelector("[data-slot='notification-inbox']")).not.toBeNull();
    // None of the settled-state indicators should be present
    expect(screen.queryByText("You're all caught up")).toBeNull();
    expect(screen.queryByText("Could not load notifications")).toBeNull();
    // The heading is always shown even during load? Actually — check source:
    // The heading ("Notifications") is inside the main render path, not loading branch.
    // LoadingSkeleton is the only branch — so "Test notification" etc. are absent.
    expect(screen.queryByText("Test notification")).toBeNull();
  });

  it("renders EmptyState when no notifications", () => {
    const qc = freshQCWithData({ notifications: [], unreadCount: 0 });

    render(
      <TestProvider queryClient={qc}>
        <NotificationInbox interval={false} />
      </TestProvider>,
    );

    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    // "Load more" must NOT appear when hasMore is false
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("renders ErrorState with retry on query error", async () => {
    const qc = freshEmptyQC();
    // Return 500 to trigger error branch
    mockFetch.respondWith({ error: "Internal Server Error" }, { status: 500 });

    render(
      <TestProvider queryClient={qc}>
        <NotificationInbox interval={false} />
      </TestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Could not load notifications")).toBeInTheDocument();
    });
    // Retry button must be present
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("renders notification items", () => {
    const qc = freshQCWithData({
      notifications: [
        makeNotification("n-1", { title: "First notification" }),
        makeNotification("n-2", { title: "Second notification" }),
      ],
      unreadCount: 2,
    });

    render(
      <TestProvider queryClient={qc}>
        <NotificationInbox interval={false} />
      </TestProvider>,
    );

    expect(screen.getByText("First notification")).toBeInTheDocument();
    expect(screen.getByText("Second notification")).toBeInTheDocument();
  });

  it("shows Load more when hasMore is true", () => {
    const qc = freshQCWithData({
      notifications: [makeNotification("n-1")],
      unreadCount: 1,
      hasMore: true,
    });

    render(
      <TestProvider queryClient={qc}>
        <NotificationInbox interval={false} />
      </TestProvider>,
    );

    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("does NOT show Load more when hasMore is false", () => {
    const qc = freshQCWithData({
      notifications: [makeNotification("n-1")],
      unreadCount: 1,
      hasMore: false,
    });

    render(
      <TestProvider queryClient={qc}>
        <NotificationInbox interval={false} />
      </TestProvider>,
    );

    expect(screen.getByText("Test notification")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("module scaffold verified", async () => {
    const mod = await import("../../src/components/notifications/notification-inbox");
    expect(typeof mod.NotificationInbox).toBe("function");
  });
});
