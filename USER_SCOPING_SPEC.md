# Schema Fix: Missing userId on Global Tables

**Assigned to:** Netrunner  
**Filed by:** farsight  
**Date:** 2026-05-13  
**Priority:** P0 — must land before any user data goes to production

---

## Problem

Three tables are missing `userId` and will leak data across users or behave incorrectly in a multi-user deployment:

| Table | Problem |
|---|---|
| `settings` | Global key-value store — all users share the same settings |
| `tags` | Tags are global — user A can see/use user B's tags |
| `messages` | No direct `userId` — ownership is only verifiable via a join through `prospects` |

---

## Fix 1: `settings` table — add `userId`

### Current schema
```ts
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),   // ← unique() breaks multi-user
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Updated schema
```ts
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  // unique per user — same key can exist for different users
  userKeyUnique: unique().on(t.userId, t.key),
}));
```

### Migration SQL
```sql
-- Remove old global unique constraint
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_unique;

-- Add userId column
ALTER TABLE settings ADD COLUMN user_id text NOT NULL DEFAULT '';

-- Add new compound unique constraint
ALTER TABLE settings ADD CONSTRAINT settings_user_key_unique UNIQUE (user_id, key);

-- Backfill: after adding real Clerk user IDs, clean up rows with empty user_id
```

### API routes to update
- `GET /api/settings` — filter by `userId` from Clerk session
- `PUT /api/settings` — scope to `userId`
- Any sub-routes (`/api/settings/general`, `/api/settings/ai`, etc.) — same pattern

---

## Fix 2: `tags` table — add `userId`

### Current schema
```ts
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
});
```

### Updated schema
```ts
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
}, (t) => ({
  // same tag name can exist for different users
  userNameUnique: unique().on(t.userId, t.name),
}));
```

### Migration SQL
```sql
ALTER TABLE tags ADD COLUMN user_id text NOT NULL DEFAULT '';
ALTER TABLE tags ADD CONSTRAINT tags_user_name_unique UNIQUE (user_id, name);
```

### API routes to update
- Any route that reads/writes tags must scope by `userId`
- When creating a tag in the workflow execute route, pass the campaign's `userId`

---

## Fix 3: `messages` table — add `userId`

### Current schema
```ts
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  // ... no userId
});
```

### Updated schema
```ts
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),       // ← add this
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  prospectId: integer('prospect_id').notNull().references(() => prospects.id, { onDelete: 'cascade' }),
  // ... rest unchanged
});
```

### Migration SQL
```sql
ALTER TABLE messages ADD COLUMN user_id text NOT NULL DEFAULT '';

-- Backfill from prospect owner (run once after adding column)
UPDATE messages m
SET user_id = p.user_id
FROM prospects p
WHERE m.prospect_id = p.id
  AND m.user_id = '';
```

### Why this matters
Without `userId` on messages, a direct `GET /api/messages/:id` has no way to verify ownership without a multi-table join. Adding `userId` directly makes authorization a simple `WHERE user_id = :clerkUserId` check.

---

## Run migrations

After updating `db/schema.ts`:

```bash
npm run db:generate   # generates the migration SQL
npm run db:migrate    # applies to Neon
```

---

## Checklist

- [ ] Update `db/schema.ts` with all three changes above
- [ ] Run `npm run db:generate` and verify migration SQL looks correct
- [ ] Run `npm run db:migrate` against Neon
- [ ] Update `/api/settings` routes to scope by `userId`
- [ ] Update `/api/tags` routes (if they exist) to scope by `userId`  
- [ ] Update `/api/messages` routes to write `userId` on insert
- [ ] Update workflow execute route: pass `userId` when inserting messages
- [ ] Verify `npm run build` exits 0 after changes

---

## Tables confirmed OK (no changes needed)

These tables don't have `userId` but are correctly scoped via FK cascade:

| Table | Ownership path |
|---|---|
| `workflowNodes` | → `campaigns.userId` |
| `workflowEdges` | → `campaigns.userId` |
| `campaignProspects` | → `campaigns.userId` + `prospects.userId` |
| `listMembers` | → `lists.userId` + `prospects.userId` |
| `templateVariants` | → `templates.userId` |
| `tasks` | → `campaignProspects` → `campaigns.userId` |
| `prospectTags` | → `prospects.userId` (tags will be fixed above) |
