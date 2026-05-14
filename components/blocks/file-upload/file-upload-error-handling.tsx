"use client"

import {
  AlertCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  FileWarningIcon,
  HardDriveIcon,
  RefreshCwIcon,
  WifiOffIcon,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

type ErrorType = "network" | "too-large" | "invalid-type" | "server" | "timeout"

interface UploadError {
  id: string
  type: ErrorType
  fileName: string
  fileSize: string
  title: string
  description: string
  helpText: string
}

const errors: UploadError[] = [
  {
    id: "1",
    type: "network",
    fileName: "quarterly-report.pdf",
    fileSize: "4.2 MB",
    title: "Network connection lost",
    description:
      "The upload was interrupted because the network connection dropped. Your file was not saved.",
    helpText: "Check your internet connection and try again.",
  },
  {
    id: "2",
    type: "too-large",
    fileName: "design-assets-full.zip",
    fileSize: "256 MB",
    title: "File exceeds size limit",
    description:
      "The file is 256 MB but the maximum allowed size is 50 MB. Reduce the file size or split it into smaller parts.",
    helpText: "Compress the file or remove unused assets.",
  },
  {
    id: "3",
    type: "invalid-type",
    fileName: "presentation.pptx",
    fileSize: "18.7 MB",
    title: "File type not supported",
    description: "PPTX files are not accepted. Supported formats are PNG, JPG, PDF, and ZIP.",
    helpText: "Convert the file to a supported format.",
  },
  {
    id: "4",
    type: "server",
    fileName: "analytics-export.csv",
    fileSize: "1.8 MB",
    title: "Server error",
    description:
      "The server returned a 502 error while processing the upload. This is usually temporary.",
    helpText: "Wait a moment and try uploading again.",
  },
  {
    id: "5",
    type: "timeout",
    fileName: "video-recording.mp4",
    fileSize: "48.3 MB",
    title: "Upload timed out",
    description:
      "The upload did not complete within 120 seconds. This may be caused by a slow connection or server load.",
    helpText: "Try uploading during off-peak hours.",
  },
]

const errorIcon: Record<ErrorType, React.ReactNode> = {
  network: <WifiOffIcon className="size-4 text-red-500" />,
  "too-large": <HardDriveIcon className="size-4 text-amber-500" />,
  "invalid-type": <FileWarningIcon className="size-4 text-amber-500" />,
  server: <AlertCircleIcon className="size-4 text-red-500" />,
  timeout: <ClockIcon className="size-4 text-amber-500" />,
}

const errorDot: Record<ErrorType, string> = {
  network: "bg-red-500",
  "too-large": "bg-amber-500",
  "invalid-type": "bg-amber-500",
  server: "bg-red-500",
  timeout: "bg-amber-500",
}

export default function FileUploadErrorHandling() {
  const [expanded, setExpanded] = useState<string | null>("1")
  const [retried, setRetried] = useState<Set<string>>(new Set())

  const handleRetry = (id: string) => {
    setRetried(prev => new Set(prev).add(id))
  }

  const criticalCount = errors.filter(e => e.type === "network" || e.type === "server").length
  const warningCount = errors.filter(
    e => e.type === "too-large" || e.type === "invalid-type" || e.type === "timeout",
  ).length

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-medium text-sm">Upload errors</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <span className="size-1.5 rounded-full bg-red-500" />
              {criticalCount}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {warningCount}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="font-semibold text-2xl tabular-nums text-red-600 dark:text-red-400">
            {errors.length}
          </span>
          <span className="text-muted-foreground text-xs">failed uploads</span>
          <span className="text-muted-foreground text-xs">&middot;</span>
          <span className="text-muted-foreground text-xs">{retried.size} retried</span>
        </div>

        {/* Error list */}
        <div>
          {errors.map((error, index) => {
            const isExpanded = expanded === error.id
            const isLast = index === errors.length - 1
            const wasRetried = retried.has(error.id)
            return (
              <div key={error.id} className={isLast ? "" : "border-b"}>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : error.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className={`size-2 shrink-0 rounded-full ${errorDot[error.type]}`} />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-sm">{error.title}</span>
                    <p className="mt-0.5 truncate text-muted-foreground text-xs">
                      {error.fileName} &middot; {error.fileSize}
                    </p>
                  </div>
                  <ChevronRightIcon
                    className={`size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pl-9">
                    <p className="mb-3 text-muted-foreground text-sm leading-relaxed">
                      {error.description}
                    </p>
                    <div className="rounded-md bg-muted/50 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        {errorIcon[error.type]}
                        <span className="text-sm">{error.helpText}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={e => {
                            e.stopPropagation()
                            handleRetry(error.id)
                          }}
                          disabled={wasRetried}
                        >
                          <RefreshCwIcon className="size-3" />
                          {wasRetried ? "Retrying..." : "Retry upload"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-muted-foreground text-xs"
                          onClick={e => e.stopPropagation()}
                        >
                          View help
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
