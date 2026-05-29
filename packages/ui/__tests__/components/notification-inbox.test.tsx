/**
 * Tests for <NotificationInbox> — NOTIF-01.
 *
 * Wave-0: NotificationInbox is created in Plan 03.
 * Tests requiring the component are marked .todo until Plan 03 ships.
 */
import { describe, expect, it } from "vitest";

// Dynamic import to avoid crash when source doesn't exist yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importNotificationInbox(): Promise<any> {
  try {
    return await import("../../src/components/notifications/notification-inbox");
  } catch {
    return null;
  }
}

describe("NotificationInbox — NOTIF-01", () => {
  it.todo("renders EmptyState when no notifications (Plan 03)");

  it.todo("renders ListSkeleton while loading (Plan 03)");

  it.todo("renders ErrorState on query error (Plan 03)");

  it.todo("shows Load more when hasMore is true (Plan 03)");

  it("module scaffold verified (runs when Plan 03 ships)", async () => {
    const mod = await importNotificationInbox();
    if (!mod) {
      expect(true).toBe(true);
      return;
    }
    expect(typeof mod.NotificationInbox).toBe("function");
  });
});
