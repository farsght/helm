"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FILTERABLE_FIELDS,
  FILTER_OPERATORS,
  type FilterRule,
  type ListFilter,
  type FilterableField,
  type FilterOperator,
} from "@/lib/list-filters";

interface ListFilterBuilderProps {
  value: ListFilter;
  onChange: (next: ListFilter) => void;
}

const EMPTY_RULE: FilterRule = {
  field: "title",
  operator: "contains",
  value: "",
};

export function ListFilterBuilder({ value, onChange }: ListFilterBuilderProps) {
  const rules = value.rules ?? [];

  const updateRule = (idx: number, patch: Partial<FilterRule>) => {
    const next = [...rules];
    next[idx] = { ...next[idx], ...patch } as FilterRule;
    onChange({ logic: "and", rules: next });
  };

  const removeRule = (idx: number) => {
    onChange({ logic: "and", rules: rules.filter((_, i) => i !== idx) });
  };

  const addRule = () => {
    onChange({ logic: "and", rules: [...rules, { ...EMPTY_RULE }] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Prospects matching{" "}
          <span className="font-medium text-foreground">all</span> of these
          rules will be included.
        </p>
      </div>

      <div className="space-y-2">
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No filter rules yet. Add one to define membership.
          </p>
        )}

        {rules.map((rule, idx) => {
          const opMeta = FILTER_OPERATORS.find((o) => o.value === rule.operator) as
            | { value: string; label: string; needsValue: boolean; multiValue?: boolean }
            | undefined;
          const needsValue = opMeta?.needsValue ?? false;
          const isMulti = opMeta?.multiValue ?? false;

          return (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-center rounded-md border border-border bg-card/40 p-2"
            >
              <div className="col-span-1 text-center text-xs text-muted-foreground uppercase">
                {idx === 0 ? "Where" : "And"}
              </div>

              <div className="col-span-3">
                <Select
                  value={rule.field}
                  onValueChange={(v) =>
                    updateRule(idx, { field: v as FilterableField })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTERABLE_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3">
                <Select
                  value={rule.operator}
                  onValueChange={(v) =>
                    updateRule(idx, { operator: v as FilterOperator })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPERATORS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-4">
                {needsValue ? (
                  <Input
                    placeholder={
                      isMulti
                        ? "Comma-separated (e.g. Acme, Beta)"
                        : "Value..."
                    }
                    value={rule.value ?? ""}
                    onChange={(e) => updateRule(idx, { value: e.target.value })}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground italic px-2">
                    No value needed
                  </div>
                )}
              </div>

              <div className="col-span-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRule(idx)}
                  aria-label="Remove rule"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={addRule}>
        <Plus className="h-4 w-4 mr-2" />
        Add rule
      </Button>
    </div>
  );
}
