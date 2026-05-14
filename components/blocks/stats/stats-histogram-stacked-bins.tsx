"use client"

// Archetype: M — Histogram / Distribution Card
import { motion, useReducedMotion } from "motion/react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart"

interface HistogramBin {
  bucket: string
  small: number
  medium: number
  large: number
}

const bins: HistogramBin[] = [
  { bucket: "0-50", small: 420, medium: 80, large: 12 },
  { bucket: "50-100", small: 680, medium: 210, large: 24 },
  { bucket: "100-150", small: 910, medium: 380, large: 48 },
  { bucket: "150-200", small: 1120, medium: 540, large: 92 },
  { bucket: "200-250", small: 980, medium: 680, large: 148 },
  { bucket: "250-300", small: 740, medium: 620, large: 186 },
  { bucket: "300-400", small: 520, medium: 480, large: 224 },
  { bucket: "400-600", small: 310, medium: 340, large: 198 },
  { bucket: "600-900", small: 180, medium: 220, large: 142 },
  { bucket: "900+", small: 95, medium: 140, large: 88 },
]

const chartConfig = {
  small: {
    label: "< 10 KB",
    theme: { light: "oklch(0.646 0.222 41.116)", dark: "oklch(0.488 0.243 264.376)" },
  },
  medium: {
    label: "10-100 KB",
    theme: { light: "oklch(0.6 0.118 184.704)", dark: "oklch(0.696 0.17 162.48)" },
  },
  large: {
    label: "> 100 KB",
    theme: { light: "oklch(0.398 0.07 227.392)", dark: "oklch(0.769 0.188 70.08)" },
  },
} satisfies ChartConfig

export default function StatsHistogramStackedBins() {
  const reduceMotion = useReducedMotion()

  const totalRequests = bins.reduce((acc, b) => acc + b.small + b.medium + b.large, 0)

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
            <p className="text-sm font-medium">Response latency by size</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Last hour · ms bucket</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Requests
            </p>
            <p className="text-sm font-semibold tabular-nums">{totalRequests.toLocaleString()}</p>
          </div>
        </div>

        <div className="px-4 py-4">
          <ChartContainer className="h-[180px] w-full" config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={bins}
              margin={{ left: -12, right: 0, top: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="bucket" tickLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="small"
                fill="var(--color-small)"
                radius={[0, 0, 0, 0]}
                stackId="requests"
              />
              <Bar
                dataKey="medium"
                fill="var(--color-medium)"
                radius={[0, 0, 0, 0]}
                stackId="requests"
              />
              <Bar
                dataKey="large"
                fill="var(--color-large)"
                radius={[2, 2, 0, 0]}
                stackId="requests"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </motion.section>
  )
}
