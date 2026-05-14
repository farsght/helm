"use client"

import {
  CheckCircle2Icon,
  FilmIcon,
  Loader2Icon,
  PlayIcon,
  TrashIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type VideoStatus = "queued" | "processing" | "complete" | "error"

interface VideoFile {
  id: string
  name: string
  size: string
  format: string
  duration: string
  status: VideoStatus
}

const maxDuration = "10 min"

const initialFiles: VideoFile[] = [
  {
    id: "1",
    name: "product-demo-final.mp4",
    size: "142.3 MB",
    format: "MP4",
    duration: "3:24",
    status: "complete",
  },
  {
    id: "2",
    name: "onboarding-tutorial.mov",
    size: "287.6 MB",
    format: "MOV",
    duration: "7:51",
    status: "processing",
  },
  {
    id: "3",
    name: "testimonial-clip.avi",
    size: "56.8 MB",
    format: "AVI",
    duration: "1:12",
    status: "queued",
  },
]

const statusConfig: Record<VideoStatus, { label: string; className: string }> = {
  queued: { label: "Queued", className: "text-muted-foreground" },
  processing: { label: "Processing", className: "text-amber-600 dark:text-amber-400" },
  complete: { label: "Complete", className: "text-emerald-600 dark:text-emerald-400" },
  error: { label: "Failed", className: "text-red-600 dark:text-red-400" },
}

const statusDot: Record<VideoStatus, string> = {
  queued: "bg-muted-foreground",
  processing: "bg-amber-500",
  complete: "bg-emerald-500",
  error: "bg-red-500",
}

export default function FileUploadVideo() {
  const [files, setFiles] = useState<VideoFile[]>(initialFiles)
  const [isDragOver, setIsDragOver] = useState(false)

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const totalSize =
    files.length > 0 ? `${files.length} video${files.length !== 1 ? "s" : ""}` : "No videos"
  const completeCount = files.filter(f => f.status === "complete").length

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-medium text-sm">Upload videos</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              MP4, MOV, AVI up to 500 MB. Max duration {maxDuration}.
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <span>{totalSize}</span>
            <span>·</span>
            <span>{completeCount} processed</span>
          </div>
        </div>

        {/* Drop zone */}
        <div className="border-b px-4 py-4">
          <div
            onDragOver={e => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setIsDragOver(false)
            }}
            className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 transition-colors ${
              isDragOver ? "border-foreground/30 bg-muted/50" : "border-muted-foreground/25"
            }`}
          >
            <UploadCloudIcon className="size-5 text-muted-foreground/60" />
            <div className="text-center">
              <p className="font-medium text-sm">Drop video files here</p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                or click to browse from your device
              </p>
            </div>
            <Button variant="outline" size="sm" className="mt-1 h-7 text-xs">
              Choose files
            </Button>
          </div>
        </div>

        {/* File list */}
        <div>
          {files.map((file, index) => {
            const isLast = index === files.length - 1
            return (
              <div
                key={file.id}
                className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b"}`}
              >
                {/* Thumbnail placeholder */}
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted/50">
                  {file.status === "complete" ? (
                    <PlayIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <FilmIcon className="size-4 text-muted-foreground/60" />
                  )}
                </div>

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-sm">{file.name}</span>
                    <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                      {file.format}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-muted-foreground text-xs">
                    <span>{file.duration}</span>
                    <span>·</span>
                    <span>{file.size}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5">
                      {file.status === "processing" ? (
                        <Loader2Icon className="size-3 animate-spin" />
                      ) : (
                        <span className={`size-1.5 rounded-full ${statusDot[file.status]}`} />
                      )}
                      <span className={statusConfig[file.status].className}>
                        {statusConfig[file.status].label}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {file.status === "complete" && (
                    <CheckCircle2Icon className="size-4 text-emerald-500" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => removeFile(file.id)}
                  >
                    {file.status === "queued" ? (
                      <XIcon className="size-3.5" />
                    ) : (
                      <TrashIcon className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )
          })}

          {files.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <FilmIcon className="size-5 text-muted-foreground/40" />
              <p className="mt-2 text-muted-foreground text-xs">No videos uploaded yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {files.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-muted-foreground text-xs">
              Videos exceeding {maxDuration} will be rejected
            </p>
            <Button size="sm" className="h-7 text-xs">
              Upload all
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
