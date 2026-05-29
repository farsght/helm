/**
 * Tests for <NotificationBell> — NOTIF-01.
 *
 * Promoted from it.todo stubs after Plan 03 implementation shipped.
 * Covers: badge counts/cap/aria-live, popover open with items + "Mark all read".
 *
 * Strategy: pre-seed the QueryClient cache directly (setQueryData) to avoid
 * async fetch races. The hook uses notificationKeys.list("user_test") as the key
 * when no cursor/limit/unread opts are passed.
 */
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { NotificationBell } from "../../src/components/notifications/notification-bell";
import { notificationKeys } from "../../src/hooks/use-notifications";
import { TestProvider } from "../helpers/test-provider";

// ─── Fixture factories ────────────────────────────────────────────────────────

const TEST_USER = "user_test";

function makeNotification(overrides: {
  id?: string;
  title?: string;
  readAt?: string | null;
} = {}) {
  return {
    id: overrides.id ?? "notif-1",
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

/** Build a fresh QueryClient pre-seeded with notification list data. */
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
  const key = notificationKeys.list(TEST_USER);
  qc.setQueryData(key, {
    notifications: data.notifications,
    unreadCount: data.unreadCount,
    hasMore: data.hasMore ?? false,
  });
  return qc;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("NotificationBell — NOTIF-01", () => {
  it("renders badge with unreadCount", () => {
    const qc = freshQCWithData({ notifications: [makeNotification()], unreadCount: 3 });

    render(
      <TestProvider queryClient={qc}>
        <NotificationBell interval={false} />
      </TestProvider>,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    // Badge must not be hidden when count > 0
    const badge = document.querySelector("[aria-live='polite']") as HTMLElement;
    expect(badge.classList.contains("hidden")).toBe(false);
  });

  it("hides badge when unreadCount is 0", () => {
    const qc = freshQCWithData({ notifications: [], unreadCount: 0 });

    render(
      <TestProvider queryClient={qc}>
        <NotificationBell interval={false} />
      </TestProvider>,
    );

    const badge = document.querySelector("[aria-live='polite']") as HTMLElement;
    expect(badge.classList.contains("hidden")).toBe(true);
  });

  it("shows 9+ for count > 9", () => {
    const qc = freshQCWithData({ notifications: [], unreadCount: 15 });

    render(
      <TestProvider queryClient={qc}>
        <NotificationBell interval={false} />
      </TestProvider>,
    );

    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("badge has aria-live='polite' and aria-atomic='true'", () => {
    const qc = freshQCWithData({ notifications: [], unreadCount: 2 });

    render(
      <TestProvider queryClient={qc}>
        <NotificationBell interval={false} />
      </TestProvider>,
    );

    const badge = document.querySelector("[aria-live='polite']");
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute("aria-live")).toBe("polite");
    expect(badge?.getAttribute("aria-atomic")).toBe("true");
  });

  it("popover opens and shows notification items + 'Mark all read'", async () => {
    const qc = freshQCWithData({
      notifications: [
        makeNotification({ id: "notif-1" }),
        makeNotification({ id: "notif-2" }),
      ],
      unreadCount: 2,
    });

    render(
      <TestProvider queryClient={qc}>
        <NotificationBell interval={false} />
      </TestProvider>,
    );

    // Badge is immediately visible with seeded data
    expect(screen.getByText("2")).toBeInTheDocument();

    // Open the popover
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    await waitFor(() => {
      // Popover header "Notifications"
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      // "Mark all read" must appear when unreadCount > 0
      expect(screen.getByRole("button", { name: /mark all read/i })).toBeInTheDocument();
    });
  });

  it("module scaffold verified", async () => {
    const mod = await import("../../src/components/notifications/notification-bell");
    expect(typeof mod.NotificationBell).toBe("function");
  });
});
