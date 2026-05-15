/**
 * Emergency fix: create the connections table if it doesn't exist.
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/fix-connections-table.ts
 */
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Checking connections table...');
  try {
    await db.execute(sql`SELECT 1 FROM connections LIMIT 1`);
    console.log('✅ connections table already exists — no action needed.');
    return;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== '42P01') throw err; // not "relation does not exist" — bail
    console.log('❌ connections table missing — creating now...');
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "connections" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL DEFAULT '',
      "kind" text NOT NULL,
      "provider" text NOT NULL,
      "name" text NOT NULL,
      "description" text,
      "secret_ciphertext" text NOT NULL,
      "config_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "status" text NOT NULL DEFAULT 'active',
      "last_tested_at" timestamp,
      "last_test_status" text,
      "last_test_error" text,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "connections_user_id_idx" ON "connections" ("user_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "connections_kind_idx" ON "connections" ("kind")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "connections_provider_idx" ON "connections" ("provider")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "connections_status_idx" ON "connections" ("status")`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "connections_user_name_unique" ON "connections" ("user_id", "name")`);
  console.log('✅ connections table created successfully.');
}

main().catch((e) => { console.error(e); process.exit(1); });
