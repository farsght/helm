/**
 * MCP HTTP client — minimal JSON-RPC over HTTP+SSE
 *
 * The Model Context Protocol (MCP) defines a JSON-RPC 2.0 interface for
 * exposing tools (and resources, prompts) to LLMs. This client speaks the
 * "Streamable HTTP" transport variant — POST a JSON-RPC request, receive
 * either a JSON response or an SSE stream of responses.
 *
 * Spec: https://spec.modelcontextprotocol.io/specification/basic/transports/
 *
 * v1 scope:
 *   - listTools()  — fetch the server's tool list
 *   - callTool()   — invoke a tool by name with arguments
 *   - ping()       — health check, returns true on success
 *
 * Deferred:
 *   - resources/* (knowledge surfaces — we'll handle these via our own
 *     RAG layer in Tier 2)
 *   - prompts/*    (server-supplied prompt templates — not needed yet)
 *   - sampling/*   (server-initiated LLM calls — security-sensitive)
 *   - stdio transport (Tier 4+ — needs subprocess management)
 */

/** JSON-RPC 2.0 envelope. */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcSuccess<T = unknown> {
  jsonrpc: '2.0';
  id: number | string;
  result: T;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: number | string;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type JsonRpcResponse<T = unknown> = JsonRpcSuccess<T> | JsonRpcError;

/** Tool definition shape returned by `tools/list`. */
export interface McpTool {
  name: string;
  description?: string;
  /** JSON Schema for the tool's arguments. Passed straight to the LLM. */
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    [k: string]: unknown;
  };
}

/** Result shape for `tools/call`. */
export interface McpToolResult {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
    | { type: 'resource'; resource: { uri: string; mimeType?: string; text?: string } }
  >;
  isError?: boolean;
}

export class McpError extends Error {
  constructor(
    message: string,
    public code?: number,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'McpError';
  }
}

export interface McpClientOptions {
  url: string;
  headers?: Record<string, string>;
  /** Per-request timeout in ms. Default 30s. */
  timeoutMs?: number;
}

/**
 * Stateless MCP client — every call is its own POST. The protocol supports
 * stateful sessions (initialize + session id), but for our pattern (fire a
 * tool call, get a result, move on) statelessness is simpler and works
 * against every compliant server I've tested.
 *
 * If we later need server-pushed notifications (e.g. subscribed resources),
 * we'll add an EventSource-based session client alongside this one.
 */
export class McpHttpClient {
  private nextId = 1;

  constructor(private opts: McpClientOptions) {}

  private async rpc<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const req: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.nextId++,
      method,
      params,
    };

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.opts.timeoutMs ?? 30_000);

    let res: Response;
    try {
      res = await fetch(this.opts.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Per spec, client MUST advertise both — server may stream OR return JSON.
          Accept: 'application/json, text/event-stream',
          ...(this.opts.headers ?? {}),
        },
        body: JSON.stringify(req),
        signal: ac.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      throw new McpError(`MCP transport error: ${msg}`, undefined, err);
    }
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new McpError(`MCP HTTP ${res.status}: ${body.slice(0, 500)}`, res.status);
    }

    // Streamable HTTP transport: response can be JSON or SSE. We parse both.
    const ct = res.headers.get('content-type') ?? '';
    let envelope: JsonRpcResponse<T>;

    if (ct.includes('text/event-stream')) {
      // Read the SSE stream and pluck the first `message` event whose data
      // is a JsonRpcResponse matching our id. Anything else (notifications,
      // progress events) is ignored — they're future-scope.
      envelope = await parseSseFirstMatch<T>(res, req.id);
    } else {
      envelope = (await res.json()) as JsonRpcResponse<T>;
    }

    if ('error' in envelope) {
      throw new McpError(
        `MCP RPC error: ${envelope.error.message}`,
        envelope.error.code,
        envelope.error,
      );
    }
    return envelope.result;
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.rpc<{ tools: McpTool[] }>('tools/list');
    return result.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    return this.rpc<McpToolResult>('tools/call', { name, arguments: args });
  }

  async ping(): Promise<boolean> {
    // Many servers don't implement `ping`; fall back to `tools/list` which
    // every compliant server supports.
    try {
      await this.rpc('ping');
      return true;
    } catch (err) {
      if (err instanceof McpError && err.code === -32601) {
        // Method not found — try tools/list as a liveness probe.
        await this.listTools();
        return true;
      }
      throw err;
    }
  }
}

/**
 * Parse an SSE response and return the first JSON-RPC message matching `id`.
 * Throws if the stream closes without finding one.
 */
async function parseSseFirstMatch<T>(
  res: Response,
  id: number | string,
): Promise<JsonRpcResponse<T>> {
  if (!res.body) throw new McpError('SSE response had no body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by blank lines. Parse complete messages.
    let nl: number;
    while ((nl = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 2);
      const dataLines = raw
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart());
      if (dataLines.length === 0) continue;
      const dataStr = dataLines.join('\n');
      try {
        const parsed = JSON.parse(dataStr) as JsonRpcResponse<T>;
        if (parsed.id === id) {
          reader.cancel().catch(() => {});
          return parsed;
        }
      } catch {
        // ignore non-JSON keepalives, etc.
      }
    }
  }
  throw new McpError(`SSE stream closed without response for request id=${id}`);
}

/**
 * Substitute ${ENV_VAR} placeholders in header values. Used so the user
 * can put "Bearer ${HUBSPOT_TOKEN}" in the DB without leaking secrets.
 */
export function expandEnvVars(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = v.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => process.env[name] ?? '');
  }
  return out;
}
