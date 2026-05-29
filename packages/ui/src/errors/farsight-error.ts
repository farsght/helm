/**
 * @farsight/ui — FarsightError typed error normalization.
 *
 * STUB: This file is a placeholder created by Plan 03-01 (Wave-0).
 * Plan 03-02 replaces this with the real implementation.
 *
 * Exports the typed error helpers over @farsight/sdk error classes.
 */
import { ApiClientError, ApiClientSchemaError } from "@farsight/sdk";
import type { ApiError } from "@farsight/contracts";

export type FarsightError = {
  readonly kind: "api";
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
  readonly requestId?: string;
};

export type FarsightSchemaError = {
  readonly kind: "schema";
  readonly issues: import("zod").ZodIssue[];
};

export function toFarsightError(
  e: unknown,
): FarsightError | FarsightSchemaError | null {
  if (e instanceof ApiClientError) {
    const body = e.body as Partial<ApiError>;
    return {
      kind: "api",
      status: e.status,
      code: e.code,
      message: body?.message ?? e.message,
      details: body?.details,
      requestId: body?.requestId,
    };
  }
  if (e instanceof ApiClientSchemaError) {
    return { kind: "schema", issues: e.issues };
  }
  return null;
}

export function isFarsightError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError;
}

export function matchCode(e: unknown, pattern: string): boolean {
  if (!(e instanceof ApiClientError)) return false;
  if (pattern.endsWith(".*")) {
    return e.code.startsWith(pattern.slice(0, -2));
  }
  return e.code === pattern;
}
