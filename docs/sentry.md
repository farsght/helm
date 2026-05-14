# Sentry Setup — helm

Last updated: 2026-05-14

Quick reference for how Sentry is wired into this Next.js app and why certain things are (or aren't) connected.

---

## Current state

| Piece | Status | Notes |
|---|---|---|
| `@sentry/nextjs` SDK | ✅ Active | v10.53.1, all 3 runtimes (browser / node / edge) |
| `instrumentation-client.ts` | ✅ Active | Reads `NEXT_PUBLIC_SENTRY_DSN`; replay + console-logs integration |
| `sentry.server.config.ts` | ✅ Active | Reads `SENTRY_DSN`; `includeLocalVariables: true` |
| `sentry.edge.config.ts` | ✅ Active | Reads `SENTRY_DSN` |
| `instrumentation.ts` | ✅ Active | Runtime dispatcher + `onRequestError` |
| `app/global-error.tsx` | ✅ Active | App Router root error boundary |
| `proxy.ts` (Clerk middleware) | ✅ Patched | `/monitoring(.*)` added to public matcher for tunnel route |
| Source map upload | ✅ Active | `SENTRY_AUTH_TOKEN` in `.env.sentry-build-plugin` (gitignored) |
| `tunnelRoute: "/monitoring"` | ✅ Active | Ad-blocker bypass for client events |
| `widenClientFileUpload` | ✅ On | Wider source map coverage |
| `automaticVercelMonitors` | ✅ On | Cron job monitoring |
| Tracing | ✅ On | 100% in dev, 10% in prod (all 3 runtimes) |
| Session Replay | ✅ On | 10% all sessions / 100% error sessions |
| Logging | ✅ On | `enableLogs: true` + `consoleLoggingIntegration` everywhere |

**Sentry project:** `bitwage / helm` (org `bitwage`, project `4511387394572288`).

---

## Decisions

### Why one project (bitwage), not two
Init files used to hardcode a different DSN (`o1355568` / farsight-studio) while env vars pointed at `bitwage`. Resolved 2026-05-14 by switching all init files to read from `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` and updating `next.config.ts` `org` to `bitwage`. **Don't reintroduce hardcoded DSNs** — env-only.

### Why `/monitoring` is a public route in `proxy.ts`
`tunnelRoute: "/monitoring"` in `next.config.ts` makes the browser SDK POST events to `/monitoring/...` instead of `*.sentry.io`. Clerk's `auth.protect()` would block those POSTs and silently drop every client event. The matcher in `proxy.ts` includes `/monitoring(.*)` so it's authless. Don't remove it.

### Why `SENTRY_OTLP_TRACES_URL` is not wired up
This endpoint accepts OpenTelemetry trace data from non-Sentry SDKs. `@sentry/nextjs` already does tracing natively, so adding OTLP would be redundant (double-counted spans) or require ripping out native tracing in favor of `@vercel/otel` — net loss. **Wire this up only when a second service (Go/Python/etc.) ships and needs traces in the same Sentry project.** Until then, treat the env var as inert reference.

### Why `SENTRY_VERCEL_LOG_DRAIN_URL` matters
Forwards Vercel's *platform* logs (build events, function invocation logs, cold starts, edge runtime errors) into Sentry → Logs. Complements `Sentry.logger.*` / `console.*` (which only fire from inside our code). Configure via the **Sentry Vercel marketplace integration** (Sentry → Settings → Integrations → Vercel), not by hand-pasting the URL — the marketplace integration also handles release linking + auth token provisioning. Verify it's live at: Vercel → helm → Settings → Log Drains.

---

## Smoke test

`app/api/sentry-test/route.ts` exists temporarily:
- `GET /api/sentry-test` → emits `Sentry.logger.info` + `console.warn` → check Sentry → Logs
- `GET /api/sentry-test?throw=1` → throws server-side → check Sentry → Issues

**Delete the route once both pipelines verified.** It's not gated behind auth so leaving it in prod = anyone can trigger a noise error.

---

## Env vars

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `.env.local`, Vercel | Browser SDK target |
| `SENTRY_DSN` | `.env.local`, Vercel | Server + edge SDK target (falls back to `NEXT_PUBLIC_SENTRY_DSN`) |
| `SENTRY_AUTH_TOKEN` | `.env.sentry-build-plugin` (gitignored), Vercel | Source map upload at build time |
| `SENTRY_ORG` | `.env.local`, Vercel | CLI / build plugin org slug |
| `SENTRY_PROJECT` | `.env.local`, Vercel | CLI / build plugin project slug |
| `SENTRY_OTLP_TRACES_URL` | `.env.local` | **Not in use.** Reserved for future OTel-instrumented services. |
| `SENTRY_VERCEL_LOG_DRAIN_URL` | `.env.local` | **Not manually wired.** Sentry Vercel marketplace integration manages this. |

---

## How to log

```ts
import * as Sentry from "@sentry/nextjs";

// Structured logs (preferred for events you'll filter on)
Sentry.logger.info("CSV import completed", { dataset_id: 42, rows: 1500 });
Sentry.logger.warn("Rate limit approaching", { remaining: 5 });
Sentry.logger.error("Stripe webhook signature failed", { event_id });

// Plain console — also captured (consoleLoggingIntegration is on)
console.log("...");   // → Sentry Logs (level: log)
console.warn("...");  // → Sentry Logs (level: warn)
console.error("..."); // → Sentry Logs (level: error)

// Exceptions
Sentry.captureException(new Error("..."));
// — or just throw; route handlers auto-capture via onRequestError
```

---

## Pitfalls

1. **Don't hardcode DSN back into init files.** All three init files read from env now. Resist any "convenience" PR that inlines the DSN string.
2. **Don't remove `/monitoring(.*)` from `proxy.ts` public routes.** Tunnel route breaks otherwise — silent failure mode.
3. **Don't enable OTLP traces from inside this Next.js app.** Conflicts with native tracing.
4. **`sendDefaultPii: true` is on.** Ships IP + request headers. Fine for an internal sales tool; revisit if this app ever serves external customers.
5. **`SENTRY_AUTH_TOKEN` rotation breaks source map upload.** If stack traces suddenly show minified code in Sentry, check the build log for upload auth failures.
