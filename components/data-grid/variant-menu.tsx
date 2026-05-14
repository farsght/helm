"use client";

import * as React from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DataGridColumnHeader } from "@/components/data-grid/data-grid-column-header";
import type { Header, Table } from "@tanstack/react-table";
import {
  type CellVariant,
  type CoercionPreview,
  previewCoercion,
  generateOptionsFromValues,
} from "@/lib/data-grid-coercion";

export const CELL_VARIANTS: { value: CellVariant; label: string; icon: string }[] = [
  { value: "short-text", label: "Short text", icon: "Aa" },
  { value: "long-text", label: "Long text", icon: "¶" },
  { value: "number", label: "Number", icon: "#" },
  { value: "url", label: "URL", icon: "🔗" },
  { value: "checkbox", label: "Checkbox", icon: "☑" },
  { value: "date", label: "Date", icon: "📅" },
  { value: "select", label: "Select", icon: "▾" },
  { value: "multi-select", label: "Multi-select", icon: "⊞" },
  { value: "file", label: "File", icon: "📎" },
];

interface VariantMenuProps<TData extends Record<string, unknown>> {
  header: Header<TData, unknown>;
  table: Table<TData>;
  label: string;
  columnId: string;
  variant: CellVariant;
  data: TData[];
  rowIdKey: keyof TData;
  onApply: (newVariant: CellVariant, newData: TData[]) => void;
}

export function VariantMenu<TData extends Record<string, unknown>>({
  header,
  table,
  label,
  columnId,
  variant,
  data,
  rowIdKey,
  onApply,
}: VariantMenuProps<TData>) {
  const [pending, setPending] = React.useState<{
    to: CellVariant;
    preview: CoercionPreview<TData>;
  } | null>(null);

  function requestChange(to: CellVariant) {
    if (to === variant) return;
    const preview = previewCoercion(data, columnId, rowIdKey, variant, to);
    if (preview.lostCount === 0) {
      onApply(to, preview.newData);
    } else {
      setPending({ to, preview });
    }
  }

  function generateOptions() {
    const options = generateOptionsFromValues(data, columnId);
    // Apply to data as select variant with generated options
    const preview = previewCoercion(data, columnId, rowIdKey, variant, "select");
    onApply("select", preview.newData);
    // TODO: persist options to column meta
    console.info("Generated options:", options);
  }

  const currentVariant = CELL_VARIANTS.find((v) => v.value === variant);
  const isSelectLike = variant === "select" || variant === "multi-select";

  return (
    <>
      {/* DataGridColumnHeader handles sorting, resizing and pinning.
          flex-1 min-w-0 lets it shrink within the flex row without overflowing. */}
      <div className="flex size-full items-center overflow-hidden">
        <DataGridColumnHeader header={header} table={table} className="flex-1 min-w-0" />

        {/* Variant type icon — sits at the right edge, outside the resize trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100"
              title={`Column type: ${currentVariant?.label ?? variant}`}
            >
              <span className="text-xs font-mono leading-none">
                {currentVariant?.icon ?? "?"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Column type
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={variant}
              onValueChange={(v) => requestChange(v as CellVariant)}
            >
              {CELL_VARIANTS.map((v) => (
                <DropdownMenuRadioItem
                  key={v.value}
                  value={v.value}
                  className="gap-2"
                >
                  <span className="font-mono text-xs w-4 text-muted-foreground">
                    {v.icon}
                  </span>
                  {v.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {isSelectLike && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={generateOptions} className="gap-2 text-xs">
                  <Sparkles className="h-3 w-3" />
                  Generate options from values
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Change &ldquo;{label}&rdquo; to{" "}
              {CELL_VARIANTS.find((v) => v.value === pending?.to)?.label ??
                pending?.to}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.preview.lostCount} cell
              {pending?.preview.lostCount === 1 ? "" : "s"} can&apos;t be
              converted and will be cleared.
              {(pending?.preview.changedCount ?? 0) -
                (pending?.preview.lostCount ?? 0) >
                0 && (
                <>
                  {" "}
                  The other{" "}
                  {(pending?.preview.changedCount ?? 0) -
                    (pending?.preview.lostCount ?? 0)}{" "}
                  will be converted in place.
                </>
              )}{" "}
              You can undo with ⌘Z.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) {
                  onApply(pending.to, pending.preview.newData);
                  setPending(null);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
