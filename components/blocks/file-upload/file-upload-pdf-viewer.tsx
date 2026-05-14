"use client"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudUploadIcon,
  DownloadIcon,
  FileTextIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
} from "lucide-react"
import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface PdfFile {
  name: string
  size: string
  pages: number
  author: string
  created: string
  dimensions: string
  version: string
}

const samplePdf: PdfFile = {
  name: "Q4-2025-Financial-Report.pdf",
  size: "2.4 MB",
  pages: 24,
  author: "Sarah Chen",
  created: "Dec 15, 2025",
  dimensions: "8.5 x 11 in",
  version: "PDF 1.7",
}

export default function FileUploadPdfViewer() {
  const [file, setFile] = useState<PdfFile | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = () => {
    setFile(samplePdf)
    setCurrentPage(1)
    setZoom(100)
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
    if (e.dataTransfer.files.length > 0) handleUpload()
  }

  const prevPage = () => setCurrentPage(p => Math.max(1, p - 1))
  const nextPage = () => setCurrentPage(p => (file ? Math.min(file.pages, p + 1) : p))
  const zoomIn = () => setZoom(z => Math.min(200, z + 25))
  const zoomOut = () => setZoom(z => Math.max(50, z - 25))

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium text-sm">{file ? file.name : "PDF Viewer"}</span>
          </div>
          {file && (
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                <DownloadIcon className="size-3" />
                Download
              </Button>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                <PrinterIcon className="size-3" />
                Print
              </Button>
            </div>
          )}
        </div>

        {!file ? (
          /* Upload area */
          <div className="p-4">
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
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-12 transition-colors ${
                isDragging
                  ? "border-foreground/30 bg-muted/50"
                  : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/30"
              }`}
            >
              <CloudUploadIcon className="size-8 text-muted-foreground/60" />
              <span className="font-medium text-sm">Drop a PDF file here</span>
              <p className="text-muted-foreground text-xs">or click to browse from your device</p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={() => handleUpload()}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={prevPage}
                  disabled={currentPage <= 1}
                  className="text-muted-foreground"
                >
                  <ChevronLeftIcon className="size-3.5" />
                </Button>
                <span className="tabular-nums text-xs text-muted-foreground">
                  {currentPage} / {file.pages}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={nextPage}
                  disabled={currentPage >= file.pages}
                  className="text-muted-foreground"
                >
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={zoomOut}
                  disabled={zoom <= 50}
                  className="text-muted-foreground"
                >
                  <MinusIcon className="size-3.5" />
                </Button>
                <span className="w-10 text-center tabular-nums text-xs text-muted-foreground">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={zoomIn}
                  disabled={zoom >= 200}
                  className="text-muted-foreground"
                >
                  <PlusIcon className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Page preview */}
            <div className="flex items-center justify-center border-b bg-muted/30 px-4 py-8">
              <div className="flex h-48 w-36 flex-col items-center justify-center rounded border bg-background shadow-sm">
                <FileTextIcon className="size-8 text-muted-foreground/40" />
                <span className="mt-2 text-muted-foreground text-xs">Page {currentPage}</span>
                <div className="mt-3 flex flex-col items-center gap-1 px-4 w-full">
                  <div className="h-1 w-full rounded-full bg-muted" />
                  <div className="h-1 w-full rounded-full bg-muted" />
                  <div className="h-1 w-3/4 rounded-full bg-muted" />
                  <div className="mt-1 h-1 w-full rounded-full bg-muted" />
                  <div className="h-1 w-5/6 rounded-full bg-muted" />
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="px-4 py-3">
              <span className="font-medium text-muted-foreground text-xs">File details</span>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <span className="text-muted-foreground text-xs">Size</span>
                  <p className="font-medium text-sm">{file.size}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Pages</span>
                  <p className="font-medium text-sm">{file.pages}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Author</span>
                  <p className="font-medium text-sm">{file.author}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Created</span>
                  <p className="font-medium text-sm">{file.created}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Dimensions</span>
                  <p className="font-medium text-sm">{file.dimensions}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Version</span>
                  <p className="flex items-center gap-1.5 font-medium text-sm">
                    {file.version}
                    <Badge variant="secondary" className="font-normal text-xs">
                      Standard
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
