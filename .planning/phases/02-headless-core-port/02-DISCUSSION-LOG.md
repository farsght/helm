# Phase 2: Headless Core Port - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 2-Headless Core Port
**Areas discussed:** Loading/error/empty shape, DataTable URL-state coupling, alert/confirm migration scope

---

## Gray-Area Selection

| Area | Description | Selected for discussion |
|------|-------------|-------------------------|
| Loading/error/empty shape | What form the L/E/E conventions take pre-data | ✓ |
| DataTable URL-state coupling | How to handle nuqs/URL-state in the ported DataTable | ✓ |
| alert/confirm migration scope | What CORE-04's alert/confirm work covers | ✓ |
| Nav & sidebar scope | Whether nav/sidebar primitives travel in Phase 2 | (not selected — deferred) |

---

## Loading / Error / Empty shape

### Q1 — What form should the convention take?

| Option | Description | Selected |
|--------|-------------|----------|
| Component trio + docs | Keep `<EmptyState>`, add sibling `<ErrorState>`, formalize a Skeleton-based loading recipe; documented convention | ✓ |
| Status-driven wrapper | One `<DataState status loading/error/empty/ready>` component switching branches | |
| Convention + docs only | No new component; compose Skeleton + EmptyState + inline error per docs | |

**User's choice:** Component trio + docs.

### Q2 — How much should `<ErrorState>` know about error structure?

| Option | Description | Selected |
|--------|-------------|----------|
| Purely presentational | `title/description/icon + onRetry`; no HTTP/RFC-7807 awareness; Phase 3 adapter maps `ApiErrorEnvelope` into props | ✓ |
| Error-aware variant | Understands a typed error shape now; couples headless layer to a contract that doesn't exist until Phase 3 | |

**User's choice:** Purely presentational.

### Q3 — Scope of loading primitives shipped?

| Option | Description | Selected |
|--------|-------------|----------|
| Port existing + base Skeleton | Base `<Skeleton>` + existing grid/table skeletons + "compose-your-own" recipe | |
| Add prebuilt layout skeletons | Also ship `card-grid-skeleton`, `list-skeleton`, `detail-skeleton` as named primitives | ✓ |

**User's choice:** Add prebuilt layout skeletons.
**Notes:** User opted for more surface area now so consumers don't hand-roll layout skeletons.

---

## DataTable URL-state coupling

### Q1 — How should the ported DataTable handle nuqs/URL-state?

| Option | Description | Selected |
|--------|-------------|----------|
| Injectable / optional (default internal) | Default internal React state; expose controlled `state`/`onStateChange` for opt-in URL sync; nuqs becomes an apps/web detail | ✓ |
| Keep nuqs as a peer | DataTable keeps driving state via nuqs; consumer mounts NuqsAdapter | |
| Strip URL-sync, defer | Internal state only; rewrites the hook's state model | |

**User's choice:** Injectable / optional (default internal).
**Notes:** Framed against the PROJECT.md theme-toggle precedent (URL-state persistence is a routing/shell concern). Heavy DataGrid is already framework-clean — unchanged.

### Q2 — How far does the opt-in URL-sync seam go in Phase 2?

| Option | Description | Selected |
|--------|-------------|----------|
| Controlled props + docs now | Ship controlled props + internal default + docs; live URL-sync proven by Phase 4 external Vite consumer (PORT-01) | ✓ |
| Prove URL-sync in Phase 2 | Build/verify a working URL round-trip now (pulls routing into the headless phase) | |

**User's choice:** Controlled props + docs now.

---

## alert() / confirm() migration scope

### Q1 — What does CORE-04's alert/confirm work cover?

| Option | Description | Selected |
|--------|-------------|----------|
| Ship primitives + convention only | Port `ConfirmDialog`, create new `Toaster`, document convention, CI guard keeps package alert/confirm-free; leave Helm's call sites alone | ✓ |
| Also migrate Helm call sites | Refactor Helm's 48 alert() / 9 confirm() in out-of-scope surfaces too | |

**User's choice:** Ship primitives + convention only.
**Notes:** All flagged call sites are in out-of-scope Helm surfaces not traveling to Farsight.

### Q2 — How opinionated should the new `<Toaster>` be re: theme?

| Option | Description | Selected |
|--------|-------------|----------|
| Thin themed pass-through | Style via CSS-var tokens; drop next-themes; dark via `.dark` class | |
| Theme-hook integrated | Wire light/dark through `next-themes` `useTheme()` | ✓ |

**User's choice:** Theme-hook integrated.

### Q2-follow-up — How should next-themes be declared?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional peer; consumer owns provider | `next-themes` as OPTIONAL peerDependency; Toaster reads theme, consumer owns ThemeProvider/toggle/persistence; degrades to `system` | ✓ |
| Bundled dependency | Ship next-themes as a regular dependency; risks competing providers | |

**User's choice:** Optional peer; consumer owns provider.
**Notes:** Reconciles the user's "real dark-mode sync" preference with PROJECT.md's "library doesn't own theme state." Flags a PROJECT.md out-of-scope note to reconcile at the next transition. `next-themes` is React-generic (not a `next/*` import-guard violation), but the guard must explicitly allow it.

---

## Claude's Discretion

- Exact `packages/ui/src/` layout of the new `ErrorState` + skeleton primitives.
- CI import-guard mechanism (lint rule / grep / dependency-cruiser) — must encode no-`next/*`, no-`@clerk/nextjs/server`, no-`alert(`/`confirm(`, while allowing `next-themes`.
- Page-primitive export shape (per-component subpaths vs a `./page` grouped subpath).
- DataGrid/DataTable characterization-test bar (pin against internal-state default).

## Deferred Ideas

- Nav & sidebar primitives — `app-sidebar.tsx` doesn't travel in Phase 2 (needs href/onClick + Clerk-React decoupling); presentational nav primitives are a later-phase concern.
- `lucide-react` `^0.576.0` → 1.x bump — audit icon imports during planning.
- a11y verification mechanism for CORE-05 (axe / eslint-plugin-jsx-a11y / manual).
- Live URL-sync proof for DataTable — Phase 4 / PORT-01.
