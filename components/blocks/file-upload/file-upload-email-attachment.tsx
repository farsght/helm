"use client"

import {
  FileIcon,
  FileImageIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  PaperclipIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Attachment {
  id: string
  name: string
  size: number
  type: "image" | "pdf" | "spreadsheet" | "document" | "other"
}

const fileTypeIcon: Record<Attachment["type"], React.ElementType> = {
  image: FileImageIcon,
  pdf: FileTextIcon,
  spreadsheet: FileSpreadsheetIcon,
  document: FileTextIcon,
  other: FileIcon,
}

const initialAttachments: Attachment[] = [
  { id: "1", name: "Q4-report-final.pdf", size: 2400000, type: "pdf" },
  { id: "2", name: "team-photo.jpg", size: 3800000, type: "image" },
  { id: "3", name: "budget-2025.xlsx", size: 890000, type: "spreadsheet" },
  { id: "4", name: "meeting-notes.docx", size: 156000, type: "document" },
  { id: "5", name: "logo-dark.svg", size: 14200, type: "image" },
]

const MAX_SIZE = 25 * 1024 * 1024 // 25 MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploadEmailAttachment() {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)

  const totalSize = attachments.reduce((sum, a) => sum + a.size, 0)
  const usagePercent = Math.min((totalSize / MAX_SIZE) * 100, 100)
  const isNearLimit = usagePercent > 80
  const isAtLimit = usagePercent >= 100

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <PaperclipIcon className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm">Attachments</span>
          {attachments.length > 0 && (
            <Badge variant="secondary" className="font-normal text-xs">
              {attachments.length} files
            </Badge>
          )}
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              disabled={isAtLimit}
            >
              <PlusIcon className="size-3" />
              Attach
            </Button>
          </div>
        </div>

        {/* Attachment chips */}
        {attachments.length > 0 ? (
          <div className="border-b px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {attachments.map(attachment => {
                const Icon = fileTypeIcon[attachment.type]
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-1.5 rounded-md bg-muted/50 py-1 pl-2 pr-1"
                  >
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="max-w-[160px] truncate text-xs">{attachment.name}</span>
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {formatSize(attachment.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="ml-0.5 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="border-b px-4 py-8 text-center">
            <PaperclipIcon className="mx-auto size-5 text-muted-foreground/40" />
            <p className="mt-1.5 text-muted-foreground text-xs">
              No attachments. Click Attach to add files.
            </p>
          </div>
        )}

        {/* Size indicator */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              Total: {formatSize(totalSize)} of {formatSize(MAX_SIZE)}
            </span>
            <span
              className={`text-xs ${
                isAtLimit
                  ? "text-red-600 dark:text-red-400"
                  : isNearLimit
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              }`}
            >
              {isAtLimit ? "Limit reached" : `${formatSize(MAX_SIZE - totalSize)} remaining`}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-foreground/20"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-muted-foreground text-xs">
            Max 25 MB per email. Individual files up to 10 MB each.
          </p>
        </div>
      </div>
    </section>
  )
}
