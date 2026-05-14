"use client"

import {
  ArrowDownToLineIcon,
  ArrowRightLeftIcon,
  ArrowUpFromLineIcon,
  CheckCircle2Icon,
  CloudUploadIcon,
  FileSpreadsheetIcon,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ImportMode = "merge" | "replace"

interface ColumnMapping {
  source: string
  target: string
  matched: boolean
}

const columnMappings: ColumnMapping[] = [
  { source: "full_name", target: "name", matched: true },
  { source: "email_address", target: "email", matched: true },
  { source: "company", target: "organization", matched: true },
  { source: "phone", target: "phone", matched: true },
  { source: "signup_date", target: "created_at", matched: true },
  { source: "plan_type", target: "subscription", matched: false },
]

export default function FileUploadImportExport() {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export")
  const [exportFormat, setExportFormat] = useState("csv")
  const [importMode, setImportMode] = useState<ImportMode>("merge")
  const [imported, setImported] = useState(false)

  const handleImport = () => {
    setImported(true)
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header with tabs */}
        <div className="flex items-center border-b">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
              activeTab === "export"
                ? "border-b-2 border-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownToLineIcon className="size-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
              activeTab === "import"
                ? "border-b-2 border-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpFromLineIcon className="size-3.5" />
            Import
          </button>
        </div>

        {activeTab === "export" ? (
          <>
            {/* Export format selection */}
            <div className="border-b px-4 py-3">
              <span className="text-muted-foreground text-xs">Format</span>
              <div className="mt-2">
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="json">JSON (.json)</SelectItem>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    <SelectItem value="tsv">TSV (.tsv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Export summary */}
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-muted-foreground text-xs">Records</span>
                  <p className="font-semibold text-sm tabular-nums">12,847</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Columns</span>
                  <p className="font-semibold text-sm tabular-nums">18</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Est. size</span>
                  <p className="font-semibold text-sm tabular-nums">4.2 MB</p>
                </div>
              </div>
            </div>

            {/* Download button */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-muted-foreground text-xs">
                All records will be exported with current filters applied
              </span>
              <Button size="sm" className="h-7 text-xs">
                <ArrowDownToLineIcon className="size-3" />
                Download
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Upload zone */}
            {!imported ? (
              <div className="border-b px-4 py-4">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleImport}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") handleImport()
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/20 px-6 py-8 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30"
                >
                  <CloudUploadIcon className="size-6 text-muted-foreground/60" />
                  <div className="text-center">
                    <span className="font-medium text-sm">Upload data file</span>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      CSV, JSON, or Excel up to 50 MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Imported file info */}
                <div className="border-b px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-sm">
                          contacts-export-march.csv
                        </span>
                        <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                          CSV
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        3,241 records · 6 columns · 1.8 MB
                      </span>
                    </div>
                    <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                  </div>
                </div>

                {/* Column mapping */}
                <div className="border-b">
                  <div className="border-b px-4 py-2">
                    <span className="text-muted-foreground text-xs">Column mapping</span>
                  </div>
                  {columnMappings.map((col, index) => (
                    <div
                      key={col.source}
                      className={`flex items-center gap-3 px-4 py-2 ${
                        index < columnMappings.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs">
                        {col.source}
                      </span>
                      <ArrowRightLeftIcon className="size-3 shrink-0 text-muted-foreground/40" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">
                        {col.target}
                      </span>
                      {col.matched ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                      ) : (
                        <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Import mode */}
                <div className="border-b px-4 py-3">
                  <span className="mb-2 block text-muted-foreground text-xs">Import mode</span>
                  <RadioGroup
                    value={importMode}
                    onValueChange={(v: ImportMode) => setImportMode(v)}
                    className="gap-2"
                  >
                    <span className="flex cursor-pointer items-center gap-2">
                      <RadioGroupItem value="merge" id="mode-merge" />
                      <div>
                        <span className="font-medium text-sm">Merge</span>
                        <p className="text-muted-foreground text-xs">
                          Add new records and update existing matches
                        </p>
                      </div>
                    </span>
                    <span className="flex cursor-pointer items-center gap-2">
                      <RadioGroupItem value="replace" id="mode-replace" />
                      <div>
                        <span className="font-medium text-sm">Replace</span>
                        <p className="text-muted-foreground text-xs">
                          Delete all existing records and import fresh
                        </p>
                      </div>
                    </span>
                  </RadioGroup>
                </div>

                {/* Import action */}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-muted-foreground text-xs">
                    {importMode === "merge"
                      ? "Existing records will be updated by email match"
                      : "All current data will be replaced"}
                  </span>
                  <Button size="sm" className="h-7 text-xs">
                    Import 3,241 records
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
