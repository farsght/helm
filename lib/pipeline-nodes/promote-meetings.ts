/**
 * `promote_meetings` — pipeline node executor (Phase 4).
 *
 * Upserts one row into the `meetings` table per input row, keyed on
 * fireflies_id (unique-indexed). Idempotent: re-running the pipeline
 * against the same Fireflies meeting updates the row in place rather
 * than creating a duplicate.
 *
 * Input row shape (the union of fields produced by fireflies_poll,
 * classify_meeting, and extract_entities):
 *   - fireflies_id (required)
 *   - slug, title, meeting_date (required)
 *   - host_email, attendees, duration_min, transcript/summary paths
 *   - meeting_class, meeting_category, meeting_subcategory
 *   - access, maturity, brand[], secondary_tags[]
 *   - taxonomy (object — flattened into taxonomy_json)
 *
 * Output rows are the input rows enriched with `meeting_db_id` (the
 * primary key of the inserted/updated meetings row). Downstream nodes
 * like `promote_chunks` use this to set FKs without a second lookup.
 */

import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { meetings } from '@/db/schema';
import type { NodeExecutor, Row } from '../pipeline-engine-types';

export const promoteMeetingsConfigSchema = z.object({
  /** Set workflow column on insert (default 'unprocessed'). */
  workflowOnInsert: z.string().default('unprocessed'),
  /** Whether to bump workflow → 'classified' if classification ran. */
  markClassified: z.boolean().default(true),
});

export type PromoteMeetingsConfig = z.infer<typeof promoteMeetingsConfigSchema>;

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.filter((x): x is string => typeof x === 'string');
}
function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function asDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export const promoteMeetings: NodeExecutor = async (rawConfig, inputRows, node, ctx) => {
  const cfg = promoteMeetingsConfigSchema.parse(rawConfig);
  const out: Row[] = [];

  for (const row of inputRows) {
    const fireflies_id = asString(row.fireflies_id);
    const slug = asString(row.slug);
    const title = asString(row.title);
    // Accept both `meeting_date` and `date` (fireflies_poll emits `date`)
    const meeting_date = asDate(row.meeting_date) ?? asDate(row.date);

    if (!fireflies_id || !slug || !title || !meeting_date) {
      ctx.rowsErrored += 1;
      ctx.log.push({
        nodeId: node.id,
        message: `promote_meetings: row missing required field(s) fireflies_id/slug/title/meeting_date — skipped`,
        level: 'warn',
      });
      out.push({ ...row, promote_meetings_error: 'missing_required_fields' });
      continue;
    }

    // Build the value object. Drizzle ignores `undefined` properties on
    // insert, so we only set fields we have.
    const meetingClass = asString(row.meeting_class);
    const meetingCategory = asString(row.meeting_category);
    const meetingSubcategory = asString(row.meeting_subcategory);
    const workflow = cfg.markClassified && meetingClass ? 'classified' : cfg.workflowOnInsert;

    const taxonomyJson = (row.taxonomy && typeof row.taxonomy === 'object') ? row.taxonomy : null;

    const insertValues = {
      userId: ctx.userId,
      firefliesId: fireflies_id,
      slug,
      title,
      meetingDate: meeting_date,
      // duration_min is integer in the DB; Fireflies returns floats → round.
      durationMin: asNumber(row.duration_min) !== null ? Math.round(asNumber(row.duration_min)!) : null,
      hostEmail: asString(row.host_email),
      attendeesJson: row.attendees ?? null,
      rawTranscriptPath: asString(row.raw_transcript_path),
      rawSummaryPath: asString(row.raw_summary_path),
      meetingClass,
      meetingCategory,
      meetingSubcategory,
      workflow,
      access: asString(row.access),
      maturity: asString(row.maturity),
      brand: asStringArray(row.brand),
      secondaryTags: asStringArray(row.secondary_tags),
      taxonomyJson: taxonomyJson as Record<string, unknown> | null,
      enrichmentClassified: meetingClass !== null,
      enrichmentEntitiesExtracted: row.entities !== undefined,
      updatedAt: new Date(),
    };

    try {
      // Upsert by fireflies_id (unique index). On conflict, update the
      // mutable taxonomy/enrichment fields but preserve created_at.
      const [persisted] = await db
        .insert(meetings)
        .values(insertValues)
        .onConflictDoUpdate({
          target: meetings.firefliesId,
          set: {
            slug: insertValues.slug,
            title: insertValues.title,
            meetingDate: insertValues.meetingDate,
            durationMin: insertValues.durationMin,
            hostEmail: insertValues.hostEmail,
            attendeesJson: insertValues.attendeesJson,
            rawTranscriptPath: insertValues.rawTranscriptPath,
            rawSummaryPath: insertValues.rawSummaryPath,
            meetingClass: insertValues.meetingClass,
            meetingCategory: insertValues.meetingCategory,
            meetingSubcategory: insertValues.meetingSubcategory,
            workflow: insertValues.workflow,
            access: insertValues.access,
            maturity: insertValues.maturity,
            brand: insertValues.brand,
            secondaryTags: insertValues.secondaryTags,
            taxonomyJson: insertValues.taxonomyJson,
            enrichmentClassified: insertValues.enrichmentClassified,
            enrichmentEntitiesExtracted: insertValues.enrichmentEntitiesExtracted,
            updatedAt: insertValues.updatedAt,
          },
        })
        .returning({ id: meetings.id });

      out.push({ ...row, meeting_db_id: persisted!.id });
    } catch (err) {
      ctx.rowsErrored += 1;
      const msg = err instanceof Error ? err.message : 'unknown error';
      ctx.log.push({
        nodeId: node.id,
        message: `promote_meetings: upsert failed for fireflies_id=${fireflies_id}: ${msg}`,
        level: 'error',
      });
      out.push({ ...row, promote_meetings_error: msg });
    }
  }

  ctx.log.push({
    nodeId: node.id,
    message: `promote_meetings: upserted ${out.filter((r) => r.meeting_db_id !== undefined).length}/${inputRows.length} meetings`,
    level: 'info',
  });
  // Suppress unused-import warning — sql is exported for future raw-SQL needs.
  void sql;
  return out;
};
