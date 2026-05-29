# Testing

**Analysis Date:** 2026-05-29

## Framework

- **Runner:** [Vitest](https://vitest.dev) — `vitest run` (CI) / `vitest` (watch)
- **DOM environment:** `jsdom` (set globally in `vitest.config.ts`)
- **Assertion matchers:** Vitest built-ins + `@testing-library/jest-dom` (imported in `vitest.setup.ts`)
- **Component testing:** `@testing-library/react` + `@vitejs/plugin-react` (JSX/Fast Refresh transform)
- **Globals:** `globals: true` — `describe` / `it` / `expect` / `vi` are available without imports

Config: `vitest.config.ts`
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: { reporter: ['text', 'lcov'], include: ['app/api/**', 'lib/**'] },
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

The `@` alias resolves to repo root here exactly as it does in `tsconfig.json`, so tests import with the same `@/lib/...` / `@/db` paths as source.

## Run Commands

```bash
npm test                                       # vitest run — full suite, one-shot (CI mode)
npm run test:watch                             # vitest — watch mode
npm run test:coverage                          # vitest run --coverage (text + lcov)
npx vitest run __tests__/path/to/file.test.ts  # single file
npx vitest run -t "test name"                  # single test by name
```

## Test Structure

Tests live in a top-level `__tests__/` tree that mirrors the source layout. 28 test files total.

```text
__tests__/
├── api/             # API route handler tests (import route.ts, call GET/POST directly)
│   ├── analytics.test.ts
│   ├── campaign-prospects.test.ts
│   ├── campaigns.test.ts
│   ├── conversations-reply.test.ts
│   ├── execute.test.ts
│   ├── prospects.test.ts
│   ├── segments.test.ts
│   ├── templates.test.ts
│   ├── webhooks-email.test.ts
│   └── workflow.test.ts
├── components/      # React component tests (@testing-library/react, jsdom)
│   ├── campaigns-list.test.tsx
│   └── prospects-client.test.tsx
├── helpers/         # shared test utilities (NOT a test file)
│   └── db-mock.ts
├── integration/     # multi-layer flows (enrollment, save/load round-trips)
│   ├── enrollment-flow.test.ts
│   └── workflow-save-load.test.ts
└── lib/             # pure business-logic unit tests
    ├── chunk-text.test.ts
    ├── classify-meeting.test.ts
    ├── cron-matcher.test.ts
    ├── email-sender.test.ts
    ├── embed.test.ts
    ├── fireflies-poll.test.ts
    ├── linkedin-sender.test.ts
    ├── pipeline-engine.test.ts
    ├── promote-nodes.test.ts
    ├── trigger-config.test.ts
    ├── webhook-trigger.test.ts
    ├── webhook.test.ts
    └── workflow-graph-validator.test.ts
```

**Naming:** `<source-name>.test.ts` for logic/API, `<component>.test.tsx` for React components. Mirror the source path under `__tests__/` (e.g. `lib/pipeline-engine.ts` → `__tests__/lib/pipeline-engine.test.ts`).

## Test Types

| Type | Location | What it covers | Notes |
|------|----------|----------------|-------|
| Unit / lib | `__tests__/lib/` | Pure functions in `lib/` — graph validation, cron matching, chunking, embeddings, senders | No DOM needed; DB-touching modules mock `@/db` |
| API route | `__tests__/api/` | Imports the route module, invokes `GET`/`POST`/etc. directly with a constructed `NextRequest` | Clerk auth is globally mocked to a logged-in user |
| Component | `__tests__/components/` | Renders client components with `@testing-library/react`, asserts on rendered DOM and interactions | Runs in `jsdom` |
| Integration | `__tests__/integration/` | Multi-step flows (campaign enrollment, workflow graph save → load round-trip) | Still mocks the DB layer; exercises several lib functions together |

**Node-environment override:** A test that must run outside `jsdom` (e.g. pure server-side code) declares it per-file with a docblock pragma:

```typescript
// @vitest-environment node
```

## Mocking

### Global mocks — `vitest.setup.ts`

Loaded before every test via `setupFiles`. Stubs the Next.js / Clerk surface so route and component tests don't need a live runtime:

- **`process.env.DATABASE_URL`** — set to a stub `postgresql://mock:mock@localhost/mock` so `db/index.ts` doesn't throw on import. Tests that hit the DB must still mock `@/db` themselves.
- **`next/navigation`** — `useRouter` (push/replace), `usePathname` → `'/'`, `useSearchParams` → empty `URLSearchParams`.
- **`next/headers`** — `cookies()` returns stub `get`/`set`.
- **`server-only`** — mocked to `{}` to prevent the "Client Component" import error Clerk triggers.
- **`@clerk/nextjs/server`** — `auth()` resolves to `{ userId: 'test-user-id' }`, `currentUser()` resolves to `{ id: 'test-user-id' }`, `clerkMiddleware` stubbed. **Every request is authenticated as `test-user-id` in tests.**

### Drizzle DB mock — `__tests__/helpers/db-mock.ts`

The DB is never hit for real. Two helpers fake the Drizzle query-builder chain:

- **`q(resolveValue = [])`** — returns a thenable, chainable mock. Every builder method (`from`, `where`, `set`, `values`, `returning`, `limit`, `offset`, `orderBy`, `innerJoin`, `leftJoin`) returns the same chain object, so arbitrarily deep chains resolve. `await`-ing the chain resolves to `resolveValue`.
- **`queue(results[])`** — returns a factory for `mockImplementation` so each successive `db.select()` / `insert()` / etc. dequeues the next result:
  ```typescript
  vi.mocked(db.select).mockImplementation(queue([result1, result2]))
  ```

Typical pattern in an API/route test:
```typescript
vi.mock('@/db', () => ({ db: { select: vi.fn(), insert: vi.fn(), /* ... */ } }))
import { db } from '@/db'
vi.mocked(db.select).mockReturnValue(q([{ id: '1', userId: 'test-user-id' }]))
```

### Third-party / module mocks

- External SDKs (`resend`, `openai`, Inngest client) are mocked per-file with `vi.mock(...)`, frequently combined with `vi.hoisted(() => ...)` when the mock implementation must be defined before the hoisted `vi.mock` factory runs.
- `fetch` and other browser/global APIs are stubbed with `vi.stubGlobal(...)` / `vi.spyOn(globalThis, 'fetch')` where needed.

## Coverage

- **Reporters:** `text` (console) + `lcov` (file), via `npm run test:coverage`.
- **Scope (`include`):** `app/api/**` and `lib/**` — coverage is measured against the API surface and business logic, not UI components or `app/` pages.
- No hard coverage threshold is enforced in config; coverage is reported, not gated.

## Known-Failing Tests

Per `CLAUDE.md` / `STATUS.md`, the suite is green **except** for the following — do not get sidetracked fixing these as part of unrelated work:

- **3 in `__tests__/api/campaigns.test.ts`** — the `/activate` validator returns **422** where the tests expect **200/404** (validator behavior changed; tests not yet updated).
- **2 in `__tests__/components/prospects-client.test.tsx`** — `waitFor` timing flakes (non-deterministic, not a real regression).

## Conventions

- Test files carry a leading comment referencing the GAP ticket number(s) they cover (matches the lib-module JSDoc convention in `CONVENTIONS.md`).
- Prefer mocking at the `@/db` and SDK boundary; never require a live Neon connection, Clerk session, Resend key, or OpenAI key to run the suite.
- Use the `@` alias in test imports — never relative `../../lib/...` paths.
- Authoritative type check is separate from tests: `npx tsc --noEmit -p .`.

---

*Testing analysis: 2026-05-29*
