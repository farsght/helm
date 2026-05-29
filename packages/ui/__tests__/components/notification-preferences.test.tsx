/**
 * Tests for <NotificationPreferences> — NOTIF-01.
 *
 * Promoted from it.todo stubs after Plan 03 implementation shipped.
 * Covers: three rows render, security switch is disabled, toggles enabled, error state.
 *
 * Strategy: pre-seed the QueryClient cache directly (setQueryData) for success states.
 * preferenceKeys.get("user_test") → ["notificationPreferences", "user_test", "get"]
 */
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, beforeEach } from "vitest";
import { NotificationPreferences } from "../../src/components/notifications/notification-preferences";
import { preferenceKeys } from "../../src/hooks/use-notification-preferences";
import { TestProvider, mockFetch } from "../helpers/test-provider";

// ─── Fixture factories ────────────────────────────────────────────────────────

const TEST_USER = "user_test";

function makePreferencesResponse(overrides: {
  productEmailEnabled?: boolean;
  marketingEmailEnabled?: boolean;
} = {}) {
  return {
    product: { emailEnabled: overrides.productEmailEnabled ?? true },
    marketing: { emailEnabled: overrides.marketingEmailEnabled ?? false },
  };
}

function freshQCWithData(
  data: ReturnType<typeof makePreferencesResponse>,
) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: 0, gcTime: Infinity },
      mutations: { retry: 0 },
    },
  });
  qc.setQueryData(preferenceKeys.get(TEST_USER), data);
  return qc;
}

function freshEmptyQC() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 0, gcTime: Infinity },
      mutations: { retry: 0 },
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("NotificationPreferences — NOTIF-01", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders three preference rows", () => {
    const qc = freshQCWithData(makePreferencesResponse());

    render(
      <TestProvider queryClient={qc}>
        <NotificationPreferences />
      </TestProvider>,
    );

    expect(screen.getByText("Product updates")).toBeInTheDocument();
    expect(screen.getByText("Marketing")).toBeInTheDocument();
    expect(screen.getByText("Security alerts")).toBeInTheDocument();
  });

  it("security switch is disabled (always-on, locked)", () => {
    const qc = freshQCWithData(makePreferencesResponse());

    render(
      <TestProvider queryClient={qc}>
        <NotificationPreferences />
      </TestProvider>,
    );

    const securitySwitch = screen.getByRole("switch", {
      name: /security alerts email notifications/i,
    });
    expect(securitySwitch).toBeDisabled();
  });

  it("product and marketing switches are not disabled", () => {
    const qc = freshQCWithData(makePreferencesResponse({ productEmailEnabled: true }));

    render(
      <TestProvider queryClient={qc}>
        <NotificationPreferences />
      </TestProvider>,
    );

    const productSwitch = screen.getByRole("switch", {
      name: /product updates email notifications/i,
    });
    const marketingSwitch = screen.getByRole("switch", {
      name: /marketing email notifications/i,
    });
    expect(productSwitch).not.toBeDisabled();
    expect(marketingSwitch).not.toBeDisabled();
  });

  it("toggling product switch fires the mutation (PATCH is called)", async () => {
    const qc = freshQCWithData(makePreferencesResponse({ productEmailEnabled: true }));
    // Queue a PATCH response (mutation uses mockFetch via testApiClient)
    mockFetch.respondWith(makePreferencesResponse({ productEmailEnabled: false }));
    // Queue a second response for the invalidation refetch that fires after onSettled
    mockFetch.respondWith(makePreferencesResponse({ productEmailEnabled: false }));

    render(
      <TestProvider queryClient={qc}>
        <NotificationPreferences />
      </TestProvider>,
    );

    const productSwitch = screen.getByRole("switch", {
      name: /product updates email notifications/i,
    });
    fireEvent.click(productSwitch);

    // The mutation fetch and the subsequent invalidation refetch should have fired
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("renders ErrorState on query error with retry", async () => {
    const qc = freshEmptyQC();
    mockFetch.respondWith({ error: "Server error" }, { status: 500 });

    render(
      <TestProvider queryClient={qc}>
        <NotificationPreferences />
      </TestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Could not load preferences")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("module scaffold verified", async () => {
    const mod = await import(
      "../../src/components/notifications/notification-preferences"
    );
    expect(typeof mod.NotificationPreferences).toBe("function");
  });
});
