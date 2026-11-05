/**
 * Tests for <FarsightProvider> and useTenant() — DATA-01.
 *
 * Wave-0: Tests run against the stub implementation created in Plan 03-01.
 * Plan 03-02 will update the provider to use real Clerk hooks + full implementation.
 */
import { renderHook } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { useTenant } from "../../src/provider/use-tenant";
import { TestProvider } from "../helpers/test-provider";

describe("FarsightProvider — DATA-01", () => {
  it("renders children and useTenant() returns correct shape", () => {
    const { result } = renderHook(() => useTenant(), {
      wrapper: ({ children }) => (
        <TestProvider orgSlug="my-org" userId="user_abc" projectSlug="my-project">
          {children}
        </TestProvider>
      ),
    });

    expect(result.current.orgSlug).toBe("my-org");
    expect(result.current.userId).toBe("user_abc");
    expect(result.current.projectSlug).toBe("my-project");
    // orgId is derived in stub as `org_${orgSlug}`
    expect(result.current.orgId).toBeTruthy();
  });

  it("useTenant throws outside FarsightProvider", () => {
    expect(() => {
      renderHook(() => useTenant());
    }).toThrow("useTenant: must be used inside <FarsightProvider>");
  });

  it("injects external QueryClient", () => {
    const externalQC = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });

    const { result } = renderHook(() => useTenant(), {
      wrapper: ({ children }) => (
        <TestProvider queryClient={externalQC}>{children}</TestProvider>
      ),
    });

    // If external QC is used, the tenant context must still be accessible
    expect(result.current).toBeTruthy();
    expect(typeof result.current.userId).toBe("string");
  });
});
