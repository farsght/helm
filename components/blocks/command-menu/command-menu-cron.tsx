"use client"

import { CalendarIcon, CheckIcon, ClockIcon, CopyIcon, RepeatIcon, TimerIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"

interface CronPreset {
  id: string
  label: string
  expression: string
  description: string
}

const minutePresets: CronPreset[] = [
  {
    id: "every-min",
    label: "Every Minute",
    expression: "* * * * *",
    description: "Runs every 60 seconds",
  },
  {
    id: "every-5",
    label: "Every 5 Minutes",
    expression: "*/5 * * * *",
    description: "Runs 12 times per hour",
  },
  {
    id: "every-15",
    label: "Every 15 Minutes",
    expression: "*/15 * * * *",
    description: "Runs 4 times per hour",
  },
  {
    id: "every-30",
    label: "Every 30 Minutes",
    expression: "*/30 * * * *",
    description: "Runs twice per hour",
  },
]

const hourlyPresets: CronPreset[] = [
  {
    id: "every-hour",
    label: "Every Hour",
    expression: "0 * * * *",
    description: "At minute 0 of every hour",
  },
  {
    id: "every-2h",
    label: "Every 2 Hours",
    expression: "0 */2 * * *",
    description: "At minute 0, every 2 hours",
  },
  {
    id: "every-6h",
    label: "Every 6 Hours",
    expression: "0 */6 * * *",
    description: "4 times per day",
  },
  {
    id: "every-12h",
    label: "Every 12 Hours",
    expression: "0 0,12 * * *",
    description: "At midnight and noon",
  },
]

const dailyPresets: CronPreset[] = [
  {
    id: "daily-midnight",
    label: "Daily at Midnight",
    expression: "0 0 * * *",
    description: "Every day at 00:00",
  },
  {
    id: "daily-9am",
    label: "Daily at 9 AM",
    expression: "0 9 * * *",
    description: "Every day at 09:00",
  },
  {
    id: "weekdays-9am",
    label: "Weekdays at 9 AM",
    expression: "0 9 * * 1-5",
    description: "Mon-Fri at 09:00",
  },
  {
    id: "weekly-monday",
    label: "Weekly on Monday",
    expression: "0 9 * * 1",
    description: "Every Monday at 09:00",
  },
  {
    id: "monthly-first",
    label: "Monthly on the 1st",
    expression: "0 0 1 * *",
    description: "First day of each month",
  },
]

export default function CommandMenuCron() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<CronPreset | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSelect = (preset: CronPreset) => {
    setSelected(preset)
  }

  const handleCopy = () => {
    if (selected) {
      navigator.clipboard.writeText(selected.expression)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="flex items-center justify-center overflow-hidden rounded-lg border bg-card px-6 py-16">
        <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
          <TimerIcon className="size-4 text-muted-foreground" />
          <span className="text-sm">Cron Builder</span>
          <Kbd>⌘⇧T</Kbd>
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search schedules..." />
        <CommandList>
          <CommandEmpty>No schedules found.</CommandEmpty>

          <CommandGroup heading="Minutes">
            {minutePresets.map(preset => (
              <CommandItem key={preset.id} onSelect={() => handleSelect(preset)} className="gap-3">
                <RepeatIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{preset.label}</div>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{preset.expression}</span>
                {selected?.id === preset.id && <CheckIcon className="size-4 text-emerald-500" />}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Hourly">
            {hourlyPresets.map(preset => (
              <CommandItem key={preset.id} onSelect={() => handleSelect(preset)} className="gap-3">
                <ClockIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{preset.label}</div>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{preset.expression}</span>
                {selected?.id === preset.id && <CheckIcon className="size-4 text-emerald-500" />}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Daily & Weekly">
            {dailyPresets.map(preset => (
              <CommandItem key={preset.id} onSelect={() => handleSelect(preset)} className="gap-3">
                <CalendarIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{preset.label}</div>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{preset.expression}</span>
                {selected?.id === preset.id && <CheckIcon className="size-4 text-emerald-500" />}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        <div className="flex items-center justify-between border-t px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TimerIcon className="size-3" />
            <span>{selected ? selected.expression : "Select a schedule"}</span>
          </div>
          {selected && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </CommandDialog>
    </section>
  )
}
