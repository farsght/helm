"use client"

import {
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  RefreshCwIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react"
import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
 
interface DocumentFile {
  name: string
  size: string
  type: string
  format: string
  pages: string
}

const acceptedFormats = [
  { label: "PDF", mime: "application/pdf" },
  { label: "DOC", mime: "application/msword" },
  {
    label: "DOCX",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  { label: "XLS", mime: "application/vnd.ms-excel" },
  { label: "XLSX", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
]

function DocumentIcon({
  format,
  className,
}: {
  format?: string
  className?: string
}) {
  if (format === "PDF") {
    return <FileTextIcon className={className} />
  }

  if (format === "XLS" || format === "XLSX") {
    return <FileSpreadsheetIcon className={className} />
  }

  return <FileIcon className={className} />
}

export default function FileUploadDocument() {
  const [document, setDocument] = useState<DocumentFile | null>({
    name: "quarterly-report-q4-2025.pdf",
    size: "2.4 MB",
    type: "application/pdf",
    format: "PDF",
    pages: "24 pages",
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (fileList: FileList) => {
    const file = fileList[0]
    if (!file) return

    const sizeStr =
      file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(0)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`

    const ext = file.name.split(".").pop()?.toUpperCase() || "FILE"
    setDocument({
      name: file.name,
      size: sizeStr,
      type: file.type,
      format: ext,
      pages: "--",
    })
  }

  const removeDocument = () => {
    setDocument(null)
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="border-b px-4 py-3">
          <span className="font-medium text-sm">Upload document</span>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Attach a document to this submission
          </p>
        </div>

        {/* Accepted formats */}
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <span className="text-muted-foreground text-xs">Accepted:</span>
          <div className="flex flex-wrap gap-1">
            {acceptedFormats.map(fmt => (
              <Badge key={fmt.label} variant="secondary" className="font-normal text-[10px]">
                {fmt.label}
              </Badge>
            ))}
          </div>
          <span className="ml-auto text-muted-foreground text-xs">Max 25 MB</span>
        </div>

        {/* Upload area or document display */}
        {document ? (
          <>
            {/* Document info */}
            <div className="border-b px-4 py-4">
              <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background">
                  <DocumentIcon
                    format={document?.format}
                    className="size-5 text-muted-foreground"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-sm">{document.name}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="font-normal text-[10px]">
                      {document.format}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{document.size}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-muted-foreground text-xs">{document.pages}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => inputRef.current?.click()}
                >
                  <RefreshCwIcon className="size-3" />
                  Replace
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={removeDocument}
                >
                  <TrashIcon className="size-3" />
                  Remove
                </Button>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                Submit
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Empty upload area */}
            <div className="px-4 py-6">
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
                }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/20 px-6 py-10 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30"
              >
                <UploadIcon className="size-6 text-muted-foreground/50" />
                <div className="text-center">
                  <span className="font-medium text-sm">Select a document</span>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    PDF, DOC, DOCX, XLS, or XLSX up to 25 MB
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-3">
              <span className="text-muted-foreground text-xs">No document attached</span>
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={e => {
            if (e.target.files) handleFile(e.target.files)
            e.target.value = ""
          }}
        />
      </div>
    </section>
  )
}
