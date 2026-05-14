"use client"

import { CheckCircle2Icon, FileIcon, Loader2Icon, SendIcon, XCircleIcon } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

interface WebhookEvent {
  id: string
  label: string
  description: string
  enabled: boolean
}

type DeliveryStatus = "success" | "failed" | "pending"

interface DeliveryLog {
  id: string
  event: string
  statusCode: number
  status: DeliveryStatus
  timestamp: string
  duration: string
}

const initialEvents: WebhookEvent[] = [
  {
    id: "upload_complete",
    label: "Upload complete",
    description: "File successfully uploaded to storage",
    enabled: true,
  },
  {
    id: "processing_started",
    label: "Processing started",
    description: "File processing pipeline initiated",
    enabled: true,
  },
  {
    id: "processing_complete",
    label: "Processing complete",
    description: "All processing steps finished",
    enabled: true,
  },
  {
    id: "processing_failed",
    label: "Processing failed",
    description: "Processing encountered an error",
    enabled: true,
  },
  {
    id: "file_deleted",
    label: "File deleted",
    description: "File removed from storage",
    enabled: false,
  },
  {
    id: "quota_exceeded",
    label: "Quota exceeded",
    description: "Storage quota limit reached",
    enabled: false,
  },
]

const initialDeliveries: DeliveryLog[] = [
  {
    id: "d1",
    event: "upload_complete",
    statusCode: 200,
    status: "success",
    timestamp: "2 min ago",
    duration: "124ms",
  },
  {
    id: "d2",
    event: "processing_started",
    statusCode: 200,
    status: "success",
    timestamp: "2 min ago",
    duration: "89ms",
  },
  {
    id: "d3",
    event: "processing_complete",
    statusCode: 200,
    status: "success",
    timestamp: "1 min ago",
    duration: "156ms",
  },
  {
    id: "d4",
    event: "upload_complete",
    statusCode: 500,
    status: "failed",
    timestamp: "45 min ago",
    duration: "2,340ms",
  },
  {
    id: "d5",
    event: "processing_failed",
    statusCode: 200,
    status: "success",
    timestamp: "1 hr ago",
    duration: "201ms",
  },
]

const statusDot: Record<DeliveryStatus, string> = {
  success: "bg-emerald-500",
  failed: "bg-red-500",
  pending: "bg-amber-500",
}

export default function FileUploadWebhookNotify() {
  const [webhookUrl, setWebhookUrl] = useState("https://api.acme.com/webhooks/file-events")
  const [events, setEvents] = useState<WebhookEvent[]>(initialEvents)
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>(initialDeliveries)
  const [testing, setTesting] = useState(false)
  const [uploadedFile] = useState({ name: "quarterly-metrics.xlsx", size: "1.4 MB" })

  const toggleEvent = (id: string) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, enabled: !e.enabled } : e)))
  }

  const enabledCount = events.filter(e => e.enabled).length

  const testWebhook = () => {
    setTesting(true)
    setTimeout(() => {
      const newDelivery: DeliveryLog = {
        id: `d-test-${deliveries.length}`,
        event: "test_ping",
        statusCode: 200,
        status: "success",
        timestamp: "Just now",
        duration: "98ms",
      }
      setDeliveries(prev => [newDelivery, ...prev])
      setTesting(false)
    }, 1200)
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="border-b px-4 py-3">
          <span className="font-medium text-sm">Webhook notifications</span>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Receive HTTP callbacks when file upload events occur
          </p>
        </div>

        {/* Uploaded file */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <FileIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <span className="block truncate font-medium text-sm">{uploadedFile.name}</span>
            <span className="text-muted-foreground text-xs">{uploadedFile.size}</span>
          </div>
          <Badge variant="secondary" className="font-normal text-xs">
            <CheckCircle2Icon className="size-3 text-emerald-500" />
            Uploaded
          </Badge>
        </div>

        {/* Webhook URL */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="shrink-0 font-medium text-muted-foreground text-xs">Endpoint</span>
          <Input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://your-api.com/webhook"
            className="h-8 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 shrink-0 gap-1.5 text-xs"
            onClick={testWebhook}
            disabled={testing || !webhookUrl}
          >
            {testing ? (
              <>
                <Loader2Icon className="size-3 animate-spin" />
                Testing
              </>
            ) : (
              <>
                <SendIcon className="size-3" />
                Test
              </>
            )}
          </Button>
        </div>

        {/* Events selection */}
        <div className="border-b">
          <div className="border-b px-4 py-2">
            <span className="text-muted-foreground text-xs">
              Events · {enabledCount} of {events.length} enabled
            </span>
          </div>
          {events.map((event, index) => (
            <span
              key={event.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleEvent(event.id)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") toggleEvent(event.id)
              }}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 ${
                index < events.length - 1 ? "border-b" : ""
              }`}
            >
              <Switch
                size="sm"
                checked={event.enabled}
                onCheckedChange={() => toggleEvent(event.id)}
              />
              <div className="min-w-0 flex-1">
                <span className="block font-medium text-sm">{event.label}</span>
                <span className="text-muted-foreground text-xs">{event.description}</span>
              </div>
              <span className="shrink-0 font-mono text-muted-foreground text-xs">{event.id}</span>
            </span>
          ))}
        </div>

        {/* Delivery log */}
        <div>
          <div className="border-b px-4 py-2">
            <span className="text-muted-foreground text-xs">Recent deliveries</span>
          </div>
          {deliveries.map((delivery, index) => (
            <div
              key={delivery.id}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                index < deliveries.length - 1 ? "border-b" : ""
              }`}
            >
              <span className={`size-1.5 shrink-0 rounded-full ${statusDot[delivery.status]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{delivery.event}</span>
                  <Badge
                    variant="secondary"
                    className={`font-mono text-xs font-normal ${
                      delivery.statusCode >= 400
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {delivery.statusCode}
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs">
                  {delivery.timestamp} · {delivery.duration}
                </span>
              </div>
              {delivery.status === "success" ? (
                <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-500" />
              ) : (
                <XCircleIcon className="size-3.5 shrink-0 text-red-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
