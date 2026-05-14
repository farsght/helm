/**
 * Webhook trigger endpoint — `POST /api/pipelines/[id]/webhook/[nodeId]`.
 *
 * Lets external systems (Fireflies webhooks, Zapier, n8n, IFTTT, raw curl)
 * push events into a pipeline. Semantics:
 *
 *   1. The target node must exist on the target pipeline, have zero in-edges
 *      (= source node), and have trigger_config.kind === 'webhook'.
 *   2. Auth: trigger_config.secret must match the X-Webhook-Secret header
 *      OR the ?secret= query param. Tokens are user-set per node.
 *   3. The request body is INJECTED as the source node's output rows
 *      (bypassing its executor entirely — the payload IS the data). Body
 *      may be either an object (wrapped to [obj]) or an array (used as-is).
 *   4. The downstream subgraph runs through the normal pipeline-engine path.
 *
 * Unauthenticated (Clerk auth is intentionally NOT required). The per-node
 * secret is the auth. This is by design — external systems can't ferry
 * Clerk cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pipelines, pipelineNodes, pipelineEdges, pipelineRuns } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { runPipeline, markRunCompleted, markRunFailed, parseTriggerConfig, type Row } from '@/lib/pipeline-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> },
) {
  const { id, nodeId } = await params;
  const pipelineId = parseInt(id);
  const sourceNodeId = parseInt(nodeId);

  if (!Number.isFinite(pipelineId) || !Number.isFinite(sourceNodeId)) {
    return NextResponse.json({ error: 'Invalid pipeline or node id' }, { status: 400 });
  }

  // Load the node and verify it's (a) on this pipeline, (b) a source, (c) webhook-triggered.
  const [node] = await db
    .select()
    .from(pipelineNodes)
    .where(and(eq(pipelineNodes.id, sourceNodeId), eq(pipelineNodes.pipelineId, pipelineId)));
  if (!node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 });
  }

  const inEdges = await db
    .select()
    .from(pipelineEdges)
    .where(eq(pipelineEdges.targetNodeId, sourceNodeId));
  if (inEdges.length > 0) {
    return NextResponse.json({ error: 'Node is not a source (has incoming edges)' }, { status: 400 });
  }

  const trig = parseTriggerConfig(node.triggerConfig);
  if (trig.kind !== 'webhook') {
    return NextResponse.json({ error: `Node trigger kind is '${trig.kind}', expected 'webhook'` }, { status: 400 });
  }

  // Auth: secret must match. Empty secret in config means the endpoint is closed.
  const expectedSecret = typeof trig.secret === 'string' && trig.secret.length > 0 ? trig.secret : null;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'No secret configured on node — webhook is closed' }, { status: 403 });
  }
  const headerSecret = request.headers.get('x-webhook-secret');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = headerSecret ?? querySecret;
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  // Load the pipeline for ownership / userId — we need it to scope executors.
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, pipelineId));
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  }

  // Parse the request body. Accept object → [object] or array → array.
  let payload: Row[];
  try {
    const body = await request.json();
    if (Array.isArray(body)) {
      payload = body as Row[];
    } else if (body && typeof body === 'object') {
      payload = [body as Row];
    } else {
      return NextResponse.json({ error: 'Body must be object or array' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Create the pipeline_runs row, dispatch, mark completed/failed, respond.
  const [run] = await db.insert(pipelineRuns).values({
    pipelineId,
    status: 'running',
    rowsInput: payload.length,
    rowsOutput: 0,
    rowsErrored: 0,
  }).returning();

  try {
    const result = await runPipeline(pipelineId, run.id, pipeline.userId, {
      invokedBy: 'webhook',
      sourceNodeId,
      sourcePayload: payload,
    });
    const updated = await markRunCompleted(pipelineId, run.id, result);
    return NextResponse.json({
      runId: updated.id,
      status: updated.status,
      rowsInput: result.rowsInput,
      rowsOutput: result.rowsOutput,
      rowsErrored: result.rowsErrored,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await markRunFailed(run.id, msg);
    return NextResponse.json({ runId: run.id, status: 'failed', error: msg }, { status: 500 });
  }
}
