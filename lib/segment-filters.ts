/**
 * Shared filter types + SQL builder for dynamic segments.
 * v1: single AND-group, finite operator set, prospects table only.
 */

import { and, eq, ne, ilike, isNull, isNotNull, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import { prospects } from "@/db/schema";

export const FILTERABLE_FIELDS = [
  { value: "title", label: "Job Title" },
  { value: "company", label: "Company" },
  { value: "industry", label: "Industry" },
  { value: "location", label: "Location" },
  { value: "email", label: "Email" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
] as const;

export type FilterableField = (typeof FILTERABLE_FIELDS)[number]["value"];

export const FILTER_OPERATORS = [
  { value: "contains", label: "contains", needsValue: true },
  { value: "not_contains", label: "does not contain", needsValue: true },
  { value: "equals", label: "equals", needsValue: true },
  { value: "not_equals", label: "does not equal", needsValue: true },
  { value: "is_empty", label: "is empty", needsValue: false },
  { value: "is_not_empty", label: "is not empty", needsValue: false },
  { value: "in_list", label: "is any of", needsValue: true, multiValue: true },
  { value: "not_in_list", label: "is none of", needsValue: true, multiValue: true },
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number]["value"];

export interface FilterRule {
  field: FilterableField;
  operator: FilterOperator;
  /** Single value, or comma-separated for `in_list` / `not_in_list`. */
  value?: string;
}

export interface SegmentFilter {
  /** v1 supports only "and". v2 will add "or" + nested groups. */
  logic: "and";
  rules: FilterRule[];
}

const FIELD_COLUMNS = {
  title: prospects.title,
  company: prospects.company,
  industry: prospects.industry,
  location: prospects.location,
  email: prospects.email,
  firstName: prospects.firstName,
  lastName: prospects.lastName,
} as const;

/** Build a single SQL condition for one rule, or null if the rule is incomplete. */
export function buildRuleCondition(rule: FilterRule): SQL | null {
  const col = FIELD_COLUMNS[rule.field];
  if (!col) return null;

  switch (rule.operator) {
    case "is_empty":
      return sql`(${col} IS NULL OR ${col} = '')`;
    case "is_not_empty":
      return sql`(${col} IS NOT NULL AND ${col} <> '')`;
    case "contains": {
      const v = (rule.value ?? "").trim();
      if (!v) return null;
      return ilike(col, `%${v}%`);
    }
    case "not_contains": {
      const v = (rule.value ?? "").trim();
      if (!v) return null;
      return sql`(${col} IS NULL OR ${col} NOT ILIKE ${`%${v}%`})`;
    }
    case "equals": {
      const v = (rule.value ?? "").trim();
      if (!v) return null;
      return eq(col, v);
    }
    case "not_equals": {
      const v = (rule.value ?? "").trim();
      if (!v) return null;
      return ne(col, v);
    }
    case "in_list": {
      const values = (rule.value ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (values.length === 0) return null;
      return inArray(col, values);
    }
    case "not_in_list": {
      const values = (rule.value ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (values.length === 0) return null;
      return notInArray(col, values);
    }
    default:
      return null;
  }
}

/** Build a combined SQL `WHERE` condition from the filter, or null if no usable rules. */
export function buildFilterCondition(filter: SegmentFilter | null | undefined): SQL | null {
  if (!filter || !Array.isArray(filter.rules) || filter.rules.length === 0) {
    return null;
  }
  const conds = filter.rules
    .map(buildRuleCondition)
    .filter((c): c is SQL => c !== null);
  if (conds.length === 0) return null;
  // v1: logic is always "and"
  return and(...conds) ?? null;
}

/** Parse the JSON column to a SegmentFilter, tolerating bad data. */
export function parseFilter(raw: string | null | undefined): SegmentFilter | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.rules)) {
      return { logic: "and", rules: parsed.rules as FilterRule[] };
    }
  } catch {
    // ignore
  }
  return null;
}
