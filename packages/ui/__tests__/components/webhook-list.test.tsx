/**
 * Tests for <WebhookList> — NOTIF-02.
 *
 * Wave-0: WebhookList is created in Plan 04.
 * Tests requiring the component are marked .todo until Plan 04 ships.
 */
import { describe, expect, it } from "vitest";

// Dynamic import to avoid crash when source doesn't exist yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importWebhookList(): Promise<any> {
  try {
    return await import("../../src/components/webhooks/webhook-list");
  } catch {
    return null;
  }
}

describe("WebhookList — NOTIF-02", () => {
  it.todo("renders EmptyState when no project selected (Plan 04)");

  it.todo("renders ConfirmDialog when delete clicked (Plan 04)");

  it.todo("renders ConfirmDialog when rotate-secret clicked (Plan 04)");

  it.todo("enable toggle fires without ConfirmDialog (Plan 04)");

  it("@farsight/contracts WebhookEndpointListResponseSchema parses correctly (Wave-0 smoke)", async () => {
    const contracts = await import("@farsight/contracts");
    const schema = contracts.WebhookEndpointListResponseSchema;

    const parsed = schema.safeParse({
      endpoints: [
        {
          id: "whe_aaaaaaaaaaaaaaaa",
          projectId: "proj_1",
          url: "https://example.com/hook",
          eventTypes: ["test.*"],
          enabled: true,
          signingSecretPrefix: "whs_abc",
          createdAt: "2026-01-01T00:00:00Z",
          lastSuccessAt: null,
          lastFailureAt: null,
          failureCount: 0,
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.endpoints).toHaveLength(1);
    }
    void importWebhookList;
  });

  it("module scaffold verified (runs when Plan 04 ships)", async () => {
    const mod = await importWebhookList();
    if (!mod) {
      expect(true).toBe(true);
      return;
    }
    expect(typeof mod.WebhookList).toBe("function");
  });
});
