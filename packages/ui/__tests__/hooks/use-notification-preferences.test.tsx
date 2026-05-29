/**
 * Tests for useNotificationPreferences hooks — DATA-03.
 *
 * Plan 03-03: Verifies correct export names and query key structure.
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  preferenceKeys,
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferences,
} from "../../src/hooks/use-notification-preferences";
import { TestProvider } from "../helpers/test-provider";

describe("useNotificationPreferences — DATA-03", () => {
  it("preferenceKeys.get includes userId for tenant namespacing", () => {
    const key = preferenceKeys.get("user_abc");
    expect(key).toContain("user_abc");
    expect(Array.isArray(key)).toBe(true);
  });

  it("preferenceKeys different userId → different key", () => {
    const keyA = preferenceKeys.get("user_abc");
    const keyB = preferenceKeys.get("user_xyz");
    expect(JSON.stringify(keyA)).not.toBe(JSON.stringify(keyB));
  });

  it("useNotificationPreferencesQuery returns queryOptions with correct staleTime", () => {
    const { result } = renderHook(() => useNotificationPreferencesQuery(), {
      wrapper: TestProvider,
    });
    expect(result.current.staleTime).toBe(60_000);
  });

  it("useUpdateNotificationPreferences returns a mutation function", () => {
    const { result } = renderHook(() => useUpdateNotificationPreferences(), {
      wrapper: TestProvider,
    });
    expect(typeof result.current.mutate).toBe("function");
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});
