"use client";

/**
 * Dataset CSV Import Wizard
 *
 * Multi-step flow composed from blocks in /components/blocks/file-upload:
 *   1. Drop          (file-upload-dropzone vibe)
 *   2. Preview       (file-upload-spreadsheet-preview — inferred columns + sample rows)
 *   3. Importing     (file-upload-with-progress — uploading + server-side parse)
 *   4. Done          (success / error)
 *
 * The preview is computed client-side so the user can sanity-check column types
 * before committing. On import we POST the original file to /api/datasets which
 * re-parses and infers server-side (single source of truth for stored schema).
 */

import * as React from "react";
import * as Papa from "papaparse";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  CheckCircle2Icon,
  CheckIcon,
  CloudUploadIcon,
  FileIcon,
  FileSpreadsheetIcon,
  HashIcon,
  RefreshCwIcon,
  ToggleLeftIcon,
  TypeIcon,
  XIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  inferSchema,
  type DatasetColumn,
  type DatasetColumnType,
} from "@/lib/dataset-import";

const PREVIEW_ROWS = 5;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

type Step = "drop" | "preview" | "importing" | "done" | "error";

type Preview = {
  schema: DatasetColumn[];
  sampleRows: Record<string, string>[];
  totalRows: number;
};

const TYPE_ICON: Record<DatasetColumnType, React.ElementType> = {
  string: TypeIcon,
  number: HashIcon,
  date: CalendarIcon,
  boolean: ToggleLeftIcon,
};

const TYPE_LABEL: Record<DatasetColumnType, string> = {
  string: "Text",
  number: "Number",
  date: "Date",
  boolean: "Boolean",
};

const STEPS: { id: Exclude<Step, "error">; label: string }[] = [
  { id: "drop", label: "File" },
  { id: "preview", label: "Preview" },
  { id: "importing", label: "Import" },
  { id: "done", label: "Done" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface DatasetImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (dataset: { id: number; name: string; rowCount: number }) => void;
}

export function DatasetImportWizard({
  open,
  onOpenChange,
  onImported,
}: DatasetImportWizardProps) {
  const router = useRouter();

  const [step, setStep] = React.useState<Step>("drop");
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [parsing, setParsing] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const reset = React.useCallback(() => {
    setStep("drop");
    setFile(null);
    setName("");
    setDescription("");
    setPreview(null);
    setProgress(0);
    setErrorMessage(null);
    setParsing(false);
    setDragging(false);
  }, []);

  // Reset every time the dialog opens
  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // -------- Step 1: Drop --------

  const handlePickFile = async (picked: File | null) => {
    if (!picked) return;
    if (picked.size > MAX_FILE_BYTES) {
      setErrorMessage(
        `File is ${formatBytes(picked.size)}. Maximum allowed is ${formatBytes(MAX_FILE_BYTES)}.`,
      );
      setStep("error");
      return;
    }
    const isCsv =
      picked.type === "text/csv" ||
      picked.type === "application/vnd.ms-excel" ||
      picked.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      setErrorMessage(
        `"${picked.name}" is not a CSV file. Supported format: .csv`,
      );
      setStep("error");
      return;
    }
    setFile(picked);
    if (!name) setName(picked.name.replace(/\.csv$/i, ""));
    await runPreview(picked);
  };

  const runPreview = async (csv: File) => {
    setParsing(true);
    setErrorMessage(null);
    try {
      const text = await csv.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        throw new Error(
          parsed.errors[0]?.message || "CSV could not be parsed.",
        );
      }
      const headers = (parsed.meta.fields ?? []).filter((h): h is string => !!h);
      if (headers.length === 0) {
        throw new Error("CSV has no header row.");
      }
      const schema = inferSchema(headers, parsed.data);
      const sampleRows = parsed.data.slice(0, PREVIEW_ROWS);

      setPreview({ schema, sampleRows, totalRows: parsed.data.length });
      setStep("preview");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to parse CSV.");
      setStep("error");
    } finally {
      setParsing(false);
    }
  };

  // -------- Step 3: Importing --------

  const startImport = async () => {
    if (!file) return;
    setStep("importing");
    setProgress(0);
    setErrorMessage(null);

    // Visual progress feedback. Real upload uses fetch — we ease the bar to
    // 85% during request, then jump to 100% on response.
    const easingInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        return prev + Math.max(1, Math.floor((85 - prev) / 8));
      });
    }, 250);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name || file.name);
      if (description) form.append("description", description);
      const res = await fetch("/api/datasets", { method: "POST", body: form });
      clearInterval(easingInterval);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }
      const created = await res.json();
      setProgress(100);
      onImported?.(created);
      setStep("done");
      // Auto-close after a beat, then navigate
      setTimeout(() => {
        onOpenChange(false);
        router.push(`/datasets/${created.id}`);
      }, 1200);
    } catch (err) {
      clearInterval(easingInterval);
      setErrorMessage(err instanceof Error ? err.message : "Import failed.");
      setStep("error");
    }
  };

  // -------- Step indicator --------

  const stepIndex = step === "error" ? -1 : STEPS.findIndex((s) => s.id === step);

  // -------- Drag/drop handlers --------

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handlePickFile(f);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Drop a CSV file. We&apos;ll infer column types automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 px-6 py-4 border-b bg-muted/30 shrink-0">
          {STEPS.map((s, i) => {
            const active = i === stepIndex;
            const complete = i < stepIndex || step === "done";
            return (
              <React.Fragment key={s.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    active && "text-foreground font-medium",
                    !active && !complete && "text-muted-foreground",
                    complete && "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border text-[10px] font-medium",
                      active && "border-primary bg-primary text-primary-foreground",
                      complete && "border-primary/50 bg-primary/10 text-primary",
                      !active && !complete && "border-border",
                    )}
                  >
                    {complete ? <CheckIcon className="size-3" /> : i + 1}
                  </span>
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="h-px w-6 bg-border" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step body — flex-1 lets it claim available height; min-h-0 so the inner overflow works */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          {step === "drop" && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-12 px-6 text-center transition-colors cursor-pointer",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <CloudUploadIcon className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {parsing ? "Parsing..." : "Drop your CSV file here"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  or click to browse · max {formatBytes(MAX_FILE_BYTES)}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {step === "preview" && preview && file && (
            <div className="flex flex-col gap-4">
              {/* File summary */}
              <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <FileSpreadsheetIcon className="size-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} · {preview.totalRows.toLocaleString()} rows · {preview.schema.length} columns
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => setStep("drop")}
                  aria-label="Choose different file"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>

              {/* Name + description */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ds-name">Dataset name *</Label>
                  <Input
                    id="ds-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Q1 Trade Show Leads"
                  />
                </div>
                <div>
                  <Label htmlFor="ds-desc">Description</Label>
                  <Input
                    id="ds-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Spreadsheet preview */}
              <div className="rounded-md border overflow-hidden flex flex-col">
                <div className="border-b px-3 py-2 flex items-center justify-between bg-muted/30 shrink-0">
                  <span className="text-xs font-medium">Preview</span>
                  <span className="text-xs text-muted-foreground">
                    First {Math.min(PREVIEW_ROWS, preview.totalRows)} of {preview.totalRows.toLocaleString()} rows
                  </span>
                </div>
                {/* Scroll container — explicit max-w via parent + max-h here. min-w-full on the table lets it grow naturally and trigger horizontal scroll. */}
                <div className="overflow-auto max-h-[320px]">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/20 sticky top-0 z-10">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground tabular-nums w-10 bg-muted/20">#</th>
                        {preview.schema.map((col) => {
                          const Icon = TYPE_ICON[col.type];
                          return (
                            <th key={col.key} className="px-3 py-2 text-left bg-muted/20 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{col.label}</span>
                                <Badge variant="secondary" className="w-fit gap-1 text-[10px] font-normal">
                                  <Icon className="size-3" />
                                  {TYPE_LABEL[col.type]}
                                </Badge>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sampleRows.map((row, i) => (
                        <tr key={i} className={cn(i < preview.sampleRows.length - 1 && "border-b")}>
                          <td className="px-3 py-2 font-mono text-muted-foreground tabular-nums">
                            {i + 1}
                          </td>
                          {preview.schema.map((col) => (
                            <td
                              key={col.key}
                              className={cn(
                                "px-3 py-2 max-w-[240px] truncate",
                                col.type === "number" && "font-mono tabular-nums",
                              )}
                              title={String(row[col.label] ?? "")}
                            >
                              {String(row[col.label] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.totalRows > PREVIEW_ROWS && (
                  <div className="border-t px-3 py-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {(preview.totalRows - PREVIEW_ROWS).toLocaleString()} more rows not shown
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "importing" && file && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <CloudUploadIcon className="size-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Importing {file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Parsing rows and writing to your database…
                </p>
              </div>
              <div className="w-full max-w-md">
                <Progress value={progress} />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progress}%</span>
                  <span>{preview ? `${preview.totalRows.toLocaleString()} rows` : ""}</span>
                </div>
              </div>
            </div>
          )}

          {step === "done" && preview && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2Icon className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">Import complete</p>
              <p className="text-xs text-muted-foreground">
                {preview.totalRows.toLocaleString()} rows imported. Redirecting to your dataset…
              </p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                <FileIcon className="size-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Import failed</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  {errorMessage || "Something went wrong."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
          {step === "drop" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("drop")}>
                Back
              </Button>
              <Button onClick={startImport} disabled={!name || !file}>
                Import {preview ? preview.totalRows.toLocaleString() : ""} rows
              </Button>
            </>
          )}
          {step === "importing" && (
            <Button variant="outline" disabled>
              Importing…
            </Button>
          )}
          {step === "done" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
          {step === "error" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={reset}>
                <RefreshCwIcon className="mr-2 size-4" />
                Try again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
