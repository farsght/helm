/**
 * `promote_entities` — pipeline node executor (Phase 4).
 *
 * Fan-in node: each input row carries an `entities` object (output of
 * extract_entities) plus the parent meeting's fireflies_id. We:
 *
 *   1. Look up meeting_db_id by fireflies_id (passed through promote_meetings
 *      or resolved here from the meetings table).
 *   2. Upsert each entity by (user_id, name, type) into `entities`.
 *   3. Upsert (entity_id, meeting_id) into `entity_mentions`, bumping
 *      mention_count if the row already exists.
 *
 * Output rows are the input rows unchanged (this node is a "side effect"
 * sink — entities aren't useful as flowing data downstream).
 *
 * Entity-type mapping from extract_entities arrays:
 *   people     → type='person'
 *   companies  → type='company'
 *   products   → type='product'
 *   features   → type='feature'  (kept distinct so we can filter later)
 *
 * partner_type is preserved on the company entity as metadata_json.partner_type
 * (only when meeting is NOT internal — extract_entities already enforces this).
 */

import { z } from 'zod';
import { sql, and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { entities, entityMentions, meetings } from '@/db/schema';
import type { NodeExecutor, Row } from '../pipeline-engine-types';

export const promoteEntitiesConfigSchema = z.object({
  /** If true, also promote 'features' (default: false — features are noisy v1). */
  includeFeatures: z.boolean().default(false),
});
export type PromoteEntitiesConfig = z.infer<typeof promoteEntitiesConfigSchema>;

interface EntityRecord {
  name: string;
  type: 'person' | 'company' | 'product' | 'feature';
  partnerType?: string;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

async function resolveMeetingId(row: Row): Promise<number | null> {
  if (typeof row.meeting_db_id === 'number') return row.meeting_db_id;
  const firefliesId = asString(row.fireflies_id) ?? asString(row.parent_fireflies_id);
  if (!firefliesId) return null;
  const [m] = await db.select({ id: meetings.id }).from(meetings).where(eq(meetings.firefliesId, firefliesId));
  return m?.id ?? null;
}

export const promoteEntities: NodeExecutor = async (rawConfig, inputRows, node, ctx) => {
  const cfg = promoteEntitiesConfigSchema.parse(rawConfig);
  let totalEntities = 0;
  let totalMentions = 0;
  let skippedRows = 0;

  for (const row of inputRows) {
    const e = row.entities as Record<string, unknown> | undefined;
    if (!e || typeof e !== 'object') {
      skippedRows += 1;
      continue;
    }

    const meetingId = await resolveMeetingId(row);
    if (meetingId === null) {
      ctx.rowsErrored += 1;
      ctx.log.push({
        nodeId: node.id,
        message: `promote_entities: could not resolve meeting_id for row (fireflies_id=${row.fireflies_id ?? row.parent_fireflies_id ?? 'unknown'})`,
        level: 'warn',
      });
      continue;
    }

    const partnerType = typeof e.partner_type === 'string' && e.partner_type !== 'none' ? e.partner_type : undefined;

    const records: EntityRecord[] = [];
    if (Array.isArray(e.people)) for (const n of e.people) if (typeof n === 'string' && n) records.push({ name: n, type: 'person' });
    if (Array.isArray(e.companies)) for (const n of e.companies) if (typeof n === 'string' && n) records.push({ name: n, type: 'company', partnerType });
    if (Array.isArray(e.products)) for (const n of e.products) if (typeof n === 'string' && n) records.push({ name: n, type: 'product' });
    if (cfg.includeFeatures && Array.isArray(e.features)) for (const n of e.features) if (typeof n === 'string' && n) records.push({ name: n, type: 'feature' });

    for (const rec of records) {
      try {
        const metadata = rec.partnerType ? { partner_type: rec.partnerType } : null;
        // Upsert entity by (user_id, name, type)
        const [persisted] = await db
          .insert(entities)
          .values({
            userId: ctx.userId,
            name: rec.name,
            type: rec.type,
            metadataJson: metadata,
          })
          .onConflictDoUpdate({
            target: [entities.userId, entities.name, entities.type],
            // Merge metadata if we have new partner_type info; otherwise no-op update.
            set: metadata ? { metadataJson: metadata } : { name: sql`${entities.name}` },
          })
          .returning({ id: entities.id });
        totalEntities += 1;

        // Upsert entity_mention by (entity_id, meeting_id), bumping count.
        await db
          .insert(entityMentions)
          .values({ entityId: persisted!.id, meetingId, mentionCount: 1 })
          .onConflictDoUpdate({
            target: [entityMentions.entityId, entityMentions.meetingId],
            set: { mentionCount: sql`${entityMentions.mentionCount} + 1` },
          });
        totalMentions += 1;
      } catch (err) {
        ctx.rowsErrored += 1;
        const msg = err instanceof Error ? err.message : 'unknown error';
        ctx.log.push({
          nodeId: node.id,
          message: `promote_entities: upsert failed for ${rec.type}/${rec.name}: ${msg}`,
          level: 'error',
        });
      }
    }
  }

  ctx.log.push({
    nodeId: node.id,
    message: `promote_entities: upserted ${totalEntities} entities + ${totalMentions} mentions across ${inputRows.length - skippedRows} rows (${skippedRows} skipped — no entities object)`,
    level: 'info',
  });
  // Pass through unchanged — entities are a side-effect sink.
  return inputRows;
};

// `and` is imported for future use (filtered upserts); silence unused warning.
void and;
