import { vi } from 'vitest'

/**
 * Creates a thenable, chainable mock for Drizzle ORM query builders.
 * When awaited it resolves to `resolveValue`.
 * Every query-builder method (from, where, set, values, etc.) returns
 * the same chain object so arbitrarily deep chains all resolve to the
 * configured value.
 */
export function q(resolveValue: unknown = []) {
  const chain: Record<string, unknown> = {}

  for (const m of [
    'from', 'where', 'set', 'values', 'returning', 'limit',
    'offset', 'orderBy', 'innerJoin', 'leftJoin',
  ]) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }

  // Make the chain a thenable so `await chain` resolves correctly
  chain.then = (
    onfulfilled: (v: unknown) => unknown,
    onrejected?: (e: unknown) => unknown,
  ) => Promise.resolve(resolveValue).then(onfulfilled, onrejected)

  chain.catch = (onrejected: (e: unknown) => unknown) =>
    Promise.resolve(resolveValue).catch(onrejected)

  return chain as unknown
}

/**
 * Returns a factory function you can use with mockImplementation so each
 * call to db.select() (or insert/update/delete) dequeues the next result.
 *
 * Usage:
 *   vi.mocked(db.select).mockImplementation(queue([result1, result2]))
 */
export function queue(results: unknown[]) {
  let index = 0
  return () => {
    const val = results[index] ?? []
    index++
    return q(val)
  }
}
