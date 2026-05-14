/**
 * Shared types for the pipeline engine. Extracted from pipeline-engine.ts
 * so node executor modules can import without circular dependencies.
 *
 * Keep this file structural-only (no runtime exports) — both the engine and
 * every node module import from here.
 */

import type { pipelineNodes, pipelineEdges } from '@/db/schema';

export type DbPipelineNode = typeof pipelineNodes.$inferSelect;
export type DbPipelineEdge = typeof pipelineEdges.$inferSelect;

export type Row = Record<string, unknown>;

export interface PipelineLogEntry {
  nodeId: number;
  message: string;
  level: 'info' | 'warn' | 'error';
}

export interface PipelineRunContext {
  pipelineId: number;
  runId: number;
  userId: string;
  log: PipelineLogEntry[];
  rowsErrored: number;
}

export type NodeExecutor = (
  config: Record<string, unknown>,
  inputRows: Row[],
  node: DbPipelineNode,
  ctx: PipelineRunContext,
) => Promise<Row[]>;
