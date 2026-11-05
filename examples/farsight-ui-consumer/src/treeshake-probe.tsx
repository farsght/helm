/**
 * D-05 tree-shake probe — Button-ONLY import from @farsight/ui.
 *
 * This is the isolated entry point for the vite.treeshake.config.ts build.
 * It imports ONLY Button — no WorkflowCanvas, no AgentChatView, no canvas-kit.
 * The built dist-treeshake/assets/ must contain NO xyflow or recharts chunks.
 *
 * Verified by: `! grep -rEi "xyflow|react-flow|recharts" dist-treeshake/assets/`
 */
import React from "react"
import ReactDOM from "react-dom/client"
import { Button } from "@farsight/ui"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Button>probe</Button>
  </React.StrictMode>
)
