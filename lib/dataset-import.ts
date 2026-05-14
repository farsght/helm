/**
 * CSV → dataset import helpers.
 * Infers a simple column schema (string|number|date|boolean) from sampled values.
 */

export type DatasetColumnType = "string" | "number" | "date" | "boolean";

export interface DatasetColumn {
  key: string;            // canonical key (snake_case_safe)
  label: string;          // original header
  type: DatasetColumnType;
  sample?: string;        // first non-null sample value
}

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$/;
const US_DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const BOOL_VALUES = new Set([
  "true", "false", "yes", "no", "1", "0", "y", "n",
]);

function isLikelyDate(v: string): boolean {
  if (ISO_DATE_RE.test(v)) return true;
  if (US_DATE_RE.test(v)) return true;
  const parsed = Date.parse(v);
  // Date.parse is lenient — require a 4-digit year somewhere in the input
  // and a finite result, to avoid treating "123" as a date.
  return Number.isFinite(parsed) && /\d{4}/.test(v);
}

function inferColumnType(samples: string[]): DatasetColumnType {
  const nonEmpty = samples
    .map((s) => (s ?? "").toString().trim())
    .filter((s) => s.length > 0);
  if (nonEmpty.length === 0) return "string";

  // boolean if every value is in BOOL_VALUES
  if (nonEmpty.every((s) => BOOL_VALUES.has(s.toLowerCase()))) return "boolean";
  // number if every value parses as a number
  if (nonEmpty.every((s) => NUMERIC_RE.test(s))) return "number";
  // date if every value looks like a date
  if (nonEmpty.every((s) => isLikelyDate(s))) return "date";
  return "string";
}

export function normalizeKey(label: string): string {
  return label
    .trim()
    .replace(/^"|"$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "col";
}

/**
 * Given an array of header strings and an array of row objects (parsed by papaparse with `header: true`),
 * return a column schema with inferred types.
 */
export function inferSchema(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  sampleSize = 100,
): DatasetColumn[] {
  const usedKeys = new Set<string>();
  return headers.map((label) => {
    // canonicalize key, dedupe
    let key = normalizeKey(label);
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = `${normalizeKey(label)}_${suffix++}`;
    }
    usedKeys.add(key);

    const samples = rows
      .slice(0, sampleSize)
      .map((r) => {
        const v = r[label];
        return v == null ? "" : String(v);
      });
    const type = inferColumnType(samples);
    const sample = samples.find((s) => s.length > 0);
    return { key, label, type, sample };
  });
}

/**
 * Coerce a string value to the inferred column type.
 * Returns null for empty input regardless of type.
 */
export function coerceValue(raw: unknown, type: DatasetColumnType): unknown {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  switch (type) {
    case "number": {
      const n = Number(s);
      return Number.isFinite(n) ? n : s;
    }
    case "boolean": {
      const low = s.toLowerCase();
      if (["true", "yes", "1", "y"].includes(low)) return true;
      if (["false", "no", "0", "n"].includes(low)) return false;
      return s;
    }
    case "date": {
      const parsed = Date.parse(s);
      return Number.isFinite(parsed) ? new Date(parsed).toISOString() : s;
    }
    default:
      return s;
  }
}

/**
 * Map a raw parsed row (keyed by header label) to a normalized row keyed by canonical column key,
 * with values coerced to the column's inferred type.
 */
export function normalizeRow(
  raw: Record<string, unknown>,
  schema: DatasetColumn[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of schema) {
    out[col.key] = coerceValue(raw[col.label], col.type);
  }
  return out;
}
