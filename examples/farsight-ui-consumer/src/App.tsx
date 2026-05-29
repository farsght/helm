import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  Button,
  FarsightProvider,
  WorkflowCanvas,
  AgentChatView,
  workflowKeys,
  createApiClient,
} from "@farsight/ui"
import type { PipelineDefinition } from "@farsight/contracts"

// ─── PORT-01 dev-mode seeded QueryClient ─────────────────────────────────────
//
// WorkflowCanvas fetches via useWorkflowQueryOptions, which calls
// workflowKeys.detail(orgSlug, projectSlug, wfSlug). Pre-seed that key so
// the canvas renders with nodes+edges without a live API call.
// PORT-01 dev mode: replace getToken with real Clerk getToken in apps/web.

const DEMO_ORG = "demo-org"
const DEMO_PROJECT = "demo-project"
const DEMO_WF_SLUG = "demo-wf"

/** Minimal two-node + one-edge PipelineDefinition for canvas mount proof. */
const SEEDED_DEFINITION: PipelineDefinition = {
  schemaVersion: 1,
  name: "Demo Pipeline",
  trigger: { kind: "manual" },
  nodes: [
    {
      id: "source-1",
      type: "core.source.manual@1.0.0",
      name: "Source",
      parameters: {},
      position: { x: 100, y: 150 },
      disabled: false,
    },
    {
      id: "sink-1",
      type: "core.sink.dataset@1.0.0",
      name: "Sink",
      parameters: {},
      position: { x: 400, y: 150 },
      disabled: false,
    },
  ],
  edges: [
    { from: "source-1", fromPort: "main", to: "sink-1", toPort: "main" },
  ],
  staticData: {},
}

/**
 * Pre-seeded QueryClient so WorkflowCanvas renders from local data without
 * needing a live API call. The seeded data matches what the canvas expects:
 * { name, active, definition } at workflowKeys.detail(org, project, wfSlug).
 */
function buildSeededQueryClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  qc.setQueryData(workflowKeys.detail(DEMO_ORG, DEMO_PROJECT, DEMO_WF_SLUG), {
    slug: DEMO_WF_SLUG,
    name: "Demo Pipeline",
    active: true,
    version: 1,
    definition: SEEDED_DEFINITION,
  })
  return qc
}

const seededQueryClient = buildSeededQueryClient()

/**
 * Dev-mode mock API client. Returns empty responses for all calls.
 * The canvas uses the pre-seeded QueryClient cache, so no real API calls are
 * needed for the visual PORT-01 proof. Save/run will 401 (expected — getToken
 * returns null and no real Clerk session exists).
 */
const devClient = createApiClient({
  baseUrl: "https://api.farsght.com",
  getToken: async () => null,
})

export default function App() {
  return (
    // PORT-01 dev mode: wrap in QueryClientProvider with the seeded client.
    // In apps/web, FarsightProvider creates its own QueryClient internally.
    // Here we pass it as a prop to inject the seeded data.
    <QueryClientProvider client={seededQueryClient}>
      {/*
       * FarsightProvider with _test* bypass props so no ClerkProvider is
       * required in this standalone Vite dev app (PORT-01 visual-only proof).
       * In apps/web: mount ClerkProvider → FarsightProvider with getToken
       * from useAuth(), orgSlug from useOrganization(), etc.
       */}
      <FarsightProvider
        baseUrl="https://api.farsght.com"
        projectSlug={DEMO_PROJECT}
        queryClient={seededQueryClient}
        _testClient={devClient}
        _testUserId="dev-user"
        _testOrgSlug={DEMO_ORG}
      >
        <div className="min-h-screen bg-background text-foreground p-8 space-y-8">
          <h1 className="text-2xl font-bold">Farsight UI Consumer — PORT-01 Proof</h1>

          {/* ─── (a) Button import proof ─────────────────────────────────────── */}
          <section aria-labelledby="button-heading">
            <h2 id="button-heading" className="text-lg font-semibold mb-3">
              (a) Button import proof
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Imports Button from{" "}
              <code className="font-mono text-xs">@farsight/ui</code>.{" "}
              If this renders with a themed background, tokens applied via{" "}
              <code className="font-mono text-xs">@source</code>.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button>Primary button</Button>
              <Button variant="outline">Outline button</Button>
              <Button variant="secondary">Secondary button</Button>
              <Button variant="ghost">Ghost button</Button>
            </div>
          </section>

          {/* ─── (b) Primary-color token proof ───────────────────────────────── */}
          <section aria-labelledby="token-heading">
            <h2 id="token-heading" className="text-lg font-semibold mb-3">
              (b) Primary-color token proof
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              This div uses{" "}
              <code className="font-mono text-xs">var(--color-primary)</code>.{" "}
              If it shows a themed green/brand color (not black or unstyled),
              the <code className="font-mono text-xs">@farsight/ui/theme.css</code> tokens
              and <code className="font-mono text-xs">@source</code> R-05 fix are working.
            </p>
            <div
              className="h-12 w-48 rounded-md flex items-center justify-center text-sm font-medium text-white"
              style={{ background: "var(--color-primary)" }}
            >
              var(--color-primary)
            </div>
          </section>

          {/* ─── (c) WorkflowCanvas mount proof ──────────────────────────────── */}
          <section aria-labelledby="canvas-heading">
            <h2 id="canvas-heading" className="text-lg font-semibold mb-3">
              (c) WorkflowCanvas mount proof
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Canvas is seeded via QueryClient cache — no live API call needed.{" "}
              Edges must be visible SVG paths (proves D-09 CSS import order correct).
            </p>
            {/* Fixed height required for xyflow to render */}
            <div className="border rounded-lg overflow-hidden" style={{ height: 400 }}>
              <WorkflowCanvas
                wfSlug={DEMO_WF_SLUG}
                onBack={() => {}}
                showMiniMap={false}
              />
            </div>
          </section>

          {/* ─── (d) AgentChatView mount proof ───────────────────────────────── */}
          <section aria-labelledby="agent-heading">
            <h2 id="agent-heading" className="text-lg font-semibold mb-3">
              (d) AgentChatView mount proof
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Should show an "Start a conversation" EmptyState (no live API needed
              — messages query returns empty without real creds).
            </p>
            <div className="border rounded-lg overflow-hidden" style={{ height: 400 }}>
              <AgentChatView
                agentDefinitionId="demo-agent"
                agentLabel="Demo Agent"
                interval={false}
              />
            </div>
          </section>
        </div>
      </FarsightProvider>
    </QueryClientProvider>
  )
}
