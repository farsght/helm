"use client"

import { FlameIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "~/lib/utils"

interface DayCell {
  id: string
  date: number
  intensity: 0 | 1 | 2 | 3 | 4
  inMonth: boolean
  count: number
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

// April 2026: Apr 1 is a Wednesday → 2 leading empty cells (Mon, Tue)
// 30 days in April, then trailing cells to fill the 6x7 grid
const monthData: DayCell[] = [
  { id: "pre-1", date: 30, intensity: 0, inMonth: false, count: 0 },
  { id: "pre-2", date: 31, intensity: 0, inMonth: false, count: 0 },
  { id: "d-1", date: 1, intensity: 1, inMonth: true, count: 3 },
  { id: "d-2", date: 2, intensity: 2, inMonth: true, count: 7 },
  { id: "d-3", date: 3, intensity: 3, inMonth: true, count: 12 },
  { id: "d-4", date: 4, intensity: 0, inMonth: true, count: 0 },
  { id: "d-5", date: 5, intensity: 0, inMonth: true, count: 0 },
  { id: "d-6", date: 6, intensity: 2, inMonth: true, count: 6 },
  { id: "d-7", date: 7, intensity: 4, inMonth: true, count: 18 },
  { id: "d-8", date: 8, intensity: 3, inMonth: true, count: 11 },
  { id: "d-9", date: 9, intensity: 2, inMonth: true, count: 8 },
  { id: "d-10", date: 10, intensity: 4, inMonth: true, count: 21 },
  { id: "d-11", date: 11, intensity: 1, inMonth: true, count: 4 },
  { id: "d-12", date: 12, intensity: 0, inMonth: true, count: 0 },
  { id: "d-13", date: 13, intensity: 2, inMonth: true, count: 7 },
  { id: "d-14", date: 14, intensity: 3, inMonth: true, count: 13 },
  { id: "d-15", date: 15, intensity: 4, inMonth: true, count: 19 },
  { id: "d-16", date: 16, intensity: 3, inMonth: true, count: 12 },
  { id: "d-17", date: 17, intensity: 2, inMonth: true, count: 6 },
  { id: "d-18", date: 18, intensity: 1, inMonth: true, count: 2 },
  { id: "d-19", date: 19, intensity: 0, inMonth: true, count: 0 },
  { id: "d-20", date: 20, intensity: 2, inMonth: true, count: 9 },
  { id: "d-21", date: 21, intensity: 3, inMonth: true, count: 14 },
  { id: "d-22", date: 22, intensity: 4, inMonth: true, count: 22 },
  { id: "d-23", date: 23, intensity: 3, inMonth: true, count: 11 },
  { id: "d-24", date: 24, intensity: 2, inMonth: true, count: 8 },
  { id: "d-25", date: 25, intensity: 1, inMonth: true, count: 3 },
  { id: "d-26", date: 26, intensity: 0, inMonth: true, count: 0 },
  { id: "d-27", date: 27, intensity: 3, inMonth: true, count: 10 },
  { id: "d-28", date: 28, intensity: 4, inMonth: true, count: 24 },
  { id: "d-29", date: 29, intensity: 3, inMonth: true, count: 13 },
  { id: "d-30", date: 30, intensity: 2, inMonth: true, count: 9 },
  { id: "post-1", date: 1, intensity: 0, inMonth: false, count: 0 },
  { id: "post-2", date: 2, intensity: 0, inMonth: false, count: 0 },
  { id: "post-3", date: 3, intensity: 0, inMonth: false, count: 0 },
]

const intensityClasses = [
  "bg-muted",
  "bg-emerald-200 dark:bg-emerald-950",
  "bg-emerald-300 dark:bg-emerald-800",
  "bg-emerald-400 dark:bg-emerald-600",
  "bg-emerald-500 dark:bg-emerald-400",
] as const

const legendLevels: Array<0 | 1 | 2 | 3 | 4> = [0, 1, 2, 3, 4]

export default function StatsCalendarHeatmapMonth() {
  // Archetype: H — Heatmap / Streak Grid (month calendar variant)
  const reduceMotion = useReducedMotion()

  const totalEvents = monthData.reduce((sum, cell) => sum + cell.count, 0)
  const activeDays = monthData.filter(cell => cell.inMonth && cell.count > 0).length

  return (
    <motion.section
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-2xl p-4"
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium">Publishing cadence</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              April 2026 · 272 articles across 24 active days
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <FlameIcon
              aria-hidden="true"
              className="size-3.5 text-emerald-600 dark:text-emerald-400"
            />
            <span className="text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
              {activeDays} / 30 days
            </span>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="grid grid-cols-7 gap-1">
            {DAY_LABELS.map(label => (
              <div
                className="pb-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                key={label}
              >
                {label}
              </div>
            ))}
            {monthData.map(cell => {
              const level = Math.min(4, Math.max(0, cell.intensity)) as 0 | 1 | 2 | 3 | 4
              return (
                <div
                  aria-label={
                    cell.inMonth
                      ? `April ${cell.date}: ${cell.count} articles`
                      : "Outside current month"
                  }
                  className={cn(
                    "relative flex aspect-square items-end justify-end rounded-md p-1",
                    cell.inMonth ? intensityClasses[level] : "bg-muted/40 opacity-40",
                  )}
                  key={cell.id}
                  role="img"
                >
                  <span
                    className={cn(
                      "text-[10px] font-medium tabular-nums",
                      level >= 3 ? "text-emerald-950 dark:text-emerald-50" : "text-foreground/70",
                    )}
                  >
                    {cell.date}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-xs text-muted-foreground tabular-nums">
            Total this month: {totalEvents}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Less</span>
            {legendLevels.map(level => (
              <span
                aria-hidden="true"
                className={cn("size-2.5 rounded-sm", intensityClasses[level])}
                key={level}
              />
            ))}
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
