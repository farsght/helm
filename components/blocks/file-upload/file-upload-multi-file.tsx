"use client"

import {
  CheckCircle2Icon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  PlusIcon,
  TriangleAlertIcon,
  VideoIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "~/components/ui/button"
import { Progress } from "~/components/ui/progress"

type FileStatus = "uploading" | "complete" | "error"

interface UploadFile {
  id: string
  name: string
  size: string
  type: string
  progress: number
  status: FileStatus
}

const initialFiles: UploadFile[] = [
  {
    id: "1",
    name: "quarterly-report.pdf",
    size: "2.4 MB",
    type: "application/pdf",
    progress: 100,
    status: "complete",
  },
  {
    id: "2",
    name: "team-photo.jpg",
    size: "4.1 MB",
    type: "image/jpeg",
    progress: 100,
    status: "complete",
  },
  {
    id: "3",
    name: "product-demo.mp4",
    size: "18.7 MB",
    type: "video/mp4",
    progress: 64,
    status: "uploading",
  },
  {
    id: "4",
    name: "budget-2026.xlsx",
    size: "892 KB",
    type: "application/vnd.ms-excel",
    progress: 32,
    status: "uploading",
  },
  {
    id: "5",
    name: "architecture-diagram.png",
    size: "1.8 MB",
    type: "image/png",
    progress: 0,
    status: "error",
  },
]

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon
  if (type.startsWith("video/")) return VideoIcon
  if (type.includes("pdf") || type.includes("document") || type.includes("text"))
    return FileTextIcon
  return FileIcon
}

const statusConfig: Record<FileStatus, { icon: React.ElementType; color: string; label: string }> =
  {
    uploading: { icon: Loader2Icon, color: "text-muted-foreground", label: "Uploading" },
    complete: {
      icon: CheckCircle2Icon,
      color: "text-emerald-600 dark:text-emerald-400",
      label: "Complete",
    },
    error: { icon: TriangleAlertIcon, color: "text-red-600 dark:text-red-400", label: "Failed" },
  }

export default function FileUploadMultiFile() {
  const [files, setFiles] = useState<UploadFile[]>(initialFiles)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setFiles(prev =>
        prev.map(file => {
          if (file.status !== "uploading") return file
          const next = file.progress + 2
          if (next >= 100) return { ...file, progress: 100, status: "complete" as const }
          return { ...file, progress: next }
        }),
      )
    }, 300)
    return () => clearInterval(interval)
  }, [])

  const addFiles = useCallback(
    (fileList: FileList) => {
      const newFiles: UploadFile[] = Array.from(fileList).map((file, i) => {
        const sizeStr =
          file.size < 1024 * 1024
            ? `${(file.size / 1024).toFixed(0)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        return {
          id: `new-${files.length + i}-${file.name}`,
          name: file.name,
          size: sizeStr,
          type: file.type,
          progress: 0,
          status: "uploading" as const,
        }
      })
      setFiles(prev => [...prev, ...newFiles])
    },
    [files.length],
  )

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const completedCount = files.filter(f => f.status === "complete").length
  const totalSize = files.length > 0 ? "27.9 MB" : "0 B"

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <span className="font-medium text-sm">Uploads</span>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {completedCount} of {files.length} complete · {totalSize}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => inputRef.current?.click()}
          >
            <PlusIcon className="size-3.5" />
            Add files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </div>

        {/* File list */}
        <div>
          {files.map((file, index) => {
            const Icon = getFileIcon(file.type)
            const statusInfo = statusConfig[file.status]
            const StatusIcon = statusInfo.icon
            const isLast = index === files.length - 1

            return (
              <div key={file.id} className={isLast ? "" : "border-b"}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-sm">{file.name}</span>
                      <span className="shrink-0 text-muted-foreground text-xs">{file.size}</span>
                    </div>
                    {file.status === "uploading" && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={file.progress} className="h-1" />
                        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                          {file.progress}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusIcon
                      className={`size-4 ${statusInfo.color} ${file.status === "uploading" ? "animate-spin" : ""}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeFile(file.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {files.length === 0 && (
          <div className="px-4 py-8 text-center">
            <span className="text-muted-foreground text-xs">No files in queue</span>
          </div>
        )}
      </div>
    </section>
  )
}
