import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Button } from "@farsight/ui"

// TODO Plan 04-06: wire FarsightProvider + ClerkProvider for full PORT-01 validation.
// FarsightProvider requires a live Clerk session (getToken) and baseUrl.
// For this Wave-0 scaffold, only QueryClientProvider is mounted so Button renders
// and proves the dist tree-shaking entry point works.

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground p-8">
        <h1 className="text-2xl font-bold mb-4">Farsight UI Consumer Example</h1>
        <p className="text-muted-foreground mb-6">
          Validates that <code>@farsight/ui</code> resolves via{" "}
          <code>workspace:*</code> and tokens apply.
        </p>

        {/* Proves dist entry point works + tokens apply */}
        <div className="flex gap-3 flex-wrap">
          <Button>Primary button</Button>
          <Button variant="outline">Outline button</Button>
          <Button variant="secondary">Secondary button</Button>
          <Button variant="ghost">Ghost button</Button>
        </div>

        {/* Placeholder for WorkflowCanvas — wired in Plan 04-04 */}
        <div className="mt-8 border rounded-lg p-4 bg-card">
          <React.Suspense fallback={<p>Loading canvas…</p>}>
            {/* WorkflowCanvas added in Plan 04-04 once pipelines surface exists */}
            <p className="text-muted-foreground text-sm">
              Pipeline canvas will be mounted here in Plan 04-04 (PIPE-01).
            </p>
          </React.Suspense>
        </div>
      </div>
    </QueryClientProvider>
  )
}
