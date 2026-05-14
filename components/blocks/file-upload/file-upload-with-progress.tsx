"use client"

import {
  CheckCircle2Icon,
  FileIcon,
  PauseIcon,
  PlayIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

type UploadStatus = "idle" | "uploading" | "paused" | "complete"

interface FileInfo {
  name: string
  size: number
  type: string
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploadWithProgress() {
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [file, setFile] = useState<FileInfo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Static display values to avoid hydration issues
  const speed = "2.4 MB/s"
  const transferred = file ? formatBytes(Math.floor((file.size * progress) / 100)) : "0 B"
  const totalSize = file ? formatBytes(file.size) : "0 B"
  const timeRemaining =
    progress < 100 ? `${Math.max(1, Math.floor((100 - progress) / 8))}s left` : "Done"

  const startUpload = useCallback((f: File) => {
    setFile({ name: f.name, size: f.size, type: f.type || "application/octet-stream" })
    setStatus("uploading")
    setProgress(0)

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 3 + Math.floor(prev / 20)
        if (next >= 100) {
          clearInterval(interval)
          setTimeout(() => setStatus("complete"), 200)
          return 100
        }
        return next
      })
    }, 200)

    intervalRef.current = interval
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) startUpload(selected)
    },
    [startUpload],
  )

  const togglePause = () => {
    if (status === "uploading") {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setStatus("paused")
    } else if (status === "paused") {
      setStatus("uploading")
      const interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + 3 + Math.floor(prev / 20)
          if (next >= 100) {
            clearInterval(interval)
            setTimeout(() => setStatus("complete"), 200)
            return 100
          }
          return next
        })
      }, 200)
      intervalRef.current = interval
    }
  }

  const cancel = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setStatus("idle")
    setProgress(0)
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const reset = () => {
    setStatus("idle")
    setProgress(0)
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-medium text-sm">Upload file</span>
          {status !== "idle" && (
            <span className="tabular-nums text-muted-foreground text-xs">
              {status === "complete" ? "Uploaded" : status === "paused" ? "Paused" : `${progress}%`}
            </span>
          )}
        </div>

        {status === "idle" ? (
          /* File selection */
          <div className="flex flex-col items-center px-4 py-10">
            <UploadCloudIcon className="mb-3 size-8 text-muted-foreground" />
            <span className="font-medium text-sm">Select a file to upload</span>
            <span className="mt-1 text-muted-foreground text-xs">Maximum 50 MB per file</span>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          </div>
        ) : (
          <>
            {/* File info */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <div className="flex size-8 items-center justify-center rounded-md bg-muted/50">
                {status === "complete" ? (
                  <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <FileIcon className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium text-sm">{file?.name}</span>
                <span className="text-muted-foreground text-xs">{totalSize}</span>
              </div>
              {status === "complete" && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>
                  Upload another
                </Button>
              )}
            </div>

            {/* Progress section */}
            {status !== "complete" && (
              <div className="border-b px-4 py-3">
                <div className="mb-2">
                  <Progress value={progress} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-muted-foreground text-xs">
                      {transferred} of {totalSize}
                    </span>
                    <span className="text-muted-foreground text-xs">&middot;</span>
                    <span className="tabular-nums text-muted-foreground text-xs">{speed}</span>
                  </div>
                  <span className="tabular-nums text-muted-foreground text-xs">
                    {timeRemaining}
                  </span>
                </div>
              </div>
            )}

            {/* Controls */}
            {status !== "complete" && (
              <div className="flex items-center justify-end gap-2 px-4 py-3">
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={cancel}>
                  <XIcon className="size-3" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={togglePause}
                >
                  {status === "paused" ? (
                    <>
                      <PlayIcon className="size-3" />
                      Resume
                    </>
                  ) : (
                    <>
                      <PauseIcon className="size-3" />
                      Pause
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
