# Phase 3: Adapter Seam, Tenancy & Notifications Proving Ground - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 3-Adapter Seam, Tenancy & Notifications Proving Ground
**Areas discussed:** Project axis & provider boundary, Notifications inbox UX, Webhooks management UX, Mutation & error UX (hook shape)

> Pre-discussion: located the Farsight monorepo at `~/Projects/farsight-platform` and verified the `@farsight/sdk` + `@farsight/contracts` shapes by direct source inspection — resolving the phase's flagged #1 research blocker ("what does `@farsight/contracts` export?"). All four areas were resolved on the recommended options.

---

## Project axis & provider boundary

| Question | Options | Selected |
|----------|---------|----------|
| Tenant resolution | Org from Clerk, project from prop ✓ / Both passed as props / Library owns both | Org from Clerk, project from prop |
| Project required? | Optional / nullable ✓ / Required to mount | Optional / nullable |
| Org switch behavior | Hard remount + namespaced keys ✓ / Namespaced keys only | Hard remount + namespaced keys |

**Notes:** Aligns with PROJECT.md "app shell / routing / nav ownership = consumer's." Project axis is exercised by webhooks (org-slug + project-slug paths); notifications/prefs are user-scoped, so project must be optional.

---

## Notifications inbox UX

| Question | Options | Selected |
|----------|---------|----------|
| Form factor | Bell popover + full-page inbox ✓ / Inbox only / Bell only | Bell popover + full-page inbox |
| Read model | Mark-read on click + Mark all read ✓ / Explicit toggle only / Auto-read when seen | Mark-read on click + Mark all read |
| Polling | 10s + pause-when-hidden + injectable ✓ / 10s always-on / Manual + on-focus | 10s + pause-when-hidden + injectable |
| Item render | Severity icon+color from tokens, href consumer-wired, flat ✓ / Group by category / Text-only | Severity icon+color, href consumer-wired, flat |

**Notes:** Contract dictates 10s polling, cursor pagination, unreadCount, flat severity/category/href shape. (User asked to re-present this area's questions once; same selections confirmed.)

---

## Webhooks management UX

| Question | Options | Selected |
|----------|---------|----------|
| Secret reveal | Copy-once modal + warning, then mask ✓ / Inline row reveal | Copy-once modal + warning |
| Destructive confirm | Delete + rotate-secret ✓ / Delete only / None | Delete + rotate-secret |
| Event types | Tag/chip input + glob suggestions ✓ / Plain text field / Fixed checkbox catalog | Tag/chip input + glob suggestions |
| Health display | Derived status badge + detail ✓ / Raw fields / Hide | Derived status badge + detail |

**Notes:** Contract returns `signingSecret` once on create/rotate (prefix only afterward); exposes no event-type enum (free-form globs); carries failureCount/lastSuccessAt/lastFailureAt.

---

## Mutation & error UX (hook shape)

| Question | Options | Selected |
|----------|---------|----------|
| Optimistic scope | Optimistic for read-state & toggles; confirmed for create/rotate/delete ✓ / All optimistic / None | Optimistic for read-state & toggles; confirmed for create/rotate/delete |
| Error surfacing | Queries→ErrorState; mutations→surface toast + provider onError ✓ / All via consumer onError / Auto-toast in hooks | Queries→ErrorState; mutations→surface toast + provider onError |
| Code mapping | Provider handler for cross-cutting + per-hook field errors ✓ / Per-hook only / Message text only | Provider handler + per-hook field errors |
| Typed error shape | Thin typed wrapper + helpers over SDK error ✓ / Pass SDK errors raw | Thin typed wrapper + helpers |

**Notes:** Honors PROJECT.md "no auto-toast in generic hooks." Branch on RFC-7807 `code` (not message). SDK already throws `ApiClientError {status, code, body}` + `ApiClientSchemaError`.

## Claude's Discretion

- `<FarsightProvider>` baseUrl wiring + QueryClient default options.
- File/dir layout for provider/client/hooks/errors/surfaces; barrel-export registration.
- `@farsight/sdk` + `@farsight/contracts` as peer vs dependency of `@farsight/ui`.
- Multi-org cache-bleed test strategy.
- `severity → icon` and `code → copy` tables.

## Deferred Ideas

- Controlled presentational `<ProjectSwitcher>` (Phase 4).
- Webhook test/ping — not in contract (out of scope).
- Notification delete/dismiss — not in contract (out of scope).
- SSE/real-time notifications — backend defers; using 10s polling.
- Spec-mocking — not needed (notifications/webhooks live); Phase-4 concern.
- `org_role` kept as open string, not hard-enumed.

### Reconciliations carried to planner
- R-01: no org header (JWT claim + path slugs).
- R-02: discriminate on `code`, not a `type` URI.
- R-03: tenant context needs `projectSlug`, not just `projectId`.
