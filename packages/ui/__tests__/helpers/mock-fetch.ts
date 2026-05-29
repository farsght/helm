/**
 * Mock fetchImpl helper for @farsight/sdk test usage.
 * Inject into createApiClient({ fetchImpl: mockFetch }) to intercept all requests.
 */
import { vi } from "vitest";

export type MockFetchFn = ReturnType<typeof vi.fn> & {
  respondWith: (fixture: unknown, options?: { status?: number }) => void;
};

/**
 * Creates a vi.fn() mock for `fetch` that exposes a .respondWith(fixture) helper.
 * Call respondWith before the test that triggers the API call.
 */
export function createMockFetch(): MockFetchFn {
  const fn = vi.fn() as MockFetchFn;

  fn.respondWith = (fixture: unknown, options: { status?: number } = {}) => {
    const status = options.status ?? 200;
    const body = JSON.stringify(fixture);
    fn.mockResolvedValueOnce(
      new Response(body, {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };

  return fn;
}
