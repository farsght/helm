// Pipelines surface barrel — PIPE-01
export { WorkflowList } from "./workflow-list"
export type { WorkflowListProps } from "./workflow-list"
export { WorkflowCanvas } from "./workflow-canvas"
export type { WorkflowCanvasProps } from "./workflow-canvas"
export { WorkflowRunView } from "./workflow-run-view"
export type { WorkflowRunViewProps } from "./workflow-run-view"

// Node components
export { SourceNode } from "./nodes/source-node"
export { TransformNode } from "./nodes/transform-node"
export { SinkNode } from "./nodes/sink-node"

// Adapter utilities
export { toFlowNode, toDefinition, validatePipelineGraph } from "./pipeline-adapter"

// Node ID constants + classifier
export { NODE_IDS, nodeTypeFor } from "./node-ids"
export type { NodeIdKey } from "./node-ids"
