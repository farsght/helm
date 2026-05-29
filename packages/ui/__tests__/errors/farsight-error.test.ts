/**
 * Tests for FarsightError typed error normalization — DATA-04.
 *
 * Wave-0: Tests run against the stub implementation in Plan 03-01.
 * The farsight-error module is fully implemented in this wave (it only depends on @farsight/sdk).
 */
import { describe, expect, it } from "vitest";
import { ApiClientError, ApiClientSchemaError } from "@farsight/sdk";
import {
  toFarsightError,
  matchCode,
  isFarsightError,
} from "../../src/errors/farsight-error";

describe("FarsightError — DATA-04", () => {
  it("toFarsightError from ApiClientError returns kind:api with code", () => {
    const err = new ApiClientError("Not authorized", {
      status: 403,
      code: "rbac.forbidden",
      body: { status: 403, code: "rbac.forbidden", message: "Not authorized" },
    });

    const result = toFarsightError(err);

    expect(result).not.toBeNull();
    expect(result?.kind).toBe("api");
    expect(result?.code).toBe("rbac.forbidden");
    expect(result?.status).toBe(403);
  });

  it("toFarsightError from ApiClientSchemaError returns kind:schema", () => {
    const err = new ApiClientSchemaError("Response shape mismatch", [
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["id"],
        message: "Expected string, received number",
      } as import("zod").ZodIssue,
    ]);

    const result = toFarsightError(err);

    expect(result).not.toBeNull();
    expect(result?.kind).toBe("schema");
    if (result?.kind === "schema") {
      expect(result.issues).toHaveLength(1);
    }
  });

  it("matchCode matches prefix pattern", () => {
    const err = new ApiClientError("Forbidden", {
      status: 403,
      code: "rbac.forbidden",
      body: null,
    });

    expect(matchCode(err, "rbac.*")).toBe(true);
    expect(matchCode(err, "auth.*")).toBe(false);
    expect(matchCode(err, "rbac.forbidden")).toBe(true);
    expect(matchCode(err, "rbac.other")).toBe(false);
    expect(matchCode("not an error", "rbac.*")).toBe(false);
  });

  it("isFarsightError identifies ApiClientError", () => {
    const apiErr = new ApiClientError("Bad request", {
      status: 400,
      code: "validation.failed",
      body: null,
    });
    const schemaErr = new ApiClientSchemaError("Schema drift", []);
    const plainErr = new Error("Unexpected");

    expect(isFarsightError(apiErr)).toBe(true);
    expect(isFarsightError(schemaErr)).toBe(false);
    expect(isFarsightError(plainErr)).toBe(false);
    expect(isFarsightError(null)).toBe(false);
  });

  it("toFarsightError returns null for unknown error types", () => {
    expect(toFarsightError(new Error("plain"))).toBeNull();
    expect(toFarsightError("a string")).toBeNull();
    expect(toFarsightError(null)).toBeNull();
    expect(toFarsightError(undefined)).toBeNull();
  });
});
