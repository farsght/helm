/**
 * lib/connections.ts — Connections service layer (Sprint 1).
 *
 * All queries filter by userId — never expose another user's record.
 * Secrets are encrypted at rest via lib/crypto/connections-crypto.ts.
 * Decryption happens only inside this module and node executor helpers.
 */

import { db } from '@/db';
import { connections } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { encryptSecret, decryptSecret } from './crypto/connections-crypto';
import type { InferSelectModel } from 'drizzle-orm';

export type Connection = InferSelectModel<typeof connections>;

export type ConnectionKind = 'fireflies' | 'openai';

// ── Secret JSON shapes ────────────────────────────────────────────────

export interface FirefliesSecret {
  apiKey: string;
}

export interface OpenAISecret {
  apiKey: string;
  baseUrl?: string;
}

export type AnySecret = FirefliesSecret | OpenAISecret;

/** Decrypted view returned to executors — never serialized to client. */
export interface ResolvedConnection {
  id: number;
  userId: string;
  kind: ConnectionKind;
  provider: string;
  name: string;
  description: string | null;
  configJson: Record<string, unknown>;
  status: string;
  secret: AnySecret;
}

// ── CRUD ──────────────────────────────────────────────────────────────

export async function listConnections(
  userId: string,
  filter?: { kind?: string; status?: string },
): Promise<Omit<Connection, 'secretCiphertext'>[]> {
  let rows = await db.select().from(connections).where(eq(connections.userId, userId));

  if (filter?.kind) rows = rows.filter((r) => r.kind === filter.kind);
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status);

  // Strip encrypted blob before returning
  return rows.map(({ secretCiphertext: _s, ...rest }) => rest);
}

export async function getConnection(
  id: number,
  userId: string,
): Promise<Omit<Connection, 'secretCiphertext'> | null> {
  const rows = await db
    .select()
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)));
  if (!rows[0]) return null;
  const { secretCiphertext: _s, ...rest } = rows[0];
  return rest;
}

export async function createConnection(input: {
  userId: string;
  kind: ConnectionKind;
  provider: string;
  name: string;
  description?: string;
  secret: AnySecret;
  config?: Record<string, unknown>;
}): Promise<Omit<Connection, 'secretCiphertext'>> {
  const secretCiphertext = encryptSecret(JSON.stringify(input.secret));

  const rows = await db
    .insert(connections)
    .values({
      userId: input.userId,
      kind: input.kind,
      provider: input.provider,
      name: input.name,
      description: input.description ?? null,
      secretCiphertext,
      configJson: input.config ?? {},
      status: 'active',
    })
    .returning();

  if (!rows[0]) throw new Error('Failed to create connection');
  const { secretCiphertext: _s, ...rest } = rows[0];
  return rest;
}

export async function updateConnection(
  id: number,
  userId: string,
  patch: {
    name?: string;
    description?: string;
    config?: Record<string, unknown>;
    secret?: AnySecret;
  },
): Promise<Omit<Connection, 'secretCiphertext'>> {
  const current = await db
    .select()
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)));

  if (!current[0]) throw new Error(`Connection ${id} not found for user`);
  if (current[0].status === 'revoked') throw new Error(`Connection ${id} is revoked`);

  const values: Partial<typeof connections.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.description !== undefined) values.description = patch.description;
  if (patch.config !== undefined) values.configJson = patch.config;
  if (patch.secret !== undefined) {
    values.secretCiphertext = encryptSecret(JSON.stringify(patch.secret));
  }

  const rows = await db
    .update(connections)
    .set(values)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)))
    .returning();

  if (!rows[0]) throw new Error('Failed to update connection');
  const { secretCiphertext: _s, ...rest } = rows[0];
  return rest;
}

export async function revokeConnection(id: number, userId: string): Promise<void> {
  const rows = await db
    .select({ id: connections.id })
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)));

  if (!rows[0]) throw new Error(`Connection ${id} not found for user`);

  await db
    .update(connections)
    .set({ status: 'revoked', updatedAt: new Date() })
    .where(and(eq(connections.id, id), eq(connections.userId, userId)));
}

/**
 * Resolve a connection for node executor use.
 * Asserts ownership, active status, and (optionally) expected kind.
 * Returns decrypted secret — caller must not serialize this to client/logs.
 */
export async function getConnectionForRuntime(
  id: number,
  userId: string,
  expectedKind?: ConnectionKind,
): Promise<ResolvedConnection> {
  const rows = await db
    .select()
    .from(connections)
    .where(and(eq(connections.id, id), eq(connections.userId, userId)));

  const conn = rows[0];
  if (!conn) throw new Error(`Connection ${id} not found for user`);
  if (conn.status !== 'active') {
    throw new Error(`Connection ${id} is ${conn.status} — only active connections can be used`);
  }
  if (expectedKind && conn.kind !== expectedKind) {
    throw new Error(
      `Connection ${id} has kind '${conn.kind}', expected '${expectedKind}'`,
    );
  }

  const secret = JSON.parse(decryptSecret(conn.secretCiphertext)) as AnySecret;

  return {
    id: conn.id,
    userId: conn.userId,
    kind: conn.kind as ConnectionKind,
    provider: conn.provider,
    name: conn.name,
    description: conn.description,
    configJson: (conn.configJson ?? {}) as Record<string, unknown>,
    status: conn.status,
    secret,
  };
}

// ── Liveness checks ───────────────────────────────────────────────────

async function checkFireflies(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: '{ transcripts(limit: 1) { id } }',
      }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = (await res.json()) as { data?: unknown; errors?: Array<{ message: string }> };
    if (json.errors?.length) {
      return { ok: false, error: json.errors[0]!.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function checkOpenAI(
  apiKey: string,
  baseUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = baseUrl ?? 'https://api.openai.com';
    const res = await fetch(`${base}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Run a real liveness check for the given connection, then persist
 * `lastTestedAt`, `lastTestStatus`, `lastTestError`.
 */
export async function testConnection(
  id: number,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  let conn: Awaited<ReturnType<typeof getConnectionForRuntime>> | null = null;

  try {
    conn = await getConnectionForRuntime(id, userId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await db
      .update(connections)
      .set({
        lastTestedAt: new Date(),
        lastTestStatus: 'failed',
        lastTestError: msg,
        updatedAt: new Date(),
      })
      .where(and(eq(connections.id, id), eq(connections.userId, userId)));
    return { ok: false, error: msg };
  }

  let result: { ok: boolean; error?: string };

  switch (conn.kind) {
    case 'fireflies': {
      const secret = conn.secret as FirefliesSecret;
      result = await checkFireflies(secret.apiKey);
      break;
    }
    case 'openai': {
      const secret = conn.secret as OpenAISecret;
      result = await checkOpenAI(secret.apiKey, secret.baseUrl);
      break;
    }
    default:
      result = { ok: true }; // unknown kind — no-op probe
  }

  await db
    .update(connections)
    .set({
      lastTestedAt: new Date(),
      lastTestStatus: result.ok ? 'success' : 'failed',
      lastTestError: result.ok ? null : (result.error ?? null),
      updatedAt: new Date(),
    })
    .where(and(eq(connections.id, id), eq(connections.userId, userId)));

  return result;
}
