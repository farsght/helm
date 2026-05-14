"use client"

import {
  DownloadIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon,
  GridIcon,
  ImageIcon,
  ListIcon,
  MoreVerticalIcon,
  PencilIcon,
  ShareIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FileItem {
  id: string
  name: string
  type: "folder" | "pdf" | "image" | "spreadsheet" | "document"
  size: string
  modified: string
}

const files: FileItem[] = [
  { id: "f1", name: "Brand Assets", type: "folder", size: "148 MB", modified: "Mar 22, 2026" },
  {
    id: "f2",
    name: "Product Screenshots",
    type: "folder",
    size: "67 MB",
    modified: "Mar 21, 2026",
  },
  {
    id: "f3",
    name: "Q4 Financial Report.pdf",
    type: "pdf",
    size: "2.4 MB",
    modified: "Mar 20, 2026",
  },
  {
    id: "f4",
    name: "Dashboard Mockup.png",
    type: "image",
    size: "4.1 MB",
    modified: "Mar 19, 2026",
  },
  {
    id: "f5",
    name: "Revenue Forecast.xlsx",
    type: "spreadsheet",
    size: "890 KB",
    modified: "Mar 18, 2026",
  },
  { id: "f6", name: "Homepage Hero.png", type: "image", size: "3.6 MB", modified: "Mar 17, 2026" },
  {
    id: "f7",
    name: "API Documentation.pdf",
    type: "pdf",
    size: "1.8 MB",
    modified: "Mar 16, 2026",
  },
  {
    id: "f8",
    name: "Team Roster.xlsx",
    type: "spreadsheet",
    size: "340 KB",
    modified: "Mar 15, 2026",
  },
  {
    id: "f9",
    name: "Onboarding Guide.docx",
    type: "document",
    size: "520 KB",
    modified: "Mar 14, 2026",
  },
  {
    id: "f10",
    name: "Release Notes v3.2.pdf",
    type: "pdf",
    size: "180 KB",
    modified: "Mar 13, 2026",
  },
  {
    id: "f11",
    name: "Icon Set Export.png",
    type: "image",
    size: "1.2 MB",
    modified: "Mar 12, 2026",
  },
  {
    id: "f12",
    name: "Expense Report.xlsx",
    type: "spreadsheet",
    size: "445 KB",
    modified: "Mar 11, 2026",
  },
]

const typeIcons: Record<FileItem["type"], React.ReactNode> = {
  folder: <FolderIcon className="size-8 text-muted-foreground" />,
  pdf: <FileTextIcon className="size-8 text-muted-foreground" />,
  image: <ImageIcon className="size-8 text-muted-foreground" />,
  spreadsheet: <FileSpreadsheetIcon className="size-8 text-muted-foreground" />,
  document: <FileIcon className="size-8 text-muted-foreground" />,
}

const smallTypeIcons: Record<FileItem["type"], React.ReactNode> = {
  folder: <FolderIcon className="size-4 text-muted-foreground" />,
  pdf: <FileTextIcon className="size-4 text-muted-foreground" />,
  image: <ImageIcon className="size-4 text-muted-foreground" />,
  spreadsheet: <FileSpreadsheetIcon className="size-4 text-muted-foreground" />,
  document: <FileIcon className="size-4 text-muted-foreground" />,
}

function FileContextMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem className="gap-2 text-xs">
          <PencilIcon className="size-3.5" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-xs">
          <DownloadIcon className="size-3.5" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-xs">
          <ShareIcon className="size-3.5" />
          Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="gap-2 text-xs">
          <Trash2Icon className="size-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function FileUploadGridView() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [view, setView] = useState<"grid" | "list">("grid")

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <span className="font-medium text-sm">Files</span>
            <span className="ml-2 text-muted-foreground text-xs">{files.length} items</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="size-7 p-0"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <GridIcon className="size-3.5" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              className="size-7 p-0"
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <ListIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Selection bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
            <span className="font-medium text-xs">{selected.size} selected</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-xs"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Grid view */}
        {view === "grid" && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {files.map(file => (
                <div
                  key={file.id}
                  className={`group relative rounded-md border p-3 transition-colors hover:bg-muted/50 ${selected.has(file.id) ? "border-primary bg-muted/30" : ""}`}
                >
                  {/* Checkbox */}
                  <div
                    className={`absolute top-2 left-2 z-10 ${selected.has(file.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
                  >
                    <Checkbox
                      checked={selected.has(file.id)}
                      onCheckedChange={() => toggleSelect(file.id)}
                      aria-label={`Select ${file.name}`}
                    />
                  </div>

                  {/* Context menu trigger */}
                  <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                    <FileContextMenu>
                      <Button variant="ghost" size="sm" className="size-6 p-0">
                        <MoreVerticalIcon className="size-3.5" />
                      </Button>
                    </FileContextMenu>
                  </div>

                  {/* Icon */}
                  <div className="flex aspect-square items-center justify-center rounded bg-muted/50">
                    {typeIcons[file.type]}
                  </div>

                  {/* Name and meta */}
                  <div className="mt-2">
                    <p className="truncate font-medium text-xs">{file.name}</p>
                    <p className="mt-0.5 text-muted-foreground text-xs">{file.size}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List view */}
        {view === "list" && (
          <div className="divide-y">
            {files.map(file => (
              <div
                key={file.id}
                className={`group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 ${selected.has(file.id) ? "bg-muted/30" : ""}`}
              >
                <Checkbox
                  checked={selected.has(file.id)}
                  onCheckedChange={() => toggleSelect(file.id)}
                  aria-label={`Select ${file.name}`}
                />
                {smallTypeIcons[file.type]}
                <div className="min-w-0 flex-1">
                  <span className="truncate font-medium text-sm">{file.name}</span>
                </div>
                <span className="hidden text-muted-foreground text-xs sm:block">
                  {file.modified}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">{file.size}</span>
                <div className="opacity-0 transition-opacity group-hover:opacity-100">
                  <FileContextMenu>
                    <Button variant="ghost" size="sm" className="size-6 p-0">
                      <MoreVerticalIcon className="size-3.5" />
                    </Button>
                  </FileContextMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-3">
          <p className="text-muted-foreground text-xs">
            {files.filter(f => f.type === "folder").length} folders,{" "}
            {files.filter(f => f.type !== "folder").length} files
          </p>
        </div>
      </div>
    </section>
  )
}
