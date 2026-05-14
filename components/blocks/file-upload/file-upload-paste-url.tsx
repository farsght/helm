"use client"

import {
  CheckCircle2Icon,
  FileIcon,
  GlobeIcon,
  LinkIcon,
  LoaderIcon,
  UploadCloudIcon,
} from "lucide-react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FetchStatus = "idle" | "fetching" | "fetched" | "error"

interface FetchedFile {
  name: string
  size: string
  type: string
  url: string
}

export default function FileUploadPasteUrl() {
  const [url, setUrl] = useState("")
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle")
  const [fetchedFile, setFetchedFile] = useState<FetchedFile | null>(null)
  const [selectedFile, setSelectedFile] = useState<{
    name: string
    size: string
    type: string
  } | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isValidUrl = url.startsWith("http://") || url.startsWith("https://")

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFetch = () => {
    setFetchStatus("fetching")
    setFetchedFile(null)

    // Simulate fetch
    setTimeout(() => {
      const filename = url.split("/").pop() || "remote-file"
      setFetchedFile({
        name: filename.includes(".") ? filename : `${filename}.pdf`,
        size: "3.8 MB",
        type: "application/pdf",
        url,
      })
      setFetchStatus("fetched")
    }, 1200)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile({
        name: file.name,
        size: formatSize(file.size),
        type: file.type || "application/octet-stream",
      })
    }
  }

  const handleConfirm = () => {
    setConfirmed(true)
  }

  const reset = () => {
    setUrl("")
    setFetchStatus("idle")
    setFetchedFile(null)
    setSelectedFile(null)
    setConfirmed(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  if (confirmed) {
    const file = fetchedFile || selectedFile
    return (
      <section className="mx-auto w-full max-w-2xl p-4">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-medium text-sm">Upload file</span>
            <span className="flex items-center gap-1 text-emerald-600 text-xs dark:text-emerald-400">
              <CheckCircle2Icon className="size-3.5" />
              Uploaded
            </span>
          </div>
          <div className="flex flex-col items-center px-4 py-10">
            <CheckCircle2Icon className="mb-3 size-8 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-sm">{file?.name}</span>
            <span className="mt-1 text-muted-foreground text-xs">
              {file?.size} &middot; {file?.type}
            </span>
            <Button variant="outline" size="sm" className="mt-4 h-7 text-xs" onClick={reset}>
              Upload another
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="border-b px-4 py-3">
          <span className="font-medium text-sm">Upload file</span>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3">
          <Tabs defaultValue="upload">
            <TabsList className="mb-3 w-full">
              <TabsTrigger value="upload" className="flex-1 gap-1.5 text-xs">
                <UploadCloudIcon className="size-3.5" />
                Upload file
              </TabsTrigger>
              <TabsTrigger value="url" className="flex-1 gap-1.5 text-xs">
                <LinkIcon className="size-3.5" />
                From URL
              </TabsTrigger>
            </TabsList>

            {/* Upload tab */}
            <TabsContent value="upload">
              <div className="pb-4">
                {selectedFile ? (
                  <div className="rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted/50">
                        <FileIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-sm">
                          {selectedFile.name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {selectedFile.size} &middot; {selectedFile.type}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ""
                        }}
                      >
                        Remove
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={handleConfirm}>
                        Upload
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center rounded-md border-2 border-dashed border-muted-foreground/25 px-6 py-8">
                    <UploadCloudIcon className="mb-2 size-8 text-muted-foreground" />
                    <span className="font-medium text-sm">Drag and drop or browse</span>
                    <span className="mt-1 text-muted-foreground text-xs">
                      PNG, JPG, PDF, ZIP up to 50 MB
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 h-7 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* URL tab */}
            <TabsContent value="url">
              <div className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <GlobeIcon className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={url}
                      onChange={e => {
                        setUrl(e.target.value)
                        setFetchStatus("idle")
                        setFetchedFile(null)
                      }}
                      placeholder="https://example.com/file.pdf"
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 text-xs"
                    disabled={!isValidUrl || fetchStatus === "fetching"}
                    onClick={handleFetch}
                  >
                    {fetchStatus === "fetching" ? (
                      <>
                        <LoaderIcon className="mr-1 size-3 animate-spin" />
                        Fetching
                      </>
                    ) : (
                      "Fetch"
                    )}
                  </Button>
                </div>

                {fetchStatus === "fetched" && fetchedFile && (
                  <div className="mt-3 rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted/50">
                        <FileIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-sm">
                          {fetchedFile.name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {fetchedFile.size} &middot; {fetchedFile.type}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 truncate font-mono text-muted-foreground text-xs">
                      {fetchedFile.url}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setFetchStatus("idle")
                          setFetchedFile(null)
                          setUrl("")
                        }}
                      >
                        Clear
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={handleConfirm}>
                        Upload
                      </Button>
                    </div>
                  </div>
                )}

                {fetchStatus === "error" && (
                  <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground text-xs">
                      Could not fetch file from this URL. Check the link and try again.
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5">
          <span className="text-muted-foreground text-xs">
            Files are stored securely and encrypted at rest.
          </span>
        </div>
      </div>
    </section>
  )
}
