# Pipelines Connections Foundation — Sprint 1 spec

Status: **spec / fallback-ready**  
Last updated: 2026-05-14  
Owners: Scott + Helm agent  
Tracking commit: TBD on first implementation commit

---

## 1. Goal

Ship a first-class **Connections layer** for pipeline nodes so credentials and integration settings are reusable across pipelines and nodes.

Once this lands, source/enrichment nodes should bind to a saved connection (`connectionId`) instead of raw env var names in node config.

Core target UX:

1. User creates **My Fireflies account** once in `/connections`
2. User drops `fireflies_poll` on any pipeline
3. Inspector shows a dropdown of Fireflies connections
4. User selects one and runs

---

## 2. Why now (architectural payoff)

Without this layer, each new integration node (HubSpot, Gmail, Postgres, Notion, etc.) repeats one-off credential handling.

With this layer:

- Credential storage/security is centralized
- Node schemas become cleaner (`connectionId` + node-specific params)
- New node velocity increases (shared auth plumbing)
- UI becomes predictable across all providers

This is the highest-leverage prerequisite for the broader node catalog.

---

## 3. Scope (Sprint 1)

### In scope

1. `connections` data model + migration
2. Encryption/decryption utility for secret payloads
3. Connections service layer (`lib/connections.ts`)
4. Connections CRUD + test endpoints
5. `/connections` management page
6. Pipeline inspector dropdown integration for relevant nodes
7. Refactor these nodes to use `connectionId`:
   - `fireflies_poll`
   - `classify_meeting`
   - `extract_entities`
   - `embed`

### Out of scope

- OAuth dance for HubSpot/Gmail/etc. (Sprint 2+)
- Secret rotation automation
- Shared/team-level connections (Sprint 1 is user-scoped)
- Generic connection use for campaign workflows (this sprint is pipeline-focused)

---

## 4. Data model contract

Add a new table in `db/schema.ts`:

```ts
export const connections = pgTable('connections', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default(''),

  // provider family used for filtering in node inspectors
  kind: text('kind').notNull(),
  // stable machine code, e.g. 'fireflies', 'openai'
  provider: text('provider').notNull(),

  // user-visible label: "My Fireflies Prod", "OpenAI Team Key"
  name: text('name').notNull(),
  description: text('description'),

  // encrypted JSON blob (api key + optional metadata)
  secretCiphertext: text('secret_ciphertext').notNull(),

  // non-secret config useful for UI/runtime routing
  configJson: jsonb('config_json').notNull().default(sql`'{}'::jsonb`),

  // active | revoked
  status: text('status').notNull().default('active'),

  // diagnostics
  lastTestedAt: timestamp('last_tested_at'),
  lastTestStatus: text('last_test_status'), // success | failed
  lastTestError: text('last_test_error'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  index('connections_user_id_idx').on(t.userId),
  index('connections_kind_idx').on(t.kind),
  index('connections_provider_idx').on(t.provider),
  index('connections_status_idx').on(t.status),
  uniqueIndex('connections_user_name_unique').on(t.userId, t.name),
]);
```

### Kind/provider rules (Sprint 1)

- `kind='fireflies'`, `provider='fireflies'`
- `kind='openai'`, `provider='openai'`

Future providers can extend this without changing node wiring semantics.

---

## 5. Secret encryption contract

Create `lib/crypto/connections-crypto.ts` with AES-256-GCM envelope encryption.

### Env var

- `CONNECTIONS_ENCRYPTION_KEY`
- format: base64-encoded 32-byte key

### Payload format

Store `secret_ciphertext` as JSON string:

```json
{
  "v": 1,
  "alg": "aes-256-gcm",
  "iv": "base64",
  "ct": "base64",
  "tag": "base64"
}
```

### Runtime behavior

- Missing/invalid key => hard error on create/update/test/run
- Never log plaintext secrets
- Decrypt only inside trusted server paths (`lib/connections.ts`, node executors)

---

## 6. Connections service layer

Create `lib/connections.ts`:

```ts
export type ConnectionKind = 'fireflies' | 'openai';

export async function createConnection(input): Promise<Connection>
export async function updateConnection(id, userId, patch): Promise<Connection>
export async function revokeConnection(id, userId): Promise<void>
export async function listConnections(userId, filter?): Promise<Connection[]>
export async function getConnectionForRuntime(id, userId): Promise<ResolvedConnection>
export async function testConnection(id, userId): Promise<{ ok: boolean; error?: string }>
```

### `secretJson` shape (decrypted)

- Fireflies:
  ```json
  { "apiKey": "..." }
  ```
- OpenAI:
  ```json
  { "apiKey": "...", "baseUrl": "optional" }
  ```

### Test behavior

- Fireflies: lightweight GraphQL probe (`transcripts(limit:1){id}`)
- OpenAI: cheap chat completion or model list probe
- Persist `lastTestedAt`, `lastTestStatus`, `lastTestError`

---

## 7. API surface

Add route handlers under `app/api/connections/`.

### Endpoints

1. `GET /api/connections?kind=openai|fireflies`
   - returns caller-owned active connections
2. `POST /api/connections`
   - create connection
3. `PATCH /api/connections/:id`
   - update name/description/config/secret
4. `POST /api/connections/:id/test`
   - test and persist status
5. `POST /api/connections/:id/revoke`
   - soft-revoke (`status='revoked'`)

### Security

- Clerk auth required
- Strict ownership check (`connections.user_id === auth.userId`)
- Responses must never include decrypted secret

---

## 8. UI: `/connections` page

Add `app/connections/page.tsx` (+ client component if needed).

### Required UI features

- List cards/table showing:
  - Name
  - Kind/provider
  - Status
  - Last tested result/time
  - Updated at
- Create modal/form:
  - Kind selector (fireflies/openai)
  - Name
  - Description
  - Secret fields (masked)
- Row actions:
  - Test
  - Edit
  - Revoke

### UX requirements

- Clear pass/fail test feedback
- No plaintext secret re-display after save
- Fast filtering by kind

---

## 9. Node contract refactor (critical)

## 9.1 `fireflies_poll`

Current config uses `apiKeyEnv`. Replace with:

```ts
{
  connectionId: number;
  sinceCursor?: string;
  pageSize?: number;
  maxPages?: number;
  hostFilter?: string[];
  dryRun?: boolean;
}
```

Runtime:

- Resolve connection by `connectionId` + `ctx.userId`
- Assert `kind==='fireflies'`
- Use decrypted `apiKey`

## 9.2 `classify_meeting`, `extract_entities`, `embed`

Replace `openaiApiKeyEnv` with `connectionId`:

```ts
{
  connectionId: number;
  model?: string;
  ...
}
```

Runtime:

- Resolve connection by `connectionId` + `ctx.userId`
- Assert `kind==='openai'`
- Use decrypted OpenAI credentials (`apiKey`, optional `baseUrl`)

---

## 10. Pipeline inspector wiring

File: `app/pipelines/[id]/pipeline-detail-client.tsx`

### Required changes

- For `fireflies_poll`, replace env var input with **Fireflies connection dropdown**
- For OpenAI nodes (`classify_meeting`, `extract_entities`, `embed`), replace env var input with **OpenAI connection dropdown**
- Disable save/run if required `connectionId` is missing
- Show inline hint when no connections exist:
  - “No OpenAI connections found. Create one in /connections.”

### Source of options

- Fetch `/api/connections?kind=...`
- Filter `status='active'`

---

## 11. Back-compat + migration behavior

For existing node JSON configs that still contain env var fields:

- During load/edit, support temporary fallback read:
  - `connectionId` if present
  - else show “legacy env-var config detected; choose a connection to continue”
- On save, write only new `connectionId` schema

No runtime fallback to env vars after Sprint 1 completion.

---

## 12. Build phases (PR units)

### Phase 1 — Foundation primitives

1. Add `connections` schema in `db/schema.ts`
2. Create migration SQL + journal entry
3. Add `lib/crypto/connections-crypto.ts`
4. Add `lib/connections.ts`
5. Unit tests for encryption + service CRUD

### Phase 2 — API + UI

1. Add `/api/connections/*` routes
2. Build `/connections` page (list/create/edit/test/revoke)
3. Hook test status updates
4. Add API/UI tests

### Phase 3 — Node runtime refactor

1. Refactor `fireflies_poll` to `connectionId`
2. Refactor OpenAI nodes to `connectionId`
3. Remove env var dependency paths in those nodes
4. Add node executor tests covering wrong-kind / revoked / missing-ownership

### Phase 4 — Pipeline editor integration

1. Replace env var fields with connection dropdowns in inspector
2. Add missing-connection validation + UX hints
3. Manual smoke in `/pipelines`

---

## 13. Acceptance criteria (DoD)

1. User can create Fireflies and OpenAI connections in `/connections`
2. User can test connections and see status
3. `fireflies_poll` runs with selected Fireflies connection (no env var field)
4. `classify_meeting`, `extract_entities`, `embed` run with selected OpenAI connection
5. Pipeline inspector enforces required `connectionId`
6. No secret appears in logs/API responses/UI after save

---

## 14. Risks & mitigations

### Risk: encryption key misconfigured
- Mitigation: startup/runtime validation + explicit error messaging

### Risk: cross-tenant secret access
- Mitigation: mandatory `id + userId` lookup at every read path

### Risk: partial rollout breaks existing pipeline JSON
- Mitigation: temporary legacy detection UX + save-time migration to new schema

### Risk: connection revoked while pipeline is running
- Mitigation: resolve at executor runtime; fail node with explicit error

### Risk: provider-specific test calls are flaky
- Mitigation: treat tests as diagnostics only; runtime still authoritative

---

## 15. Future extensions (post-Sprint 1)

1. Add kinds/providers: HubSpot, Gmail, Postgres, Notion, Resend, Slack
2. OAuth-backed connection creation flows
3. Team-shared connections and RBAC
4. Key rotation / expiring credential warnings
5. Usage audit: which pipelines reference which connection

---

## 16. Rollback plan

If implementation attempt fails mid-flight:

1. Revert to this spec as source of truth
2. Re-open from Phase 1 with strict PR slices
3. Do not continue shipping new nodes that depend on ad-hoc env-var credential fields

This document is intended as the safe fallback blueprint.
