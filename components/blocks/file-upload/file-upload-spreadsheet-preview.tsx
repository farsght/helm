"use client"

import {
  CalendarIcon,
  FileSpreadsheetIcon,
  HashIcon,
  MailIcon,
  TypeIcon,
  UploadIcon,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type DataType = "number" | "text" | "date" | "email"

interface Column {
  name: string
  type: DataType
}

interface Sheet {
  id: string
  name: string
  rows: number
  columns: Column[]
  data: string[][]
}

const typeIcon: Record<DataType, React.ElementType> = {
  number: HashIcon,
  text: TypeIcon,
  date: CalendarIcon,
  email: MailIcon,
}

const typeLabel: Record<DataType, string> = {
  number: "Number",
  text: "Text",
  date: "Date",
  email: "Email",
}

const sheets: Sheet[] = [
  {
    id: "1",
    name: "Customers",
    rows: 2847,
    columns: [
      { name: "ID", type: "number" },
      { name: "Name", type: "text" },
      { name: "Email", type: "email" },
      { name: "Signup", type: "date" },
      { name: "Orders", type: "number" },
    ],
    data: [
      ["1001", "Ava Chen", "ava.chen@acme.co", "2024-01-15", "23"],
      ["1002", "Marcus Johnson", "m.johnson@globex.com", "2024-02-03", "17"],
      ["1003", "Priya Sharma", "priya@initech.io", "2024-02-19", "41"],
      ["1004", "James O'Brien", "jobrien@hooli.net", "2024-03-08", "8"],
      ["1005", "Yuki Tanaka", "y.tanaka@soylent.jp", "2024-03-22", "34"],
    ],
  },
  {
    id: "2",
    name: "Orders",
    rows: 12403,
    columns: [
      { name: "Order ID", type: "number" },
      { name: "Customer", type: "text" },
      { name: "Total", type: "number" },
      { name: "Date", type: "date" },
      { name: "Status", type: "text" },
    ],
    data: [
      ["50921", "Ava Chen", "284.50", "2025-01-10", "Delivered"],
      ["50922", "Marcus Johnson", "129.00", "2025-01-10", "Shipped"],
      ["50923", "Priya Sharma", "567.25", "2025-01-11", "Processing"],
      ["50924", "James O'Brien", "89.99", "2025-01-11", "Delivered"],
      ["50925", "Yuki Tanaka", "342.00", "2025-01-12", "Shipped"],
    ],
  },
  {
    id: "3",
    name: "Products",
    rows: 486,
    columns: [
      { name: "SKU", type: "text" },
      { name: "Product", type: "text" },
      { name: "Price", type: "number" },
      { name: "Stock", type: "number" },
      { name: "Category", type: "text" },
    ],
    data: [
      ["WDG-001", "Wireless Charger Pro", "49.99", "1240", "Electronics"],
      ["WDG-002", "USB-C Hub 7-in-1", "79.99", "856", "Electronics"],
      ["FRN-010", "Ergonomic Chair Base", "349.00", "124", "Furniture"],
      ["FRN-011", "Monitor Riser Walnut", "89.00", "432", "Furniture"],
      ["ACC-005", "Desk Mat Leather XL", "59.99", "2100", "Accessories"],
    ],
  },
]

export default function FileUploadSpreadsheetPreview() {
  const [activeSheet, setActiveSheet] = useState("1")

  const sheet = sheets.find(s => s.id === activeSheet)!

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm">quarterly-report.xlsx</span>
          <Badge variant="secondary" className="font-normal text-xs">
            1.8 MB
          </Badge>
          <div className="ml-auto">
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <UploadIcon className="size-3" />
              Replace
            </Button>
          </div>
        </div>

        {/* Sheet tabs */}
        <div className="flex border-b">
          {sheets.map(s => {
            const isActive = activeSheet === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSheet(s.id)}
                className={`px-4 py-2.5 text-xs transition-colors ${
                  isActive
                    ? "border-b-2 border-foreground font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.name}
              </button>
            )
          })}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 border-b px-4 py-2.5">
          <span className="text-muted-foreground text-xs">{sheet.rows.toLocaleString()} rows</span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-muted-foreground text-xs">{sheet.columns.length} columns</span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-muted-foreground text-xs">Preview: first 5 rows</span>
        </div>

        {/* Column types */}
        <div className="flex flex-wrap gap-2 border-b px-4 py-2.5">
          {sheet.columns.map(col => {
            const Icon = typeIcon[col.type]
            return (
              <span
                key={col.name}
                className="flex items-center gap-1 text-muted-foreground text-xs"
              >
                <Icon className="size-3" />
                <span className="font-medium text-foreground">{col.name}</span>
                <span>({typeLabel[col.type]})</span>
              </span>
            )
          })}
        </div>

        {/* Data preview table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                {sheet.columns.map(col => (
                  <th
                    key={col.name}
                    className="px-4 py-2 text-left font-medium text-muted-foreground"
                  >
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.data.map((row, rowIndex) => (
                <tr key={row[0]} className={rowIndex < sheet.data.length - 1 ? "border-b" : ""}>
                  <td className="px-4 py-2 font-mono text-muted-foreground tabular-nums">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, colIndex) => (
                    <td
                      key={sheet.columns[colIndex].name}
                      className={`px-4 py-2 ${
                        sheet.columns[colIndex].type === "number" ? "font-mono tabular-nums" : ""
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-muted-foreground text-xs">
            {(sheet.rows - 5).toLocaleString()} more rows not shown
          </span>
          <Button size="sm" className="h-7 text-xs">
            Import Data
          </Button>
        </div>
      </div>
    </section>
  )
}
