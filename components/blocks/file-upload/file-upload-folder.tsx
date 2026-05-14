"use client"

import {
  ChevronRightIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  FolderOpenIcon,
  ImageIcon,
  UploadCloudIcon,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface TreeFile {
  name: string
  size: string
  type: "image" | "document" | "code" | "other"
}

interface TreeFolder {
  name: string
  expanded: boolean
  files: TreeFile[]
  folders: TreeFolder[]
}

const initialTree: TreeFolder[] = [
  {
    name: "src",
    expanded: true,
    files: [
      { name: "index.tsx", size: "2.4 KB", type: "code" },
      { name: "App.tsx", size: "4.1 KB", type: "code" },
    ],
    folders: [
      {
        name: "components",
        expanded: true,
        files: [
          { name: "Header.tsx", size: "1.8 KB", type: "code" },
          { name: "Footer.tsx", size: "1.2 KB", type: "code" },
          { name: "Sidebar.tsx", size: "3.6 KB", type: "code" },
        ],
        folders: [
          {
            name: "ui",
            expanded: false,
            files: [
              { name: "Button.tsx", size: "0.9 KB", type: "code" },
              { name: "Input.tsx", size: "0.7 KB", type: "code" },
              { name: "Dialog.tsx", size: "2.1 KB", type: "code" },
            ],
            folders: [],
          },
        ],
      },
      {
        name: "assets",
        expanded: false,
        files: [
          { name: "logo.svg", size: "3.2 KB", type: "image" },
          { name: "hero-bg.png", size: "248 KB", type: "image" },
          { name: "favicon.ico", size: "4.1 KB", type: "image" },
        ],
        folders: [],
      },
    ],
  },
  {
    name: "docs",
    expanded: false,
    files: [
      { name: "README.md", size: "6.8 KB", type: "document" },
      { name: "CHANGELOG.md", size: "12.4 KB", type: "document" },
      { name: "LICENSE", size: "1.1 KB", type: "document" },
    ],
    folders: [],
  },
  {
    name: "public",
    expanded: false,
    files: [
      { name: "robots.txt", size: "0.2 KB", type: "other" },
      { name: "sitemap.xml", size: "1.4 KB", type: "other" },
    ],
    folders: [],
  },
]

function countFiles(folders: TreeFolder[]): number {
  let count = 0
  for (const folder of folders) {
    count += folder.files.length
    count += countFiles(folder.folders)
  }
  return count
}

function countFolders(folders: TreeFolder[]): number {
  let count = folders.length
  for (const folder of folders) {
    count += countFolders(folder.folders)
  }
  return count
}

function getFileIcon(type: TreeFile["type"]) {
  switch (type) {
    case "image":
      return <ImageIcon className="size-3.5 text-muted-foreground/60" />
    case "document":
      return <FileTextIcon className="size-3.5 text-muted-foreground/60" />
    default:
      return <FileIcon className="size-3.5 text-muted-foreground/60" />
  }
}

function FolderTree({
  folders,
  depth,
  onToggle,
}: {
  folders: TreeFolder[]
  depth: number
  onToggle: (path: number[]) => void
}) {
  return (
    <>
      {folders.map((folder, index) => {
        const folderFileCount = folder.files.length + countFiles(folder.folders)
        return (
          <div key={folder.name}>
            {/* Folder row */}
            <button
              type="button"
              onClick={() => onToggle([index])}
              className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:bg-muted/50"
              style={{ paddingLeft: `${depth * 16 + 16}px`, paddingRight: "16px" }}
            >
              <ChevronRightIcon
                className={`size-3 shrink-0 text-muted-foreground/60 transition-transform duration-200 ${
                  folder.expanded ? "rotate-90" : ""
                }`}
              />
              {folder.expanded ? (
                <FolderOpenIcon className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate font-medium text-sm">{folder.name}</span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {folderFileCount} file{folderFileCount !== 1 ? "s" : ""}
              </span>
            </button>

            {/* Expanded contents */}
            {folder.expanded && (
              <>
                {/* Sub-folders */}
                <FolderTree
                  folders={folder.folders}
                  depth={depth + 1}
                  onToggle={path => onToggle([index, ...path])}
                />

                {/* Files */}
                {folder.files.map(file => (
                  <div
                    key={file.name}
                    className="flex items-center gap-2 py-1.5"
                    style={{ paddingLeft: `${(depth + 1) * 16 + 16 + 12}px`, paddingRight: "16px" }}
                  >
                    {getFileIcon(file.type)}
                    <span className="flex-1 truncate text-muted-foreground text-sm">
                      {file.name}
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground text-xs">
                      {file.size}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )
      })}
    </>
  )
}

export default function FileUploadFolder() {
  const [tree, setTree] = useState<TreeFolder[]>(initialTree)
  const [isDragOver, setIsDragOver] = useState(false)

  const totalFiles = countFiles(tree)
  const totalFolders = countFolders(tree)

  const toggleFolder = (path: number[]) => {
    setTree(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as TreeFolder[]
      let current: TreeFolder[] = next
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]].folders
      }
      const target = current[path[path.length - 1]]
      target.expanded = !target.expanded
      return next
    })
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-medium text-sm">Upload folder</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Select a folder to upload its entire structure
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <span>
              {totalFolders} folder{totalFolders !== 1 ? "s" : ""}
            </span>
            <span>·</span>
            <span>
              {totalFiles} file{totalFiles !== 1 ? "s" : ""}
            </span>
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
            className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 transition-colors ${
              isDragOver ? "border-foreground/30 bg-muted/50" : "border-muted-foreground/25"
            }`}
          >
            <UploadCloudIcon className="size-5 text-muted-foreground/60" />
            <div className="text-center">
              <p className="font-medium text-sm">Drop a folder here</p>
              <p className="mt-0.5 text-muted-foreground text-xs">or click to select a directory</p>
            </div>
            <Button variant="outline" size="sm" className="mt-1 h-7 text-xs">
              Choose folder
            </Button>
          </div>
        </div>

        {/* Folder tree */}
        {tree.length > 0 && (
          <div className="border-b py-1">
            <FolderTree folders={tree} depth={0} onToggle={toggleFolder} />
          </div>
        )}

        {/* Footer */}
        {tree.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-muted-foreground text-xs">
              Total: {totalFiles} files across {totalFolders} folders
            </p>
            <Button size="sm" className="h-7 text-xs">
              Upload folder
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
