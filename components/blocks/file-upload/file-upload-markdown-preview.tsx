"use client"

import {
  CheckIcon,
  CloudUploadIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const sampleMarkdown = `# Project Overview

A comprehensive guide to building modern web applications with **React** and **Next.js**.

## Getting Started

Install the dependencies and run the development server:

\`\`\`bash
npm install
npm run dev
\`\`\`

## Architecture

The application uses the **App Router** with React Server Components for optimal performance.

### Key Features

- Server-side rendering with streaming
- Automatic code splitting
- Built-in image optimization
- TypeScript support out of the box

### Directory Structure

| Directory | Purpose |
|-----------|---------|
| \`app/\` | Routes and layouts |
| \`components/\` | Reusable UI components |
| \`lib/\` | Utility functions |

## Deployment

Deploy to Vercel with a single command:

\`\`\`bash
npx vercel
\`\`\`

> Note: Ensure all environment variables are configured before deploying to production.`

interface MarkdownStats {
  words: number
  headings: number
  lines: number
  characters: number
}

function getStats(text: string): MarkdownStats {
  const words = text.split(/\s+/).filter(w => w.length > 0).length
  const headings = text.split("\n").filter(line => /^#{1,6}\s/.test(line)).length
  const lines = text.split("\n").length
  const characters = text.length
  return { words, headings, lines, characters }
}

function renderPreview(markdown: string): string[] {
  return markdown.split("\n").map(line => {
    if (/^### /.test(line)) return `h3:${line.replace(/^### /, "")}`
    if (/^## /.test(line)) return `h2:${line.replace(/^## /, "")}`
    if (/^# /.test(line)) return `h1:${line.replace(/^# /, "")}`
    if (/^- /.test(line)) return `li:${line.replace(/^- /, "")}`
    if (/^> /.test(line)) return `bq:${line.replace(/^> /, "")}`
    if (/^```/.test(line)) return "code"
    if (/^\|/.test(line)) return `tbl:${line}`
    if (line.trim() === "") return "br"
    return `p:${line}`
  })
}

export default function FileUploadMarkdownPreview() {
  const [source, setSource] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [activeTab, setActiveTab] = useState<"source" | "preview">("preview")
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = () => {
    setSource(sampleMarkdown)
    setFileName("project-overview.md")
  }

  const stats = source ? getStats(source) : null
  const preview = useMemo(() => (source ? renderPreview(source) : []), [source])

  const copySource = () => {
    if (!source) return
    navigator.clipboard.writeText(source)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  const previewContent = useMemo(() => {
    return preview.reduce<{
      elements: Array<React.ReactNode>
      inCode: boolean
    }>(
      (acc, line, i) => {
        const key = `${i}-${line.slice(0, 20)}`

        if (line === "code") {
          return {
            elements: acc.elements,
            inCode: !acc.inCode,
          }
        }

        if (acc.inCode && line.startsWith("p:")) {
          return {
            elements: [
              ...acc.elements,
              (
                <p
                  key={key}
                  className="rounded bg-zinc-950 px-3 py-1 font-mono text-xs text-zinc-300"
                >
                  {line.slice(2)}
                </p>
              ),
            ],
            inCode: acc.inCode,
          }
        }

        if (line.startsWith("h1:")) {
          return {
            elements: [
              ...acc.elements,
              (
                <h3 key={key} className="font-semibold text-lg">
                  {line.slice(3)}
                </h3>
              ),
            ],
            inCode: acc.inCode,
          }
        }

        if (line.startsWith("h2:")) {
          return {
            elements: [
              ...acc.elements,
              (
                <h4 key={key} className="mt-2 font-semibold text-sm">
                  {line.slice(3)}
                </h4>
              ),
            ],
            inCode: acc.inCode,
          }
        }

        if (line.startsWith("h3:")) {
          return {
            elements: [
              ...acc.elements,
              (
                <h5 key={key} className="mt-1 font-medium text-sm">
                  {line.slice(3)}
                </h5>
              ),
            ],
            inCode: acc.inCode,
          }
        }

        if (line.startsWith("li:")) {
          return {
            elements: [
              ...acc.elements,
              (
                <p key={key} className="flex items-start gap-2 text-sm">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground" />
                  {line.slice(3)}
                </p>
              ),
            ],
            inCode: acc.inCode,
          }
        }

        if (line.startsWith("bq:")) {
          return {
            elements: [
              ...acc.elements,
              (
                <p
                  key={key}
                  className="border-l-2 border-muted-foreground/30 pl-3 text-sm text-muted-foreground italic"
                >
                  {line.slice(3)}
                </p>
              ),
            ],
            inCode: acc.inCode,
          }
        }

        if (line.startsWith("tbl:")) {
          return {
            elements: [
              ...acc.elements,
              (
                <p key={key} className="font-mono text-xs text-muted-foreground">
                  {line.slice(4)}
                </p>
              ),
            ],
            inCode: acc.inCode,
          }
        }

        if (line === "br") {
          return {
            elements: [...acc.elements, <div key={key} className="h-1" />],
            inCode: acc.inCode,
          }
        }

        return {
          elements: [
            ...acc.elements,
            (
              <p key={key} className="text-sm leading-relaxed">
                {line.slice(2)}
              </p>
            ),
          ],
          inCode: acc.inCode,
        }
      },
      { elements: [], inCode: false }
    ).elements
  }, [preview])

  return (
    <section className="mx-auto w-full max-w-4xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium text-sm">
              {source ? fileName : "Markdown Preview"}
            </span>
            {stats && (
              <>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-muted-foreground text-xs">{stats.words} words</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-muted-foreground text-xs">{stats.headings} headings</span>
              </>
            )}
          </div>
          {source && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={copySource}
              >
                {copied ? (
                  <>
                    <CheckIcon className="size-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-3" />
                    Copy
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                <DownloadIcon className="size-3" />
                Export HTML
              </Button>
            </div>
          )}
        </div>

        {!source ? (
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
              <span className="font-medium text-sm">Drop a Markdown file here</span>
              <p className="text-muted-foreground text-xs">Supports .md and .mdx files</p>
              <input
                ref={inputRef}
                type="file"
                accept=".md,.mdx,.markdown"
                className="hidden"
                onChange={() => handleUpload()}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex items-center gap-0 border-b">
              <button
                type="button"
                onClick={() => setActiveTab("source")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs transition-colors ${
                  activeTab === "source"
                    ? "border-b-2 border-foreground font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CodeIcon className="size-3" />
                Source
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs transition-colors ${
                  activeTab === "preview"
                    ? "border-b-2 border-foreground font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <EyeIcon className="size-3" />
                Preview
              </button>
            </div>

            {/* Content */}
            <div className="h-80 overflow-y-auto">
              {activeTab === "source" ? (
                <pre className="whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-foreground">
                  {source}
                </pre>
              ) : (
                <div className="p-4 space-y-2">
                  {previewContent}
                </div>
              )}
            </div>

            {/* Footer stats */}
            <div className="flex items-center gap-3 border-t px-4 py-2">
              <span className="text-muted-foreground text-xs">{stats?.lines} lines</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-muted-foreground text-xs">{stats?.characters} characters</span>
              <div className="ml-auto">
                <Badge variant="secondary" className="font-normal text-xs">
                  Markdown
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
