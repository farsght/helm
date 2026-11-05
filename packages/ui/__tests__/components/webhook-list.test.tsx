/**
 * Tests for <WebhookList> — NOTIF-02.
 *
 * Promoted from it.todo stubs after Plan 03/04 implementation shipped.
 * Covers:
 *   - No-project renders EmptyState (does NOT fetch)
 *   - ConfirmDialog appears on delete click
 *   - ConfirmDialog appears on rotate-secret click
 *   - Enable/disable toggle does NOT open a ConfirmDialog
 *
 * Strategy: pre-seed the QueryClient cache directly (setQueryData) for data states.
 * webhookKeys.list("test-org", "test-project") is the key when TestProvider uses
 * orgSlug="test-org" + projectSlug="test-project".
 */
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, beforeEach } from "vitest";
import type { WebhookEndpoint } from "@farsight/contracts";
import { WebhookList } from "../../src/components/webhooks/webhook-list";
import { webhookKeys } from "../../src/hooks/use-webhooks";
import { TestProvider, mockFetch } from "../helpers/test-provider";

// ─── Fixture factories ────────────────────────────────────────────────────────

const TEST_ORG = "test-org";
const TEST_PROJECT = "test-project";

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

/** Fresh QC pre-seeded with webhook list data. */
function freshQCWithData(endpoints: WebhookEndpoint[]) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: 0, gcTime: Infinity },
      mutations: { retry: 0 },
    },
  });
  qc.setQueryData(webhookKeys.list(TEST_ORG, TEST_PROJECT), { endpoints });
  return qc;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("WebhookList — NOTIF-02", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders EmptyState when no project selected (does NOT fetch)", () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: 0, gcTime: Infinity }, mutations: { retry: 0 } },
    });

    render(
      // projectSlug=null → EmptyState branch, query disabled (D-02)
      <TestProvider queryClient={qc} projectSlug={null}>
        <WebhookList />
      </TestProvider>,
    );

    expect(screen.getByText("No project selected")).toBeInTheDocument();
    // Query must NOT have been called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("renders ConfirmDialog when delete is clicked", async () => {
    const qc = freshQCWithData([makeEndpoint()]);

    render(
      <TestProvider queryClient={qc} projectSlug={TEST_PROJECT}>
        <WebhookList />
      </TestProvider>,
    );

    // Wait for the endpoint row to appear (seeded — synchronous)
    expect(screen.getByText("https://example.com/hook")).toBeInTheDocument();

    // Open the dropdown actions menu (Radix DropdownMenu opens on pointerdown)
    const actionsBtn = screen.getByRole("button", { name: /webhook actions/i });
    fireEvent.pointerDown(actionsBtn);
    fireEvent.click(actionsBtn);

    // Radix portals the dropdown content — wait for it to appear
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Click "Delete"
    fireEvent.click(screen.getByText("Delete"));

    // ConfirmDialog (AlertDialog) must now be visible with "Delete webhook?" title
    await waitFor(() => {
      expect(screen.getByText("Delete webhook?")).toBeInTheDocument();
    });
    // Cancel button present
    expect(screen.getByRole("button", { name: /keep webhook/i })).toBeInTheDocument();
  });

  it("renders ConfirmDialog when rotate-secret is clicked", async () => {
    const qc = freshQCWithData([makeEndpoint()]);

    render(
      <TestProvider queryClient={qc} projectSlug={TEST_PROJECT}>
        <WebhookList />
      </TestProvider>,
    );

    expect(screen.getByText("https://example.com/hook")).toBeInTheDocument();

    // Open the dropdown (Radix DropdownMenu opens on pointerdown)
    const actionsBtn = screen.getByRole("button", { name: /webhook actions/i });
    fireEvent.pointerDown(actionsBtn);
    fireEvent.click(actionsBtn);

    await waitFor(() => {
      expect(screen.getByText("Rotate signing secret")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Rotate signing secret"));

    // ConfirmDialog for rotation must appear
    await waitFor(() => {
      expect(screen.getByText("Rotate signing secret?")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /keep current/i })).toBeInTheDocument();
  });

  it("enable/disable toggle fires WITHOUT opening a ConfirmDialog", async () => {
    const qc = freshQCWithData([makeEndpoint({ enabled: true })]);
    // Queue a PATCH response so the optimistic mutation can settle
    mockFetch.respondWith(makeEndpoint({ enabled: false }));

    render(
      <TestProvider queryClient={qc} projectSlug={TEST_PROJECT}>
        <WebhookList />
      </TestProvider>,
    );

    expect(screen.getByText("https://example.com/hook")).toBeInTheDocument();

    const toggle = screen.getByRole("switch", { name: /enable webhook/i });
    fireEvent.click(toggle);

    // Short wait — confirm dialogs are controlled state updated synchronously
    await waitFor(() => {
      // No confirm dialog must have appeared
      expect(screen.queryByText("Delete webhook?")).toBeNull();
      expect(screen.queryByText("Rotate signing secret?")).toBeNull();
    });
  });

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
  });

  it("module scaffold verified", async () => {
    const mod = await import("../../src/components/webhooks/webhook-list");
    expect(typeof mod.WebhookList).toBe("function");
  });
});
