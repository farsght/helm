/**
 * Agent runtime — v1 (no tools, no MCP yet)
 *
 * `runAgent(agentId, context)`:
 *   1. Loads the agent definition
 *   2. Renders prompts against `context` (template variable substitution)
 *   3. Calls the model via Vercel AI SDK (provider chosen from `model` prefix)
 *   4. Forces the output into one of `decisions[]` via structured output
 *   5. Logs the full run to `agent_runs` for observability
 *   6. Returns `{ decision, reasoning, tokensUsed, runId }`
 *
 * Future increments:
 *   - Increment 2: load attached skills into systemPrompt, attach MCP tools
 *   - Increment 3: streaming + multi-turn tool-use loop
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { agentDefinitions, agentRuns } from '@/db/schema';

export class AgentNotFoundError extends Error {
  constructor(agentId: number) {
    super(`Agent ${agentId} not found`);
    this.name = 'AgentNotFoundError';
  }
}

export class AgentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentConfigError';
  }
}

export class AgentRuntimeError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'AgentRuntimeError';
  }
}

export interface AgentInvocationContext {
  /** Where this run is invoked from. */
  invokedByType: 'workflow_node' | 'manual' | 'conversation' | 'cron' | 'dataset_row' | 'api';
  /** Foreign id into invoking table (workflow_node id, etc). Convention only. */
  invokedById?: number;
  /** User id for logging + multi-tenant scope. */
  userId: string;
  /** Template variables for prompt substitution. */
  variables: Record<string, string | number | null | undefined>;
}

export interface AgentRunResult {
  runId: number;
  decision: string;
  reasoning: string;
  tokensUsed: number | null;
}

interface OutputSchema {
  decisions: string[];
}

interface ModelParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * Render `{{var}}` placeholders in a template against the variables map.
 * Missing variables become empty strings (forgiving by design for v1).
 */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Parse "provider:model" into an AI SDK LanguageModel instance.
 * v1 supports openai and anthropic only.
 */
function resolveModel(modelString: string) {
  const colonIdx = modelString.indexOf(':');
  if (colonIdx < 0) {
    throw new AgentConfigError(`Invalid model format: "${modelString}". Expected "provider:model" e.g. "openai:gpt-4o-mini".`);
  }
  const provider = modelString.slice(0, colonIdx);
  const modelId = modelString.slice(colonIdx + 1);
  switch (provider) {
    case 'openai':
      return openai(modelId);
    case 'anthropic':
      return anthropic(modelId);
    default:
      throw new AgentConfigError(`Unsupported provider: "${provider}". v1 supports: openai, anthropic.`);
  }
}

function parseOutputSchema(json: string): OutputSchema {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new AgentConfigError('outputSchemaJson is not valid JSON');
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as OutputSchema).decisions) ||
    (parsed as OutputSchema).decisions.length === 0 ||
    !(parsed as OutputSchema).decisions.every((d) => typeof d === 'string' && d.length > 0)
  ) {
    throw new AgentConfigError('outputSchemaJson must be {"decisions": ["..."]} with at least one non-empty string');
  }
  return parsed as OutputSchema;
}

function parseModelParams(json: string | null): ModelParams {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function runAgent(
  agentId: number,
  context: AgentInvocationContext,
): Promise<AgentRunResult> {
  const [agent] = await db
    .select()
    .from(agentDefinitions)
    .where(eq(agentDefinitions.id, agentId))
    .limit(1);

  if (!agent) throw new AgentNotFoundError(agentId);

  const outputSchema = parseOutputSchema(agent.outputSchemaJson);
  const modelParams = parseModelParams(agent.modelParamsJson);
  const languageModel = resolveModel(agent.model);

  const renderedSystem = renderTemplate(agent.systemPrompt, context.variables);
  const renderedUser = renderTemplate(agent.userPromptTemplate, context.variables);

  // Create the run row up-front so we can attribute failures.
  const [run] = await db
    .insert(agentRuns)
    .values({
      agentId,
      userId: context.userId,
      invokedByType: context.invokedByType,
      invokedById: context.invokedById ?? null,
      status: 'running',
      inputJson: JSON.stringify({
        systemPrompt: renderedSystem,
        userPrompt: renderedUser,
        variables: context.variables,
      }),
    })
    .returning();

  try {
    // Force the model into the decision schema via structured output.
    // The reasoning field gives us the "why" for observability.
    const schema = z.object({
      decision: z.enum(outputSchema.decisions as [string, ...string[]]),
      reasoning: z.string().describe('Brief explanation of why this decision was chosen.'),
    });

    const { object, usage } = await generateObject({
      model: languageModel,
      schema,
      schemaName: 'AgentDecision',
      schemaDescription: `Choose one of: ${outputSchema.decisions.join(', ')}`,
      system: renderedSystem || undefined,
      prompt: renderedUser,
      temperature: modelParams.temperature,
      maxOutputTokens: modelParams.maxTokens,
      topP: modelParams.topP,
    });

    const tokensUsed = usage?.totalTokens ?? null;

    await db
      .update(agentRuns)
      .set({
        status: 'completed',
        decision: object.decision,
        reasoning: object.reasoning,
        tokensUsed,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, run.id));

    return {
      runId: run.id,
      decision: object.decision,
      reasoning: object.reasoning,
      tokensUsed,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(agentRuns)
      .set({
        status: 'failed',
        errorMessage: message,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, run.id));
    throw new AgentRuntimeError(`Agent ${agentId} failed: ${message}`, err);
  }
}
