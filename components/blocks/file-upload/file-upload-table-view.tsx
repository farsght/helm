"use client"

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  MoveIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface FileEntry {
  id: string
  name: string
  type: "folder" | "pdf" | "image" | "spreadsheet" | "document" | "other"
  size: string
  sizeBytes: number
  modified: string
  owner: string
}

const files: FileEntry[] = [
  {
    id: "f1",
    name: "Q4 Financial Report.pdf",
    type: "pdf",
    size: "2.4 MB",
    sizeBytes: 2516582,
    modified: "Mar 22, 2026",
    owner: "Alice Chen",
  },
  {
    id: "f2",
    name: "Brand Assets",
    type: "folder",
    size: "148 MB",
    sizeBytes: 155189248,
    modified: "Mar 21, 2026",
    owner: "Design Team",
  },
  {
    id: "f3",
    name: "Product Screenshot.png",
    type: "image",
    size: "4.1 MB",
    sizeBytes: 4298137,
    modified: "Mar 20, 2026",
    owner: "Bob Martinez",
  },
  {
    id: "f4",
    name: "Revenue Forecast.xlsx",
    type: "spreadsheet",
    size: "890 KB",
    sizeBytes: 911360,
    modified: "Mar 19, 2026",
    owner: "Carol Wu",
  },
  {
    id: "f5",
    name: "API Documentation.pdf",
    type: "pdf",
    size: "1.8 MB",
    sizeBytes: 1887436,
    modified: "Mar 18, 2026",
    owner: "David Kim",
  },
  {
    id: "f6",
    name: "Team Headshots",
    type: "folder",
    size: "67 MB",
    sizeBytes: 70254592,
    modified: "Mar 17, 2026",
    owner: "HR Team",
  },
  {
    id: "f7",
    name: "Meeting Notes.docx",
    type: "document",
    size: "245 KB",
    sizeBytes: 250880,
    modified: "Mar 16, 2026",
    owner: "Eve Johnson",
  },
  {
    id: "f8",
    name: "Dashboard Mockup.png",
    type: "image",
    size: "3.6 MB",
    sizeBytes: 3774873,
    modified: "Mar 15, 2026",
    owner: "Frank Liu",
  },
  {
    id: "f9",
    name: "User Research Data.xlsx",
    type: "spreadsheet",
    size: "1.2 MB",
    sizeBytes: 1258291,
    modified: "Mar 14, 2026",
    owner: "Grace Park",
  },
  {
    id: "f10",
    name: "Release Notes.pdf",
    type: "pdf",
    size: "520 KB",
    sizeBytes: 532480,
    modified: "Mar 13, 2026",
    owner: "Henry Adams",
  },
  {
    id: "f11",
    name: "Onboarding Guide.docx",
    type: "document",
    size: "380 KB",
    sizeBytes: 389120,
    modified: "Mar 12, 2026",
    owner: "Alice Chen",
  },
  {
    id: "f12",
    name: "Exported Logs",
    type: "folder",
    size: "24 MB",
    sizeBytes: 25165824,
    modified: "Mar 11, 2026",
    owner: "DevOps Team",
  },
]

type SortKey = "name" | "type" | "sizeBytes" | "modified" | "owner"
type SortDir = "asc" | "desc"

const typeIcons: Record<FileEntry["type"], React.ReactNode> = {
  folder: <FolderIcon className="size-4 text-muted-foreground" />,
  pdf: <FileTextIcon className="size-4 text-muted-foreground" />,
  image: <ImageIcon className="size-4 text-muted-foreground" />,
  spreadsheet: <FileSpreadsheetIcon className="size-4 text-muted-foreground" />,
  document: <FileIcon className="size-4 text-muted-foreground" />,
  other: <FileIcon className="size-4 text-muted-foreground" />,
}

const typeLabels: Record<FileEntry["type"], string> = {
  folder: "Folder",
  pdf: "PDF",
  image: "Image",
  spreadsheet: "Spreadsheet",
  document: "Document",
  other: "File",
}

const PAGE_SIZE = 8

export default function FileUploadTableView() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [page, setPage] = useState(0)

  const sorted = [...files].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    if (sortKey === "sizeBytes") return (a.sizeBytes - b.sizeBytes) * dir
    const aVal = String(a[sortKey]).toLowerCase()
    const bVal = String(b[sortKey]).toLowerCase()
    return aVal.localeCompare(bVal) * dir
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(0)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(paged.map(f => f.id)))
    }
  }

  const clearSelection = () => setSelected(new Set())

  const SortArrow = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null
    return sortDir === "asc" ? (
      <ArrowUpIcon className="ml-1 inline size-3" />
    ) : (
      <ArrowDownIcon className="ml-1 inline size-3" />
    )
  }

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "name", label: "Name" },
    { key: "type", label: "Type", className: "hidden sm:table-cell" },
    { key: "sizeBytes", label: "Size", className: "hidden sm:table-cell" },
    { key: "modified", label: "Modified", className: "hidden md:table-cell" },
    { key: "owner", label: "Owner", className: "hidden lg:table-cell" },
  ]

  return (
    <section className="mx-auto w-full max-w-4xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <span className="font-medium text-sm">Files</span>
            <p className="mt-0.5 text-muted-foreground text-xs">{files.length} items</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            Upload
          </Button>
        </div>

        {/* Bulk actions toolbar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
            <span className="font-medium text-xs">{selected.size} selected</span>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
                <DownloadIcon className="size-3" />
                Download
              </Button>
              <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
                <MoveIcon className="size-3" />
                Move
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash2Icon className="size-3" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4">
                <Checkbox
                  checked={paged.length > 0 && selected.size === paged.length}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              {columns.map(col => (
                <TableHead
                  key={col.key}
                  className={`h-9 cursor-pointer select-none px-4 text-xs ${col.className || ""}`}
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  <SortArrow col={col.key} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map(file => (
              <TableRow
                key={file.id}
                className="transition-colors hover:bg-muted/50"
                data-state={selected.has(file.id) ? "selected" : undefined}
              >
                <TableCell className="w-10 px-4">
                  <Checkbox
                    checked={selected.has(file.id)}
                    onCheckedChange={() => toggleSelect(file.id)}
                    aria-label={`Select ${file.name}`}
                  />
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex items-center gap-2">
                    {typeIcons[file.type]}
                    <span className="truncate font-medium text-sm">{file.name}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden px-4 text-muted-foreground text-xs sm:table-cell">
                  {typeLabels[file.type]}
                </TableCell>
                <TableCell className="hidden px-4 text-muted-foreground text-xs tabular-nums sm:table-cell">
                  {file.size}
                </TableCell>
                <TableCell className="hidden px-4 text-muted-foreground text-xs md:table-cell">
                  {file.modified}
                </TableCell>
                <TableCell className="hidden px-4 text-muted-foreground text-xs lg:table-cell">
                  {file.owner}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-muted-foreground text-xs tabular-nums">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, files.length)} of{" "}
            {files.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
