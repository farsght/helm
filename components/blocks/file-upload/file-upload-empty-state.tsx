"use client"

import { CloudIcon, FileIcon, FolderPlusIcon, LightbulbIcon, UploadCloudIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Tip {
  id: string
  text: string
}

const tips: Tip[] = [
  { id: "1", text: "Drag and drop files anywhere in the app to upload instantly" },
  { id: "2", text: "Organize files into folders to keep your workspace tidy" },
  { id: "3", text: "Share files with your team by generating a shareable link" },
]

export default function FileUploadEmptyState() {
  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-medium text-sm">Files</span>
          <span className="text-muted-foreground text-xs">0 items</span>
        </div>

        {/* Empty state illustration and CTA */}
        <div className="flex flex-col items-center px-4 py-10">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
            <FileIcon className="size-7 text-muted-foreground/60" />
          </div>
          <span className="font-medium text-sm">No files yet</span>
          <p className="mt-1 max-w-xs text-center text-muted-foreground text-xs">
            Upload your first file to get started. You can drag and drop files or use the button
            below.
          </p>
          <Button variant="outline" size="sm" className="mt-4 h-8 gap-1.5 text-xs">
            <UploadCloudIcon className="size-3.5" />
            Upload your first file
          </Button>
        </div>

        {/* Quick actions */}
        <div className="border-t px-4 py-3">
          <span className="mb-2.5 block font-medium text-muted-foreground text-xs">
            Quick actions
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className="flex flex-col items-center gap-1.5 rounded-md border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-muted/50"
            >
              <UploadCloudIcon className="size-4 text-muted-foreground" />
              <span className="text-xs">Upload</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-1.5 rounded-md border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-muted/50"
            >
              <CloudIcon className="size-4 text-muted-foreground" />
              <span className="text-xs">Import from Cloud</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center gap-1.5 rounded-md border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-muted/50"
            >
              <FolderPlusIcon className="size-4 text-muted-foreground" />
              <span className="text-xs">Create Folder</span>
            </button>
          </div>
        </div>

        {/* Getting started tips */}
        <div className="border-t px-4 py-3">
          <span className="mb-2 flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
            <LightbulbIcon className="size-3" />
            Getting started
          </span>
          <div className="space-y-1.5">
            {tips.map(tip => (
              <div key={tip.id} className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                <span className="text-muted-foreground text-xs leading-relaxed">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
