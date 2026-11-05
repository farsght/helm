/**
 * Column type coercion for the DataGrid variant menu.
 * Never throws — always returns a sensible default or null.
 * A cell is "lost" if it was non-empty and ends up null — that's what the confirm dialog warns about.
 */

export type CellVariant =
  | "short-text"
  | "long-text"
  | "url"
  | "number"
  | "checkbox"
  | "date"
  | "select"
  | "multi-select"
  | "file";

const TEXT = new Set<CellVariant>(["short-text", "long-text", "url"]);

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.length === 0;
  if (typeof v === "number") return Number.isNaN(v);
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function toDate(v: unknown): Date | null {
  const d = v instanceof Date ? v : new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function coerceValue(
  value: unknown,
  from: CellVariant,
  to: CellVariant,
): unknown {
  if (from === to) return value;
  if (isEmpty(value)) return null;

  // ── To text / url ──────────────────────────────────────
  if (TEXT.has(to)) {
    if (TEXT.has(from)) return value;
    if (from === "number") return String(value);
    if (from === "checkbox") return value ? "true" : "false";
    if (from === "select") return String(value);
    if (from === "multi-select")
      return Array.isArray(value) ? value.join(", ") : null;
    if (from === "date") {
      const d = toDate(value);
      return d ? isoDay(d) : null;
    }
    return null; // file → lossy
  }

  // ── To number ──────────────────────────────────────────
  if (to === "number") {
    if (TEXT.has(from) || from === "select") {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    if (from === "checkbox") return value ? 1 : 0;
    if (from === "date") {
      const d = toDate(value);
      return d ? d.getTime() : null;
    }
    return null; // multi-select, file → lossy
  }

  // ── To checkbox ────────────────────────────────────────
  if (to === "checkbox") {
    if (TEXT.has(from) || from === "select") {
      const s = String(value).trim().toLowerCase();
      if (["true", "yes", "1", "on", "y"].includes(s)) return true;
      if (["false", "no", "0", "off", "n"].includes(s)) return false;
      return null;
    }
    if (from === "number") return value !== 0;
    if (from === "date") return true;
    if (from === "multi-select" || from === "file")
      return Array.isArray(value) && value.length > 0;
    return null;
  }

  // ── To date ────────────────────────────────────────────
  if (to === "date") {
    if (TEXT.has(from) || from === "select" || from === "number") {
      const d = toDate(value);
      return d ? d.toISOString() : null;
    }
    return null; // checkbox, multi-select, file → lossy
  }

  // ── To select ──────────────────────────────────────────
  if (to === "select") {
    if (TEXT.has(from)) return String(value);
    if (from === "number") return String(value);
    if (from === "checkbox") return value ? "true" : "false";
    if (from === "multi-select")
      return Array.isArray(value) && value.length > 0 ? String(value[0]) : null;
    if (from === "date") {
      const d = toDate(value);
      return d ? isoDay(d) : null;
    }
    return null;
  }

  // ── To multi-select ────────────────────────────────────
  if (to === "multi-select") {
    if (from === "select") return [String(value)];
    if (TEXT.has(from)) {
      const s = String(value);
      return s.includes(",")
        ? s.split(",").map((p) => p.trim()).filter(Boolean)
        : [s];
    }
    if (from === "number") return [String(value)];
    if (from === "checkbox") return [value ? "true" : "false"];
    if (from === "date") {
      const d = toDate(value);
      return d ? [isoDay(d)] : null;
    }
    return null;
  }

  // ── To file ────────────────────────────────────────────
  return null; // can't synthesize File objects from primitives
}

export interface CoercionPreview<TData> {
  newData: TData[];
  changedCount: number;
  lostCount: number;
  affectedRowIds: string[];
}

export function previewCoercion<TData extends Record<string, unknown>>(
  data: TData[],
  columnId: string,
  rowIdKey: keyof TData,
  from: CellVariant,
  to: CellVariant,
): CoercionPreview<TData> {
  let changedCount = 0;
  let lostCount = 0;
  const affectedRowIds: string[] = [];

  const newData = data.map((row) => {
    const oldValue = row[columnId];
    const newValue = coerceValue(oldValue, from, to);
    if (!Object.is(oldValue, newValue)) {
      changedCount++;
      if (!isEmpty(oldValue) && isEmpty(newValue)) {
        lostCount++;
        affectedRowIds.push(String(row[rowIdKey]));
      }
      return { ...row, [columnId]: newValue };
    }
    return row;
  });

  return { newData, changedCount, lostCount, affectedRowIds };
}

/** Generate select options from existing unique values in a column */
export function generateOptionsFromValues<TData extends Record<string, unknown>>(
  data: TData[],
  columnId: string,
): Array<{ label: string; value: string }> {
  const seen = new Set<string>();
  const options: Array<{ label: string; value: string }> = [];
  for (const row of data) {
    const v = row[columnId];
    if (v == null) continue;
    const vals = Array.isArray(v) ? v : [v];
    for (const item of vals) {
      const s = String(item).trim();
      if (s && !seen.has(s)) {
        seen.add(s);
        options.push({ label: s, value: s });
      }
    }
  }
  return options.slice(0, 100); // cap at 100
}
