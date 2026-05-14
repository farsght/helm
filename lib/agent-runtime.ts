/**
 * Agent runtime — Tier 1 (Increment 2)
 *
 * `runAgent(agentId, context)`:
 *   1. Loads the agent definition + attached skills + attached MCP servers
 *   2. Concatenates skills into the system prompt
 *   3. Fetches tool lists from MCP servers and exposes them to the LLM
 *   4. Two-stage call:
 *        a) generateText with tools (bounded tool-use loop) — gather info
 *        b) generateObject forces final decision from `decisions[]`
 *   5. Logs full run to `agent_runs` with tool calls + tokens
 *   6. Returns `{ decision, reasoning, toolCalls, tokensUsed, runId }`
 *
 * Stage (a) is skipped when no tools are attached — pure decision agents
 * still get the fast `generateObject` path.
 */

import { generateObject, generateText, tool, type ToolSet } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/db';
import {
  agentDefinitions,
  agentRuns,
  agentSkills,
  agentKnowledgeLinks,
  agentSkillLinks,
  mcpServers,
  agentMcpLinks,
} from '@/db/schema';
import { retrieveContext, formatContextBlock } from './knowledge-retrieval';
import { McpHttpClient, McpError, expandEnvVars, type McpTool } from '@/lib/mcp-client';

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
  invokedByType: 'workflow_node' | 'manual' | 'conversation' | 'cron' | 'dataset_row' | 'api';
  invokedById?: number;
  userId: string;
  variables: Record<string, string | number | null | undefined>;
}

export interface AgentToolCall {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface AgentRunResult {
  runId: number;
  decision: string;
  reasoning: string;
  tokensUsed: number | null;
  toolCalls: AgentToolCall[];
}

interface OutputSchema {
  decisions: string[];
}

interface ModelParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

function resolveModel(modelString: string) {
  const colonIdx = modelString.indexOf(':');
  if (colonIdx < 0) {
    throw new AgentConfigError(`Invalid model format: "${modelString}". Expected "provider:model" e.g. "openai:gpt-4o-mini".`);
  }
  const provider = modelString.slice(0, colonIdx);
  const modelId = modelString.slice(colonIdx + 1);
  switch (provider) {
    case 'openai': return openai(modelId);
    case 'anthropic': return anthropic(modelId);
    default:
      throw new AgentConfigError(`Unsupported provider: "${provider}". v1 supports: openai, anthropic.`);
  }
}

function parseOutputSchema(json: string): OutputSchema {
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new AgentConfigError('outputSchemaJson is not valid JSON'); }
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
  } catch { return {}; }
}

// ── Skill loading ───────────────────────────────────────────────────

/**
 * Fetch attached skills in `position` order. Returns concatenated markdown
 * separated by `## ${name}` headers — gives the LLM clear boundaries
 * between skills without us needing a smart prompt template.
 */
async function loadSkillsForAgent(agentId: number): Promise<string> {
  const rows = await db
    .select({
      name: agentSkills.name,
      body: agentSkills.body,
      position: agentSkillLinks.position,
    })
    .from(agentSkillLinks)
    .innerJoin(agentSkills, eq(agentSkillLinks.skillId, agentSkills.id))
    .where(eq(agentSkillLinks.agentId, agentId))
    .orderBy(asc(agentSkillLinks.position));

  if (rows.length === 0) return '';

  const parts = rows.map((r) => `## ${r.name}\n\n${r.body.trim()}`);
  return `# Skills\n\nThe following skills are available to you:\n\n${parts.join('\n\n')}\n`;
}

// ── Knowledge / RAG context loading ──────────────────────────────────
//
// For every dataset attached via agent_knowledge_links, run vector search
// scoped by pathPrefix (if set), then concatenate top-K chunks into a
// system-prompt context block. Query = the rendered prompts so retrieval
// reflects what the agent is actually about to think about.
async function loadKnowledgeContextForAgent(
  agentId: number,
  queryText: string,
  variables: Record<string, string | number | boolean | null | undefined>
): Promise<string> {
  const links = await db
    .select({
      datasetId: agentKnowledgeLinks.datasetId,
      pathPrefix: agentKnowledgeLinks.pathPrefix,
      topK: agentKnowledgeLinks.topK,
    })
    .from(agentKnowledgeLinks)
    .where(eq(agentKnowledgeLinks.agentId, agentId));

  if (links.length === 0) return '';

  // Render the query text with variables — same template substitution as the
  // prompts get, so {{firstName}}, {{company}} etc. resolve and contribute to
  // retrieval relevance.
  const renderedQuery = renderTemplate(queryText, variables);

  try {
    const chunks = await retrieveContext(
      renderedQuery,
      links.map((l) => ({ datasetId: l.datasetId, pathPrefix: l.pathPrefix, topK: l.topK })),
      5
    );
    return formatContextBlock(chunks);
  } catch (err) {
    console.error('[agent-runtime] knowledge retrieval failed:', err);
    // Non-fatal — better to run without context than to fail the whole run.
    return '';
  }
}

// ── MCP tool loading ────────────────────────────────────────────────

interface LoadedMcpTool {
  /** Server-namespaced name, e.g. "hubspot__search_contacts". The double underscore
   *  disambiguates two servers that expose the same tool name. */
  qualifiedName: string;
  /** Original (unqualified) name the server uses. */
  originalName: string;
  description: string;
  schema: McpTool['inputSchema'];
  client: McpHttpClient;
  /** For logging — never sent to model. */
  serverName: string;
  serverId: number;
}

/**
 * Fetch tool definitions from every attached MCP server. Failures on
 * individual servers are recorded but do NOT abort agent execution —
 * we want partial-tool-availability rather than total failure.
 */
async function loadMcpToolsForAgent(agentId: number): Promise<{
  tools: LoadedMcpTool[];
  failures: Array<{ serverId: number; serverName: string; message: string }>;
}> {
  const links = await db
    .select({
      serverId: mcpServers.id,
      serverName: mcpServers.name,
      url: mcpServers.url,
      authHeadersJson: mcpServers.authHeadersJson,
      enabledToolsJson: agentMcpLinks.enabledToolsJson,
    })
    .from(agentMcpLinks)
    .innerJoin(mcpServers, eq(agentMcpLinks.mcpServerId, mcpServers.id))
    .where(eq(agentMcpLinks.agentId, agentId));

  const tools: LoadedMcpTool[] = [];
  const failures: Array<{ serverId: number; serverName: string; message: string }> = [];

  for (const link of links) {
    let headers: Record<string, string> = {};
    if (link.authHeadersJson) {
      try { headers = expandEnvVars(JSON.parse(link.authHeadersJson)); }
      catch { /* malformed header JSON — treat as no headers */ }
    }
    const client = new McpHttpClient({ url: link.url, headers });

    let mcpTools: McpTool[];
    try {
      mcpTools = await client.listTools();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ serverId: link.serverId, serverName: link.serverName, message: msg });
      continue;
    }

    // Optional whitelist filter
    let allowedNames: Set<string> | null = null;
    if (link.enabledToolsJson) {
      try {
        const arr = JSON.parse(link.enabledToolsJson);
        if (Array.isArray(arr)) allowedNames = new Set(arr.filter((s) => typeof s === 'string'));
      } catch { /* ignore */ }
    }

    for (const t of mcpTools) {
      if (allowedNames && !allowedNames.has(t.name)) continue;
      tools.push({
        qualifiedName: `${sanitizeToolNamespace(link.serverName)}__${t.name}`,
        originalName: t.name,
        description: t.description ?? '',
        schema: t.inputSchema,
        client,
        serverName: link.serverName,
        serverId: link.serverId,
      });
    }
  }

  return { tools, failures };
}

/** Tool names must match `^[a-zA-Z0-9_-]+$` for OpenAI; sanitize the server name prefix. */
function sanitizeToolNamespace(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'mcp';
}

/**
 * Convert a JSON Schema to a Zod schema. Best-effort — covers the common
 * cases MCP servers actually emit. Unknown shapes fall back to `z.any()`
 * which the model still handles correctly via its native JSON-schema
 * understanding even when Zod can't validate.
 */
function jsonSchemaToZod(schema: McpTool['inputSchema']): z.ZodTypeAny {
  if (!schema || schema.type !== 'object') return z.object({}).passthrough();
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, raw] of Object.entries(props)) {
    const propSchema = raw as { type?: string; description?: string; enum?: unknown[] };
    let zt: z.ZodTypeAny;
    switch (propSchema.type) {
      case 'string':
        zt = Array.isArray(propSchema.enum)
          ? z.enum(propSchema.enum as [string, ...string[]])
          : z.string();
        break;
      case 'number':
      case 'integer':
        zt = z.number();
        break;
      case 'boolean':
        zt = z.boolean();
        break;
      case 'array':
        zt = z.array(z.any());
        break;
      case 'object':
        zt = z.object({}).passthrough();
        break;
      default:
        zt = z.any();
    }
    if (propSchema.description) zt = zt.describe(propSchema.description);
    if (!required.has(key)) zt = zt.optional();
    shape[key] = zt;
  }
  return z.object(shape).passthrough();
}

/**
 * Wrap MCP tools as AI SDK tools. Each tool's `execute` calls the MCP
 * client and serializes the result into a string the LLM can read.
 */
function buildToolSet(mcpTools: LoadedMcpTool[], toolCallLog: AgentToolCall[]): ToolSet {
  const set: ToolSet = {};
  for (const t of mcpTools) {
    set[t.qualifiedName] = tool({
      description: `[${t.serverName}] ${t.description}`,
      inputSchema: jsonSchemaToZod(t.schema),
      execute: async (args) => {
        const entry: AgentToolCall = { toolName: t.qualifiedName, args: args as Record<string, unknown> };
        try {
          const result = await t.client.callTool(t.originalName, args as Record<string, unknown>);
          // Reduce content array into something the model can consume directly.
          const text = (result.content ?? [])
            .map((c) => {
              if (c.type === 'text') return c.text;
              if (c.type === 'resource') return c.resource.text ?? `[resource: ${c.resource.uri}]`;
              if (c.type === 'image') return `[image: ${c.mimeType}, ${c.data.length} bytes]`;
              return '';
            })
            .join('\n');
          entry.result = text;
          toolCallLog.push(entry);
          if (result.isError) {
            return `Tool returned error: ${text}`;
          }
          return text || '(empty result)';
        } catch (err) {
          const msg = err instanceof McpError ? err.message : (err instanceof Error ? err.message : String(err));
          entry.error = msg;
          toolCallLog.push(entry);
          return `Tool call failed: ${msg}`;
        }
      },
    });
  }
  return set;
}

// ── Main entry ──────────────────────────────────────────────────────

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

  // Load skills + MCP tools + knowledge in parallel.
  const [skillsBlock, mcpLoad, knowledgeBlock] = await Promise.all([
    loadSkillsForAgent(agentId),
    loadMcpToolsForAgent(agentId),
    loadKnowledgeContextForAgent(agentId, agent.systemPrompt + '\n' + agent.userPromptTemplate, context.variables),
  ]);

  const baseSystem = renderTemplate(agent.systemPrompt, context.variables);
  const renderedUser = renderTemplate(agent.userPromptTemplate, context.variables);
  const renderedSystem = [baseSystem, skillsBlock, knowledgeBlock].filter(Boolean).join('\n\n');

  const toolCallLog: AgentToolCall[] = [];
  const toolSet = buildToolSet(mcpLoad.tools, toolCallLog);
  const hasTools = mcpLoad.tools.length > 0;

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
        attachedSkills: skillsBlock ? true : false,
        attachedToolCount: mcpLoad.tools.length,
        toolLoadFailures: mcpLoad.failures,
      }),
    })
    .returning();

  try {
    let researchTokens = 0;
    let finalContext = renderedUser;

    // Stage A: tool-use loop (if any tools attached)
    if (hasTools) {
      const research = await generateText({
        model: languageModel,
        system: renderedSystem || undefined,
        prompt:
          `${renderedUser}\n\n` +
          `You have access to tools. Use them as needed to gather information ` +
          `before reaching a decision. When you have enough information, respond ` +
          `with a brief summary of your findings — a separate step will commit ` +
          `your final decision.`,
        tools: toolSet,
        stopWhen: ({ steps }) => steps.length >= (agent.maxTurns ?? 5),
        temperature: modelParams.temperature,
        maxOutputTokens: modelParams.maxTokens,
        topP: modelParams.topP,
      });
      researchTokens = research.usage?.totalTokens ?? 0;
      finalContext =
        `Original task:\n${renderedUser}\n\n` +
        `Research notes (from tool-use loop):\n${research.text}`;
    }

    // Stage B: forced structured decision
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
      prompt: finalContext,
      temperature: modelParams.temperature,
      maxOutputTokens: modelParams.maxTokens,
      topP: modelParams.topP,
    });

    const tokensUsed = (usage?.totalTokens ?? 0) + researchTokens;

    await db
      .update(agentRuns)
      .set({
        status: 'completed',
        decision: object.decision,
        reasoning: object.reasoning,
        tokensUsed,
        toolCallsJson: toolCallLog.length ? JSON.stringify(toolCallLog) : null,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, run.id));

    return {
      runId: run.id,
      decision: object.decision,
      reasoning: object.reasoning,
      tokensUsed,
      toolCalls: toolCallLog,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(agentRuns)
      .set({
        status: 'failed',
        errorMessage: message,
        toolCallsJson: toolCallLog.length ? JSON.stringify(toolCallLog) : null,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, run.id));
    throw new AgentRuntimeError(`Agent ${agentId} failed: ${message}`, err);
  }
}
