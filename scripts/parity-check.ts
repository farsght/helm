/**
 * Parity-check script for the netrunner → Helm Phase 5 cutover gate.
 *
 * Compares every meeting present in BOTH databases (joined on fireflies_id)
 * across five dimensions:
 *   1. Dedicated columns  — meeting_class, meeting_category, meeting_subcategory, access, maturity
 *   2. Array fields       — brand, secondary_tags (set equality, order-insensitive)
 *   3. JSONB taxonomy     — taxonomy_json (Helm) vs taxonomy (netrunner) — deep equal
 *   4. Entity sets        — names+types via entities+entity_mentions (Helm) vs netrunner
 *   5. Chunk counts       — meeting_chunks rows per meeting
 *
 * Thresholds:
 *   ≥ 95% match on dedicated columns → PASS
 *   ≥ 90% match on JSONB taxonomy    → PASS
 *   Exit code 0 if both pass, 1 if either fails.
 *
 * Usage:
 *   DATABASE_URL=<helm_neon_url> NETRUNNER_NEON_URL=<nr_neon_url> npx tsx scripts/parity-check.ts
 *   (env vars may also be loaded from .env.local via the dotenv block below)
 *
 * The script is read-only: no writes to either database.
 * Safe to invoke daily (idempotent).
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Config ────────────────────────────────────────────────────────────────────

const HELM_URL = process.env.DATABASE_URL;
const NR_URL   = process.env.NETRUNNER_NEON_URL;

const THRESHOLD_COLUMNS  = 0.95; // 95% dedicated-column match required
const THRESHOLD_TAXONOMY = 0.90; // 90% JSONB taxonomy match required

// ── Types ─────────────────────────────────────────────────────────────────────

interface MeetingRow {
  fireflies_id:        string;
  meeting_class:       string | null;
  meeting_category:    string | null;
  meeting_subcategory: string | null;
  access:              string | null;
  maturity:            string | null;
  brand:               string[] | null;
  secondary_tags:      string[] | null;
  taxonomy_json:       unknown;
  chunk_count:         number;
  entity_set:          string; // JSON-serialised sorted array of "name::type"
}

interface DimResult {
  matches: number;
  total:   number;
  pct:     number;
}

interface MeetingFailure {
  fireflies_id: string;
  dims:         Record<string, boolean>;
  details:      Record<string, string>;
}

interface Report {
  runAt:         string;
  totalCompared: number;
  dims:          Record<string, DimResult>;
  failures:      MeetingFailure[];
  passColumns:   boolean;
  passTaxonomy:  boolean;
  exitCode:      number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sortedSet(arr: string[] | null): string[] {
  if (!arr || arr.length === 0) return [];
  return [...arr].sort();
}

function arrayEq(a: string[] | null, b: string[] | null): boolean {
  const sa = sortedSet(a);
  const sb = sortedSet(b);
  return JSON.stringify(sa) === JSON.stringify(sb);
}

function deepEq(a: unknown, b: unknown): boolean {
  // Normalise to a canonical JSON string for comparison.
  // Both sides may come back as a string or parsed object depending on the
  // Neon serverless driver's mode; handle both.
  function normalise(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'string') {
      try {
        return JSON.stringify(JSON.parse(v));
      } catch {
        return v;
      }
    }
    return JSON.stringify(v);
  }
  return normalise(a) === normalise(b);
}

function pct(matches: number, total: number): number {
  if (total === 0) return 1; // vacuously true — nothing to compare
  return matches / total;
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

// ── Database fetch ────────────────────────────────────────────────────────────

async function fetchHelmMeetings(sqlFn: ReturnType<typeof neon>): Promise<Map<string, MeetingRow>> {
  // Single query: meetings + chunk counts + entity sets via aggregation.
  const rows = await sqlFn`
    SELECT
      m.fireflies_id,
      m.meeting_class,
      m.meeting_category,
      m.meeting_subcategory,
      m.access,
      m.maturity,
      m.brand,
      m.secondary_tags,
      m.taxonomy_json,
      COALESCE(c.chunk_count, 0)   AS chunk_count,
      COALESCE(e.entity_set, '[]') AS entity_set
    FROM meetings m
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS chunk_count
      FROM   meeting_chunks mc
      WHERE  mc.meeting_id = m.id
    ) c ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(sub.tag ORDER BY sub.tag) #>> '{}' AS entity_set
      FROM (
        SELECT ent.name || '::' || ent.type AS tag
        FROM   entity_mentions em
        JOIN   entities ent ON ent.id = em.entity_id
        WHERE  em.meeting_id = m.id
      ) sub
    ) e ON true
    ORDER BY m.fireflies_id
  `;

  const map = new Map<string, MeetingRow>();
  for (const r of rows) {
    map.set(r.fireflies_id as string, {
      fireflies_id:        r.fireflies_id as string,
      meeting_class:       r.meeting_class as string | null,
      meeting_category:    r.meeting_category as string | null,
      meeting_subcategory: r.meeting_subcategory as string | null,
      access:              r.access as string | null,
      maturity:            r.maturity as string | null,
      brand:               r.brand as string[] | null,
      secondary_tags:      r.secondary_tags as string[] | null,
      taxonomy_json:       r.taxonomy_json,
      chunk_count:         Number(r.chunk_count),
      entity_set:          r.entity_set as string,
    });
  }
  return map;
}

async function fetchNetrunnerMeetings(sqlFn: ReturnType<typeof neon>): Promise<Map<string, MeetingRow>> {
  // Netrunner schema differences:
  //   • taxonomy column is called `taxonomy` (not taxonomy_json)
  //   • entities live in a different table structure — inspect what's available
  //   • entity mentions may not exist; fall back gracefully
  //
  // We discover the column names at runtime via information_schema to be safe.

  // First, probe the table structure.
  const cols = await sqlFn`
    SELECT column_name
    FROM   information_schema.columns
    WHERE  table_name = 'meetings'
    AND    table_schema = 'public'
    ORDER BY ordinal_position
  `;
  const colNames = new Set((cols as Array<{ column_name: string }>).map(c => c.column_name));

  // Taxonomy column name may differ
  const taxonomyCol = colNames.has('taxonomy_json') ? 'taxonomy_json'
                    : colNames.has('taxonomy')       ? 'taxonomy'
                    : null;

  if (!taxonomyCol) {
    throw new Error('Netrunner meetings table has neither taxonomy_json nor taxonomy column. Check connection.');
  }

  // Brand / secondary_tags may be arrays or JSONB — probe type
  const brandIsArray       = colNames.has('brand');
  const secTagsIsArray     = colNames.has('secondary_tags');

  // Check if entity tables exist
  const entityTablesResult = await sqlFn`
    SELECT table_name
    FROM   information_schema.tables
    WHERE  table_schema = 'public'
    AND    table_name IN ('entities', 'entity_mentions')
  `;
  const entityTables = new Set(
    (entityTablesResult as Array<{ table_name: string }>).map(r => r.table_name)
  );
  const hasEntityMentions = entityTables.has('entity_mentions') && entityTables.has('entities');

  // Build query dynamically
  const brandExpr       = brandIsArray   ? 'm.brand'        : 'ARRAY[]::text[]';
  const secTagsExpr     = secTagsIsArray ? 'm.secondary_tags': 'ARRAY[]::text[]';
  const taxonomyExpr    = taxonomyCol;

  let entityJoin: string;
  if (hasEntityMentions) {
    entityJoin = `
      LEFT JOIN LATERAL (
        SELECT json_agg(sub.tag ORDER BY sub.tag) #>> '{}' AS entity_set
        FROM (
          SELECT ent.name || '::' || ent.type AS tag
          FROM   entity_mentions em
          JOIN   entities ent ON ent.id = em.entity_id
          WHERE  em.meeting_id = m.id
        ) sub
      ) e ON true
    `;
  } else {
    entityJoin = '';
  }

  const entitySetExpr = hasEntityMentions ? "COALESCE(e.entity_set, '[]')" : "'[]'";

  // Check chunk table name
  const chunkTableResult = await sqlFn`
    SELECT table_name
    FROM   information_schema.tables
    WHERE  table_schema = 'public'
    AND    table_name IN ('meeting_chunks', 'meetingchunks', 'chunks')
  `;
  const chunkTables = (chunkTableResult as Array<{ table_name: string }>).map(r => r.table_name);
  const chunkTable  = chunkTables.length > 0 ? chunkTables[0] : null;

  const chunkJoin = chunkTable
    ? `LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS chunk_count
        FROM   ${chunkTable} mc
        WHERE  mc.meeting_id = m.id
      ) c ON true`
    : '';
  const chunkCountExpr = chunkTable ? 'COALESCE(c.chunk_count, 0)' : '0';

  // We have to use a tagged template literal — build via unsafe raw query
  // since column names come from a probe step we trust.
  const query = `
    SELECT
      m.fireflies_id,
      m.meeting_class,
      m.meeting_category,
      m.meeting_subcategory,
      m.access,
      m.maturity,
      ${brandExpr}       AS brand,
      ${secTagsExpr}     AS secondary_tags,
      m.${taxonomyExpr}  AS taxonomy_json,
      ${chunkCountExpr}  AS chunk_count,
      ${entitySetExpr}   AS entity_set
    FROM meetings m
    ${chunkJoin}
    ${entityJoin}
    ORDER BY m.fireflies_id
  `;

  // neon() tagged-template doesn't support dynamic SQL strings — use the
  // underlying query() method exposed on the neon HTTP driver.
  // Cast to any to access the non-tagged query interface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (sqlFn as any)(query);

  const map = new Map<string, MeetingRow>();
  for (const r of rows) {
    map.set(r.fireflies_id as string, {
      fireflies_id:        r.fireflies_id as string,
      meeting_class:       r.meeting_class as string | null,
      meeting_category:    r.meeting_category as string | null,
      meeting_subcategory: r.meeting_subcategory as string | null,
      access:              r.access as string | null,
      maturity:            r.maturity as string | null,
      brand:               r.brand as string[] | null,
      secondary_tags:      r.secondary_tags as string[] | null,
      taxonomy_json:       r.taxonomy_json,
      chunk_count:         Number(r.chunk_count),
      entity_set:          r.entity_set as string,
    });
  }
  return map;
}

// ── Comparison ────────────────────────────────────────────────────────────────

function compareMeetings(
  helmMap: Map<string, MeetingRow>,
  nrMap:   Map<string, MeetingRow>,
): Report {
  const runAt = new Date().toISOString();

  // Only compare meetings present in BOTH databases.
  const commonIds = [...helmMap.keys()].filter(id => nrMap.has(id));
  const total = commonIds.length;

  const dims: Record<string, { matches: number; total: number }> = {
    meeting_class:        { matches: 0, total },
    meeting_category:     { matches: 0, total },
    meeting_subcategory:  { matches: 0, total },
    access:               { matches: 0, total },
    maturity:             { matches: 0, total },
    brand:                { matches: 0, total },
    secondary_tags:       { matches: 0, total },
    taxonomy_json:        { matches: 0, total },
    entity_set:           { matches: 0, total },
    chunk_count:          { matches: 0, total },
  };

  const failures: MeetingFailure[] = [];

  for (const fid of commonIds) {
    const h = helmMap.get(fid)!;
    const n = nrMap.get(fid)!;

    const colMatches: Record<string, boolean> = {
      meeting_class:        h.meeting_class        === n.meeting_class,
      meeting_category:     h.meeting_category     === n.meeting_category,
      meeting_subcategory:  h.meeting_subcategory  === n.meeting_subcategory,
      access:               h.access               === n.access,
      maturity:             h.maturity             === n.maturity,
      brand:                arrayEq(h.brand,          n.brand),
      secondary_tags:       arrayEq(h.secondary_tags, n.secondary_tags),
      taxonomy_json:        deepEq(h.taxonomy_json,   n.taxonomy_json),
      entity_set:           h.entity_set           === n.entity_set,
      chunk_count:          h.chunk_count          === n.chunk_count,
    };

    let anyMismatch = false;
    for (const [dim, match] of Object.entries(colMatches)) {
      if (match) {
        dims[dim].matches++;
      } else {
        anyMismatch = true;
      }
    }

    if (anyMismatch) {
      const details: Record<string, string> = {};
      for (const [dim, match] of Object.entries(colMatches)) {
        if (!match) {
          const hv = dim === 'taxonomy_json' ? JSON.stringify(h[dim as keyof MeetingRow])
                   : dim === 'brand' || dim === 'secondary_tags' ? JSON.stringify((h[dim as keyof MeetingRow] as string[] | null) ?? [])
                   : dim === 'entity_set' ? h.entity_set
                   : dim === 'chunk_count' ? String(h.chunk_count)
                   : String((h as Record<string, unknown>)[dim] ?? '');
          const nv = dim === 'taxonomy_json' ? JSON.stringify(n[dim as keyof MeetingRow])
                   : dim === 'brand' || dim === 'secondary_tags' ? JSON.stringify((n[dim as keyof MeetingRow] as string[] | null) ?? [])
                   : dim === 'entity_set' ? n.entity_set
                   : dim === 'chunk_count' ? String(n.chunk_count)
                   : String((n as Record<string, unknown>)[dim] ?? '');
          details[dim] = `helm=${hv.substring(0, 120)} | nr=${nv.substring(0, 120)}`;
        }
      }
      failures.push({ fireflies_id: fid, dims: colMatches, details });
    }
  }

  // Compute summary dimension results
  const dimResults: Record<string, DimResult> = {};
  for (const [dim, { matches }] of Object.entries(dims)) {
    dimResults[dim] = { matches, total, pct: pct(matches, total) };
  }

  // Threshold evaluation
  const columnDims = ['meeting_class','meeting_category','meeting_subcategory','access','maturity'];
  const columnMatchTotal = columnDims.reduce((sum, d) => sum + dimResults[d].matches, 0);
  const columnComparisons = columnDims.length * total;
  const columnPct = pct(columnMatchTotal, columnComparisons);

  const taxonomyPct = dimResults['taxonomy_json'].pct;

  const passColumns  = columnPct  >= THRESHOLD_COLUMNS;
  const passTaxonomy = taxonomyPct >= THRESHOLD_TAXONOMY;
  const exitCode = (passColumns && passTaxonomy) ? 0 : 1;

  return {
    runAt,
    totalCompared: total,
    dims: dimResults,
    failures,
    passColumns,
    passTaxonomy,
    exitCode,
  };
}

// ── Report rendering ──────────────────────────────────────────────────────────

function renderMarkdown(report: Report): string {
  const { runAt, totalCompared, dims, failures, passColumns, passTaxonomy, exitCode } = report;

  const statusEmoji = exitCode === 0 ? '✅' : '❌';
  const lines: string[] = [];

  lines.push(`# Parity Check Report — ${runAt.slice(0, 10)}`);
  lines.push('');
  lines.push(`Run at: ${runAt}`);
  lines.push(`Total compared (in both DBs): **${totalCompared}**`);
  lines.push('');
  lines.push(`## Gate result: ${statusEmoji} ${exitCode === 0 ? 'PASS — cutover safe' : 'FAIL — do not cut over'}`);
  lines.push('');
  lines.push(`| Threshold | Required | Actual | Status |`);
  lines.push(`|-----------|----------|--------|--------|`);

  // Column aggregate
  const columnDims = ['meeting_class','meeting_category','meeting_subcategory','access','maturity'];
  const colMatchSum = columnDims.reduce((s, d) => s + dims[d].matches, 0);
  const colTotal    = columnDims.length * totalCompared;
  const colPct      = pct(colMatchSum, colTotal);
  lines.push(`| Dedicated columns (5-dim aggregate) | ≥ ${fmtPct(THRESHOLD_COLUMNS)} | ${fmtPct(colPct)} | ${passColumns ? '✅' : '❌'} |`);
  lines.push(`| JSONB taxonomy | ≥ ${fmtPct(THRESHOLD_TAXONOMY)} | ${fmtPct(dims['taxonomy_json'].pct)} | ${passTaxonomy ? '✅' : '❌'} |`);

  lines.push('');
  lines.push('## Per-dimension breakdown');
  lines.push('');
  lines.push(`| Dimension | Matches | Total | Match % |`);
  lines.push(`|-----------|---------|-------|---------|`);

  const dimOrder = [
    'meeting_class','meeting_category','meeting_subcategory','access','maturity',
    'brand','secondary_tags','taxonomy_json','entity_set','chunk_count',
  ];
  for (const dim of dimOrder) {
    const d = dims[dim];
    const flag = d.pct >= (dim === 'taxonomy_json' ? THRESHOLD_TAXONOMY : THRESHOLD_COLUMNS) ? '' : ' ⚠️';
    lines.push(`| \`${dim}\` | ${d.matches} | ${d.total} | ${fmtPct(d.pct)}${flag} |`);
  }

  if (failures.length > 0) {
    lines.push('');
    lines.push(`## Meetings with mismatches (${failures.length})`);
    lines.push('');
    for (const f of failures) {
      lines.push(`### \`${f.fireflies_id}\``);
      const failedDims = Object.entries(f.dims).filter(([, ok]) => !ok).map(([d]) => d);
      lines.push(`Failed dims: ${failedDims.map(d => `\`${d}\``).join(', ')}`);
      lines.push('');
      lines.push('| Dimension | Helm value | Netrunner value |');
      lines.push('|-----------|-----------|-----------------|');
      for (const [dim, detail] of Object.entries(f.details)) {
        const [hv, nv] = detail.split(' | nr=');
        const helmVal = (hv ?? '').replace('helm=', '');
        lines.push(`| \`${dim}\` | \`${helmVal.replace(/`/g, "'")}\` | \`${(nv ?? '').replace(/`/g, "'")}\` |`);
      }
      lines.push('');
    }
  } else {
    lines.push('');
    lines.push('## Meetings with mismatches');
    lines.push('');
    lines.push('_None — all compared meetings match on every dimension._');
  }

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!HELM_URL) {
    console.error('ERROR: DATABASE_URL is not set. Set it to the Helm Neon connection string.');
    process.exit(2);
  }
  if (!NR_URL) {
    console.error('ERROR: NETRUNNER_NEON_URL is not set. Set it to the netrunner Neon connection string.');
    process.exit(2);
  }

  console.log('Connecting to Helm database …');
  const helmSql = neon(HELM_URL);

  console.log('Connecting to netrunner database …');
  const nrSql = neon(NR_URL);

  console.log('Fetching Helm meetings …');
  const helmMap = await fetchHelmMeetings(helmSql);
  console.log(`  → ${helmMap.size} meetings`);

  console.log('Fetching netrunner meetings …');
  const nrMap = await fetchNetrunnerMeetings(nrSql);
  console.log(`  → ${nrMap.size} meetings`);

  const commonCount = [...helmMap.keys()].filter(id => nrMap.has(id)).length;
  console.log(`  → ${commonCount} in common (will be compared)`);

  if (commonCount === 0) {
    console.warn('WARNING: No meetings found in both databases. Nothing to compare.');
    console.warn('  Helm has', helmMap.size, 'meetings; netrunner has', nrMap.size, 'meetings.');
    process.exit(0);
  }

  console.log('Comparing …');
  const report = compareMeetings(helmMap, nrMap);

  const md = renderMarkdown(report);

  // Write to file
  const reportsDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'parity-reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const dateStr   = report.runAt.slice(0, 10);
  const reportPath = path.join(reportsDir, `${dateStr}.md`);
  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`\nReport written to: ${reportPath}`);

  // Emit to stdout
  console.log('\n' + md);

  process.exit(report.exitCode);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
