"use client"

// Archetype: Custom — Benchmark Comparison Card
import { motion, useReducedMotion } from "motion/react"
import { cn } from "~/lib/utils"

interface BenchmarkMetric {
  id: string
  label: string
  yours: number
  avg: number
  top10: number
  max: number
  unit: string
  betterHigher: boolean
}

const benchmarks: BenchmarkMetric[] = [
  { id: "conversion", label: "Conversion rate", yours: 3.8, avg: 2.1, top10: 4.2, max: 6, unit: "%", betterHigher: true },
  { id: "churn", label: "Churn rate", yours: 1.2, avg: 2.8, top10: 1.0, max: 5, unit: "%", betterHigher: false },
  { id: "nps", label: "NPS score", yours: 52, avg: 32, top10: 60, max: 100, unit: "", betterHigher: true },
  { id: "ltv", label: "LTV/CAC ratio", yours: 4.8, avg: 3.0, top10: 5.5, max: 8, unit: "x", betterHigher: true },
  { id: "arr", label: "ARR growth", yours: 85, avg: 45, top10: 100, max: 150, unit: "%", betterHigher: true },
]

function pct(value: number, max: number): number {
  return (value / max) * 100
}

export default function StatsBenchmarkBarCard() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-2xl p-4"
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">Industry benchmarks</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Compared to 2,400 SaaS companies</p>
        </div>
        <div className="divide-y">
          {benchmarks.map((b) => {
            const exceedsTop = b.betterHigher ? b.yours >= b.top10 : b.yours <= b.top10
            const yourColor = exceedsTop ? "var(--chart-1)" : "var(--muted-foreground)"

            return (
              <div key={b.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{b.label}</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      exceedsTop ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                    )}>
                      {b.yours}{b.unit}
                    </span>
                    {exceedsTop && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Top 10%</span>
                    )}
                  </div>
                </div>
                <div className="relative mt-2 h-3">
                  <div className="absolute inset-y-1 left-0 right-0 h-px bg-border" />
                  <div
                    className="absolute top-0 flex size-3 -translate-x-1/2 flex-col items-center"
                    style={{ left: `${pct(b.avg, b.max)}%` }}
                    aria-label={`Industry avg: ${b.avg}${b.unit}`}
                  >
                    <span className="size-2 rounded-full bg-muted-foreground/50" />
                  </div>
                  <div
                    className="absolute top-0 flex size-3 -translate-x-1/2 flex-col items-center"
                    style={{ left: `${pct(b.top10, b.max)}%` }}
                    aria-label={`Top 10%: ${b.top10}${b.unit}`}
                  >
                    <span className="size-2 rounded-full bg-muted-foreground/70 ring-2 ring-background" />
                  </div>
                  <div
                    className="absolute top-0 flex size-3 -translate-x-1/2 flex-col items-center"
                    style={{ left: `${pct(b.yours, b.max)}%` }}
                    aria-label={`You: ${b.yours}${b.unit}`}
                  >
                    <span
                      className="size-3 rounded-full ring-2 ring-background"
                      style={{ backgroundColor: yourColor }}
                    />
                  </div>
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>Avg: {b.avg}{b.unit}</span>
                  <span>Top 10%: {b.top10}{b.unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}
