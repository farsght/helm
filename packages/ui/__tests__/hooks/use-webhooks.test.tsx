/**
 * Tests for useWebhooks query hooks — DATA-03.
 *
 * Wave-0: Tests run against the stub implementation created in Plan 03-01.
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { webhookKeys, useWebhooksQueryOptions } from "../../src/hooks/use-webhooks";
import { TestProvider } from "../helpers/test-provider";

describe("useWebhooks — DATA-03", () => {
  it("webhookKeys.list includes orgSlug and projectSlug", () => {
    const key = webhookKeys.list("my-org", "my-project");

    // Key must include both org and project slugs for proper namespacing (D-13)
    expect(key).toContain("my-org");
    expect(key).toContain("my-project");
    expect(Array.isArray(key)).toBe(true);
  });

  it("webhookKeys.list different org/project → different key", () => {
    const keyA = webhookKeys.list("org-a", "project-a");
    const keyB = webhookKeys.list("org-b", "project-b");
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB));
  });

  it("useWebhooksQueryOptions disabled when projectSlug is null", () => {
    const { result } = renderHook(() => useWebhooksQueryOptions(), {
      wrapper: ({ children }) => (
        // projectSlug=null: hook must be disabled (D-02)
        <TestProvider orgSlug="my-org" projectSlug={null}>
          {children}
        </TestProvider>
      ),
    });

    // When projectSlug is null, the hook's enabled flag must be false
    expect(result.current.enabled).toBe(false);
  });

  it("useWebhooksQueryOptions enabled when orgSlug and projectSlug are present", () => {
    const { result } = renderHook(() => useWebhooksQueryOptions(), {
      wrapper: ({ children }) => (
        <TestProvider orgSlug="my-org" projectSlug="my-project">
          {children}
        </TestProvider>
      ),
    });

    expect(result.current.enabled).toBe(true);
  });
});
