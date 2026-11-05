/**
 * MVP node-type subset for Phase 4 canvas (D-08).
 *
 * NodeId strings verified against Farsight node registry at
 * farsight-platform/apps/api/src/nodes/:
 *   - source-manual.ts   → core.source.manual@1.0.0
 *   - transform-set.ts  → core.transform.set@1.0.0
 *   - sink-dataset.ts   → core.sink.dataset@1.0.0
 *
 * Pattern: /^[a-z][a-z0-9._-]*@\d+\.\d+\.\d+$/ (Pitfall 3).
 * If registry adds new node types, add here.
 */
export const NODE_IDS = {
  SOURCE_MANUAL: "core.source.manual@1.0.0",
  TRANSFORM_SET: "core.transform.set@1.0.0",
  SINK_DATASET: "core.sink.dataset@1.0.0",
} as const

export type NodeIdKey = keyof typeof NODE_IDS

/**
 * Maps a Farsight NodeId string to the xyflow nodeTypes key.
 * Used by toFlowNode() to resolve the node component for the canvas.
 *
 * @param farsightNodeId - Canonical Farsight NodeId (e.g. "core.source.manual@1.0.0")
 * @returns xyflow nodeTypes key: "source" | "transform" | "sink" | "utility"
 */
export function nodeTypeFor(farsightNodeId: string): string {
  if (farsightNodeId.startsWith("core.source.")) return "source"
  if (farsightNodeId.startsWith("core.transform.")) return "transform"
  if (farsightNodeId.startsWith("core.sink.")) return "sink"
  if (farsightNodeId.startsWith("core.utility.")) return "utility"
  // Fallback: unknown NodeId — log a warning in development
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[canvas-kit] nodeTypeFor: unknown NodeId prefix "${farsightNodeId}". ` +
        `Expected pattern: /^[a-z][a-z0-9._-]*@\\d+\\.\\d+\\.\\d+$/. ` +
        `Falling back to "source".`
    )
  }
  return "source"
}
