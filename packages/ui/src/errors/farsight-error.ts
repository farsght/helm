/**
 * @farsight/ui — FarsightError typed error normalization utilities.
 *
 * No 'use client' — pure error normalization utilities (no React, no browser APIs).
 *
 * Wraps ApiClientError (non-2xx API response) and ApiClientSchemaError (2xx + Zod
 * schema mismatch) into a stable discriminated union. Branch on `code`, never on
 * `message` (D-09).
 *
 * Error code namespace catalog (from @farsight/contracts ErrorCode):
 *   auth.*       — re-auth required (token missing/invalid/expired)
 *   rbac.*       — access forbidden (insufficient role/project access)
 *   validation.* — request validation failed; per-field details in `details`
 *   resource.*   — resource not found or conflict
 *   quota.*      — quota exceeded
 *   integration.* — third-party integration failure
 *   internal.*   — server-side internal error
 */
import { ApiClientError, ApiClientSchemaError } from "@farsight/sdk"
import type { ApiError } from "@farsight/contracts"

/**
 * A normalized API error from @farsight/sdk's ApiClientError.
 * Discriminated by `kind: 'api'`.
 */
export type FarsightError = {
  readonly kind: "api"
  readonly status: number
  readonly code: string
  readonly message: string
  readonly details?: unknown
  readonly requestId?: string
}

/**
 * A schema mismatch error from @farsight/sdk's ApiClientSchemaError.
 * Indicates a 2xx response with a Zod shape that didn't match the contract.
 * Discriminated by `kind: 'schema'`.
 */
export type FarsightSchemaError = {
  readonly kind: "schema"
  readonly issues: import("zod").ZodIssue[]
}

/**
 * Normalizes an unknown caught value into a FarsightError or FarsightSchemaError.
 * Returns null for anything that is not a Farsight SDK error.
 */
export function toFarsightError(
  e: unknown,
): FarsightError | FarsightSchemaError | null {
  if (e instanceof ApiClientError) {
    const body = e.body as Partial<ApiError>
    return {
      kind: "api",
      status: e.status,
      code: e.code,
      message: body?.message ?? e.message,
      details: body?.details,
      requestId: body?.requestId,
    }
  }
  if (e instanceof ApiClientSchemaError) {
    return { kind: "schema", issues: e.issues }
  }
  return null
}

/**
 * Type guard: returns true when `e` is an ApiClientError (kind:'api').
 * Use this to narrow before accessing `.status`, `.code`, etc.
 */
export function isFarsightError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError
}

/**
 * Returns true when `e` is an ApiClientError whose code matches `pattern`.
 *
 * - Exact match: matchCode(e, 'auth.missing_bearer')
 * - Prefix match: matchCode(e, 'auth.*') — matches any code starting with 'auth.'
 *
 * Returns false for non-ApiClientError values.
 */
export function matchCode(e: unknown, pattern: string): boolean {
  if (!(e instanceof ApiClientError)) return false
  if (pattern.endsWith(".*")) {
    return e.code.startsWith(pattern.slice(0, -2))
  }
  return e.code === pattern
}
