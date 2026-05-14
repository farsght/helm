"use client"

import { CloudUploadIcon, FileIcon, XIcon } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

interface UploadedFile {
  id: string
  name: string
  size: string
  type: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploadDropzone() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const newFiles: UploadedFile[] = Array.from(fileList).map((file, index) => ({
        id: `${files.length + index}-${file.name}`,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
      }))
      setFiles(prev => [...prev, ...newFiles])
    },
    [files.length],
  )

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="border-b px-4 py-3">
          <span className="font-medium text-sm">Upload files</span>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Drag and drop files or click to browse
          </p>
        </div>

        {/* Dropzone */}
        <div className="border-b px-4 py-4">
          <div
            role="button"
            tabIndex={0}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 transition-colors ${
              isDragging
                ? "border-foreground/30 bg-muted/50"
                : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/30"
            }`}
          >
            <CloudUploadIcon className="size-8 text-muted-foreground/60" />
            <div className="text-center">
              <span className="font-medium text-sm">Drop files here</span>
              <p className="mt-0.5 text-muted-foreground text-xs">
                or click to browse from your device
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => {
                if (e.target.files) handleFiles(e.target.files)
                e.target.value = ""
              }}
            />
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div>
            <div className="border-b px-4 py-2">
              <span className="text-muted-foreground text-xs">
                {files.length} {files.length === 1 ? "file" : "files"} selected
              </span>
            </div>
            {files.map((file, index) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  index < files.length - 1 ? "border-b" : ""
                }`}
              >
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-sm">{file.name}</span>
                  <span className="text-muted-foreground text-xs">{file.size}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeFile(file.id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {files.length === 0 && (
          <div className="px-4 py-6 text-center">
            <span className="text-muted-foreground text-xs">No files uploaded yet</span>
          </div>
        )}
      </div>
    </section>
  )
}
