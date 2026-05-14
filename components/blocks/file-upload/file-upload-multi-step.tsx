"use client"

import {
  CheckCircle2Icon,
  CheckIcon,
  CloudUploadIcon,
  FileIcon,
  ImageIcon,
  SettingsIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface SelectedFile {
  id: string
  name: string
  size: string
  type: string
}

interface ConfigOption {
  id: string
  label: string
  description: string
  enabled: boolean
}

const defaultOptions: ConfigOption[] = [
  {
    id: "resize",
    label: "Resize images",
    description: "Scale to max 2048px on longest side",
    enabled: true,
  },
  {
    id: "compress",
    label: "Compress files",
    description: "Reduce file size with lossy compression",
    enabled: true,
  },
  {
    id: "rename",
    label: "Auto-rename",
    description: "Use slugified filenames with timestamps",
    enabled: false,
  },
  {
    id: "strip",
    label: "Strip metadata",
    description: "Remove EXIF and GPS data from images",
    enabled: true,
  },
]

const steps = ["Select files", "Configure", "Upload", "Complete"]

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploadMultiStep() {
  const [currentStep, setCurrentStep] = useState(0)
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [options, setOptions] = useState(defaultOptions)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const newFiles: SelectedFile[] = Array.from(fileList).map((file, index) => ({
        id: `${files.length + index}-${file.name}`,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || "unknown",
      }))
      setFiles(prev => [...prev, ...newFiles])
    },
    [files.length],
  )

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const toggleOption = (id: string) => {
    setOptions(prev => prev.map(o => (o.id === id ? { ...o, enabled: !o.enabled } : o)))
  }

  const startUpload = () => {
    setCurrentStep(2)
    setUploadProgress(0)
    let current = 0
    const interval = setInterval(() => {
      current += 5 + Math.floor(current / 15)
      if (current >= 100) {
        current = 100
        clearInterval(interval)
        setTimeout(() => setCurrentStep(3), 400)
      }
      setUploadProgress(current)
    }, 200)
  }

  const handleReset = () => {
    setCurrentStep(0)
    setFiles([])
    setOptions(defaultOptions)
    setUploadProgress(0)
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Progress indicator */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] font-medium ${
                    index < currentStep
                      ? "bg-foreground text-background"
                      : index === currentStep
                        ? "border border-foreground text-foreground"
                        : "border border-muted-foreground/30 text-muted-foreground/50"
                  }`}
                >
                  {index < currentStep ? <CheckIcon className="size-3" /> : index + 1}
                </div>
                <span
                  className={`hidden text-xs sm:inline ${
                    index <= currentStep ? "font-medium" : "text-muted-foreground"
                  }`}
                >
                  {step}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 hidden h-px w-8 sm:block ${
                      index < currentStep ? "bg-foreground" : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select files */}
        {currentStep === 0 && (
          <>
            <div className="border-b px-4 py-4">
              <div
                role="button"
                tabIndex={0}
                onDragOver={e => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={e => {
                  e.preventDefault()
                  setIsDragging(false)
                }}
                onDrop={e => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
                }}
                onClick={() => inputRef.current?.click()}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 transition-colors ${
                  isDragging
                    ? "border-foreground/30 bg-muted/50"
                    : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/30"
                }`}
              >
                <CloudUploadIcon className="size-6 text-muted-foreground/60" />
                <div className="text-center">
                  <span className="font-medium text-sm">Drop files here</span>
                  <p className="mt-0.5 text-muted-foreground text-xs">or click to browse</p>
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

            {files.length > 0 && (
              <div className="border-b">
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
                      size="sm"
                      className="size-6 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => removeFile(file.id)}
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end px-4 py-3">
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={files.length === 0}
                onClick={() => setCurrentStep(1)}
              >
                Next
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Configure */}
        {currentStep === 1 && (
          <>
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <SettingsIcon className="size-3.5 text-muted-foreground" />
                <span className="font-medium text-sm">Processing options</span>
              </div>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Configure how your {files.length} {files.length === 1 ? "file" : "files"} will be
                processed
              </p>
            </div>

            <div className="border-b">
              {options.map((option, index) => (
                <span
                  key={option.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleOption(option.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      toggleOption(option.id)
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                    index < options.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div
                    role="checkbox"
                    aria-checked={option.enabled}
                    tabIndex={-1}
                    className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      option.enabled
                        ? "border-foreground bg-foreground"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {option.enabled && <CheckIcon className="size-3 text-background" />}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-sm">{option.label}</span>
                    <p className="text-muted-foreground text-xs">{option.description}</p>
                  </div>
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCurrentStep(0)}
              >
                Back
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={startUpload}>
                Start upload
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Upload progress */}
        {currentStep === 2 && (
          <div className="px-4 py-8">
            <div className="flex flex-col items-center gap-3">
              <CloudUploadIcon className="size-8 animate-pulse text-muted-foreground" />
              <div className="text-center">
                <span className="font-medium text-sm">Uploading files</span>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  Processing {files.length} {files.length === 1 ? "file" : "files"}...
                </p>
              </div>
              <div className="mt-2 w-full max-w-xs">
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
              <span className="font-semibold text-sm tabular-nums">{uploadProgress}%</span>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 3 && (
          <>
            <div className="px-4 py-8">
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2Icon className="size-8 text-emerald-600 dark:text-emerald-400" />
                <div className="text-center">
                  <span className="font-medium text-sm">Upload complete</span>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {files.length} {files.length === 1 ? "file has" : "files have"} been uploaded
                    and processed
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    index < files.length - 1 ? "border-b" : ""
                  }`}
                >
                  <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium text-sm">{file.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {file.size}
                  </Badge>
                  <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-500" />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end border-t px-4 py-3">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleReset}>
                Upload more files
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
