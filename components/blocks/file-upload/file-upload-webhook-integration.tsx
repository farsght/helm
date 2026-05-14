"use client"

import {
  CheckCircle2Icon,
  CloudUploadIcon,
  Loader2Icon,
  SendIcon,
  WebhookIcon,
  XCircleIcon,
} from "lucide-react"
import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

type DeliveryStatus = "idle" | "sending" | "delivered" | "failed"

interface WebhookEvent {
  id: string
  name: string
  description: string
  enabled: boolean
}

const initialEvents: WebhookEvent[] = [
  {
    id: "upload.started",
    name: "upload.started",
    description: "Fires when a file upload begins",
    enabled: true,
  },
  {
    id: "upload.completed",
    name: "upload.completed",
    description: "Fires when a file upload succeeds",
    enabled: true,
  },
  {
    id: "upload.failed",
    name: "upload.failed",
    description: "Fires when a file upload fails",
    enabled: false,
  },
  {
    id: "upload.deleted",
    name: "upload.deleted",
    description: "Fires when an uploaded file is deleted",
    enabled: false,
  },
]

const samplePayload = JSON.stringify(
  {
    event: "upload.completed",
    timestamp: "2026-03-24T14:32:00Z",
    data: {
      file_id: "file_8a3b2c1d",
      filename: "quarterly-report.pdf",
      size: 2458624,
      mime_type: "application/pdf",
    },
  },
  null,
  2,
)

export default function FileUploadWebhookIntegration() {
  const [webhookUrl, setWebhookUrl] = useState("https://hooks.acme.com/upload-events")
  const [secret, setSecret] = useState("whsec_a1b2c3d4e5f6g7h8")
  const [events, setEvents] = useState<WebhookEvent[]>(initialEvents)
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>("idle")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleEvent = (id: string) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, enabled: !e.enabled } : e)))
  }

  const testWebhook = () => {
    setDeliveryStatus("sending")
    setTimeout(() => setDeliveryStatus("delivered"), 1200)
  }

  const enabledCount = events.filter(e => e.enabled).length

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <WebhookIcon className="size-4 text-muted-foreground" />
          <div>
            <span className="font-medium text-sm">Webhook Configuration</span>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {enabledCount} event {enabledCount === 1 ? "type" : "types"} enabled
            </p>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="space-y-1.5 border-b px-4 py-3">
          <span className="font-medium text-muted-foreground text-xs">Endpoint URL</span>
          <Input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://your-app.com/webhooks/upload"
            className="h-8 font-mono text-sm"
          />
        </div>

        {/* Signing secret */}
        <div className="space-y-1.5 border-b px-4 py-3">
          <span className="font-medium text-muted-foreground text-xs">Signing secret</span>
          <Input
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="whsec_..."
            className="h-8 font-mono text-sm"
          />
          <p className="text-muted-foreground text-xs">
            Used to verify webhook signatures via HMAC-SHA256
          </p>
        </div>

        {/* Event types */}
        <div className="border-b px-4 py-3">
          <span className="mb-2 block font-medium text-muted-foreground text-xs">Event types</span>
          <div className="space-y-0">
            {events.map((event, index) => (
              <span
                key={event.id}
                role="button"
                tabIndex={0}
                onClick={() => toggleEvent(event.id)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") toggleEvent(event.id)
                }}
                className={`flex cursor-pointer items-center gap-3 py-2.5 ${
                  index < events.length - 1 ? "border-b" : ""
                }`}
              >
                <Switch checked={event.enabled} onCheckedChange={() => toggleEvent(event.id)} />
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-sm">{event.name}</span>
                  <p className="text-muted-foreground text-xs">{event.description}</p>
                </div>
                {event.enabled && (
                  <Badge variant="secondary" className="shrink-0 font-normal text-xs">
                    Active
                  </Badge>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Payload preview */}
        <div className="border-b px-4 py-3">
          <span className="mb-2 block font-medium text-muted-foreground text-xs">
            Sample payload (JSON)
          </span>
          <div className="rounded-md bg-zinc-950 p-3">
            <pre className="overflow-x-auto font-mono text-sm text-zinc-100 leading-relaxed">
              {samplePayload}
            </pre>
          </div>
        </div>

        {/* Test webhook */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {deliveryStatus === "delivered" && (
              <>
                <CheckCircle2Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  Delivered (200 OK)
                </span>
              </>
            )}
            {deliveryStatus === "failed" && (
              <>
                <XCircleIcon className="size-3.5 text-red-600 dark:text-red-400" />
                <span className="text-red-600 text-sm dark:text-red-400">
                  Delivery failed (timeout)
                </span>
              </>
            )}
            {deliveryStatus === "sending" && (
              <>
                <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Sending test event...</span>
              </>
            )}
            {deliveryStatus === "idle" && (
              <span className="text-muted-foreground text-xs">
                Send a test event to verify your endpoint
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={testWebhook}
            disabled={deliveryStatus === "sending"}
          >
            <SendIcon className="size-3" />
            Test webhook
          </Button>
        </div>

        {/* Upload trigger */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 flex-1">
            {selectedFile ? (
              <span className="truncate font-mono text-sm">{selectedFile}</span>
            ) : (
              <span className="text-muted-foreground text-xs">
                Upload a file to trigger configured webhooks
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => inputRef.current?.click()}
            >
              Choose file
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={!selectedFile || enabledCount === 0}
            >
              <CloudUploadIcon className="size-3.5" />
              Upload & send
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={e => {
              if (e.target.files?.[0]) setSelectedFile(e.target.files[0].name)
              e.target.value = ""
            }}
          />
        </div>
      </div>
    </section>
  )
}
