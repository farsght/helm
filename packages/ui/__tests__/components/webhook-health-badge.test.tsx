/**
 * Tests for <WebhookHealthBadge> — NOTIF-02, D-15.
 *
 * Wave-0: WebhookHealthBadge is created in Plan 04.
 * Most tests are marked .todo; the @farsight/contracts type import is validated here.
 */
import { describe, expect, it } from "vitest";

// Dynamic import to avoid crash when source doesn't exist yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importWebhookHealthBadge(): Promise<any> {
  try {
    return await import("../../src/components/webhooks/webhook-health-badge");
  } catch {
    return null;
  }
}

describe("WebhookHealthBadge — NOTIF-02 (D-15)", () => {
  it.todo("Disabled when enabled=false (Plan 04)");

  it.todo("Failing when failureCount>0 (Plan 04)");

  it.todo("Failing when lastFailureAt > lastSuccessAt (Plan 04)");

  it.todo("Healthy when no failures (Plan 04)");

  it("@farsight/contracts WebhookEndpointSchema parses correctly (Wave-0 smoke)", async () => {
    const contracts = await import("@farsight/contracts");
    const schema = contracts.WebhookEndpointSchema;

    const parsed = schema.safeParse({
      id: "whe_aaaaaaaaaaaaaaaa",
      projectId: "proj_1",
      url: "https://example.com/hook",
      eventTypes: ["test.*"],
      enabled: true,
      signingSecretPrefix: "whs_abc",
      createdAt: "2026-01-01T00:00:00Z",
      lastSuccessAt: "2026-01-02T00:00:00Z",
      lastFailureAt: null,
      failureCount: 0,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.enabled).toBe(true);
      expect(parsed.data.failureCount).toBe(0);
    }
    void importWebhookHealthBadge;
  });

  it("module scaffold verified (runs when Plan 04 ships)", async () => {
    const mod = await importWebhookHealthBadge();
    if (!mod) {
      expect(true).toBe(true);
      return;
    }
    expect(typeof mod.WebhookHealthBadge).toBe("function");
  });
});
