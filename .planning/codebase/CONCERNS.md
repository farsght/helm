# Concerns

**Analysis Date:** 2026-05-29

> Findings surfaced by codebase exploration. Security items are flagged for verification before remediation — treat each as "investigate and confirm," not a settled fact. File paths are exact at time of mapping.

## Security

> ⚠️ The single most load-bearing rule in this codebase is the **tenancy invariant**: every domain query must filter by `auth().userId`. The findings below are routes that appear to violate auth and/or tenancy scoping and should be audited first.

### Missing auth / tenancy scoping (highest priority)

| Route | Concern |
|-------|---------|
| `app/api/settings/accounts/route.ts` | Appears to lack `auth()` and `userId` scoping on `connectedAccounts` — could expose/modify other tenants' connected accounts (which hold encrypted SMTP creds). |
| `app/api/conversations/[id]/route.ts` | Appears to lack `auth()` — conversation reads not tenancy-scoped. |
| `app/api/analytics/cross-campaign/route.ts` | Appears to lack `auth()` and returns **all-tenant aggregate** analytics data. |
| `app/api/messages/ai-reply/route.ts`, `app/api/messages/ai-generate/route.ts` | Appears to lack `auth()` — unauthenticated callers can consume OpenAI quota (cost/DoS vector). |
| `app/api/templates/[id]/variants/[variantId]/route.ts` | Appears to lack `auth()` and ownership check on the variant. |

**Action:** Verify each against `lib`/`proxy.ts` (some may rely on middleware coverage), then add the standard guard + `eq(table.userId, userId)` scoping per `CONVENTIONS.md`.

### Webhook / cron hardening

- **`/api/webhooks/email`** — no Resend signature verification observed. A public endpoint accepting tracking events without verifying the sender can have open/click/reply data forged.
- **`/api/cron`** — `CRON_SECRET` check appears **optional / fail-open**: if the env var is unset in production, the endpoint may accept unauthenticated ticks. Should fail-closed.

### Credentials

- **Inngest signing key** was reportedly shared in chat during development — **rotate** if confirmed. Verify it is not committed anywhere in the repo.
- **`CONNECTIONS_ENCRYPTION_KEY` rotation is destructive** — there is no key versioning, so rotating the AES-256-GCM key orphans all previously-encrypted `connected_accounts` SMTP creds. (See Fragile Areas.)

### Dependencies

- **45 Dependabot alerts** reported (1 critical, 8 high). Review and triage `npm audit` / Dependabot before the next deploy.

## Tech Debt

- **13 pipeline node types are no-op pass-throughs** — `map_fields`, `filter`, `clean`, `deduplicate`, `enrich`, etc. are wired in the UI/engine but currently return input unchanged. Pipeline canvas implies more capability than is implemented.
- **LinkedIn sender is a stub** — `lib/linkedin-sender.ts` returns `{ success: true, stub: true }` and logs `[LINKEDIN STUB] ...`. All LinkedIn campaign node types are effectively non-functional/deferred (consistent with the deferred node list in `ARCHITECTURE.md`).
- **Campaign workflow error-handler is a TODO** — error-handler campaign invocation is a comment only; failures don't trigger the intended fallback path.
- **Campaign canvas edits not persisted** — connection creation, node drops, and node moves on the campaign canvas are not saved to the DB (3 TODO comments). Graph edits may be lost.
- **`updatedAt` not auto-updated at the DB level** — no DB trigger/default; several PUT routes don't set `updatedAt` manually, so timestamps drift / go stale.

## Known Bugs

- **3 failing tests in `__tests__/api/campaigns.test.ts`** — `/activate` validator returns 422 where tests expect 200/404 (tests not updated after validator change). Documented as known-failing in `CLAUDE.md`.
- **2 flaky tests in `__tests__/components/prospects-client.test.tsx`** — `waitFor` timing flakes.
- **16 meeting chunks dropped** due to transcript length during ingestion — long Fireflies transcripts exceed a limit and lose content.
- **Stale `pipeline_runs` stuck in `running`** — runs 5–8 and 17–21 never transitioned to a terminal state. No reconciliation/timeout sweeps them.
- **`pipeline_step_data` not cleaned up on Inngest failure** — when a pipeline Inngest function fails, staged step rows are orphaned in Neon, growing the staging table.

## Performance

- **`/api/cron` does a full-table scan + N+1 lookup** — scans all `pipeline_nodes` for cron triggers and then looks up each pipeline individually. Scales poorly as node count grows.
- **`/api/campaigns/[id]/execute` is synchronous and unbounded** — runs inline (not via Inngest), so a large prospect set can exceed request limits and lacks per-step retries.
- **`hooks/use-data-grid.ts` is 3273 lines** — single very large hook; hard to reason about, review, and test; likely re-render hot spot.
- **`ivfflat` vector index degrades after bulk inserts** — the `knowledge_chunks` ivfflat index needs periodic reindex/`ANALYZE` after large ingests to keep recall/latency healthy.
- **`meeting_chunks` has no vector index** — vector search over meeting chunks falls back to a sequential scan.

## Fragile Areas

- **Node `config_json` is untyped (`text`)** — both `workflow_nodes.config_json` and `pipeline_nodes.config_json` are raw text; `type` is free-form text. Drizzle won't catch shape drift. Every new node type needs a hand-rolled/Zod runtime validator in the engine + inspector (per `CLAUDE.md`).
- **`db/index.ts` placeholder behavior** — intentionally logs a warning and uses a placeholder connection string when `DATABASE_URL` is unset (so CI/static analysis works). Easy to mistake for a bug and "fix" by throwing — don't.
- **`next.config.ts` wrap order** — `withSentryConfig(withWorkflow(nextConfig), {...})` is load-bearing; swapping breaks workflow build transforms silently.
- **Workflow public route matcher** — removing `/.well-known/workflow(.*)` from `proxy.ts` causes every workflow resume to 401 and campaigns silently break.
- **`CONNECTIONS_ENCRYPTION_KEY` has no versioning** — rotation is destructive (orphans all encrypted SMTP creds). Introduce key-id/versioned envelopes before any rotation.
- **Fluid Compute dependency** — Vercel Fluid Compute must stay enabled or every durable-workflow resume cold-starts.
- **Two near-identical canvases** — campaign (`components/workflow/`) and pipeline (`components/canvas/`) share xyflow but have different schemas/validation/semantics. They must not be merged; changes to one can be mistakenly applied to the other.

## Recommended Triage Order

1. **Verify + fix the unauthenticated/un-scoped routes** (settings/accounts, conversations, cross-campaign analytics, ai-reply/ai-generate, template variants) — direct tenancy-invariant violations.
2. **Harden `/api/cron` (fail-closed) and `/api/webhooks/email` (signature verification).**
3. **Rotate the Inngest signing key** if it was exposed; confirm no secrets in repo.
4. **Triage the 45 Dependabot alerts** (start with the 1 critical + 8 high).
5. **Reconcile stale `pipeline_runs` and add `pipeline_step_data` cleanup** on Inngest failure.
6. Address tech-debt TODOs (canvas persistence, error-handler invocation) and performance hot spots as roadmap allows.

---

*Concerns analysis: 2026-05-29*
