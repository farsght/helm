/**
 * Tests for <WebhookHealthBadge> and deriveHealth() — NOTIF-02 (D-15).
 *
 * Promoted from it.todo stubs after Plan 03/04 implementation shipped.
 * Covers: Disabled/Failing/Healthy derivation logic + badge rendering.
 */
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WebhookEndpoint } from "@farsight/contracts";
import { WebhookHealthBadge, deriveHealth } from "../../src/components/webhooks/webhook-health-badge";

// ─── Base fixture ─────────────────────────────────────────────────────────────

function makeEndpoint(overrides: Partial<WebhookEndpoint> = {}): WebhookEndpoint {
  return {
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
    ...overrides,
  };
}

// ─── deriveHealth() unit tests ────────────────────────────────────────────────

describe("deriveHealth() — D-15", () => {
  it("returns Disabled when enabled=false", () => {
    expect(deriveHealth(makeEndpoint({ enabled: false }))).toBe("Disabled");
  });

  it("returns Failing when failureCount > 0", () => {
    expect(
      deriveHealth(makeEndpoint({ enabled: true, failureCount: 3 })),
    ).toBe("Failing");
  });

  it("returns Failing when lastFailureAt > lastSuccessAt", () => {
    const endpoint = makeEndpoint({
      enabled: true,
      failureCount: 0,
      lastSuccessAt: "2026-01-01T10:00:00Z",
      lastFailureAt: "2026-01-02T10:00:00Z", // later than lastSuccessAt
    });
    expect(deriveHealth(endpoint)).toBe("Failing");
  });

  it("returns Healthy when enabled and no failures", () => {
    const endpoint = makeEndpoint({
      enabled: true,
      failureCount: 0,
      lastSuccessAt: "2026-01-02T10:00:00Z",
      lastFailureAt: null,
    });
    expect(deriveHealth(endpoint)).toBe("Healthy");
  });

  it("returns Healthy when lastSuccessAt > lastFailureAt", () => {
    const endpoint = makeEndpoint({
      enabled: true,
      failureCount: 0,
      lastSuccessAt: "2026-01-03T00:00:00Z",
      lastFailureAt: "2026-01-01T00:00:00Z",
    });
    expect(deriveHealth(endpoint)).toBe("Healthy");
  });

  it("returns Healthy when no activity yet (both null)", () => {
    const endpoint = makeEndpoint({
      enabled: true,
      failureCount: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
    });
    expect(deriveHealth(endpoint)).toBe("Healthy");
  });
});

// ─── WebhookHealthBadge render tests ─────────────────────────────────────────

describe("WebhookHealthBadge — NOTIF-02 (D-15)", () => {
  it("renders Disabled badge when enabled=false", () => {
    render(<WebhookHealthBadge endpoint={makeEndpoint({ enabled: false })} />);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("renders Failing badge when failureCount>0", () => {
    render(
      <WebhookHealthBadge endpoint={makeEndpoint({ enabled: true, failureCount: 2 })} />,
    );
    expect(screen.getByText("Failing")).toBeInTheDocument();
  });

  it("renders Failing badge when lastFailureAt > lastSuccessAt", () => {
    render(
      <WebhookHealthBadge
        endpoint={makeEndpoint({
          enabled: true,
          failureCount: 0,
          lastSuccessAt: "2026-01-01T00:00:00Z",
          lastFailureAt: "2026-01-02T00:00:00Z",
        })}
      />,
    );
    expect(screen.getByText("Failing")).toBeInTheDocument();
  });

  it("renders Healthy badge otherwise", () => {
    render(
      <WebhookHealthBadge
        endpoint={makeEndpoint({
          enabled: true,
          failureCount: 0,
          lastSuccessAt: "2026-01-02T00:00:00Z",
          lastFailureAt: null,
        })}
      />,
    );
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

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
  });

  it("module scaffold verified", async () => {
    const mod = await import("../../src/components/webhooks/webhook-health-badge");
    expect(typeof mod.WebhookHealthBadge).toBe("function");
  });
});
