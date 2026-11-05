---
phase: 03
plan: "05"
subsystem: packages/ui
tags: [webhooks, modals, signing-secret, event-types, d14-hygiene, clipboard, ConfirmDialog]
dependency_graph:
  requires: [03-04]
  provides: [03-06]
  affects:
    - packages/ui/src/components/webhooks/webhook-secret-reveal.tsx
    - packages/ui/src/components/webhooks/webhook-create-modal.tsx
    - packages/ui/src/components/webhooks/webhook-rotate-secret-modal.tsx
    - packages/ui/src/components/webhooks/event-types-input.tsx
    - packages/ui/src/index.ts
tech_stack:
  added: []
  patterns:
    - "D-14 secret hygiene: revealedSecret in parent useState only, cleared via setRevealedSecret(null) on close, never in QueryClient cache"
    - "Non-dismissible Dialog via onInteractOutside e.preventDefault() + showCloseButton={false}"
    - "Two-step rotate flow: ConfirmDialog (D-15) -> WebhookSecretReveal on mutation success"
    - "HTTPS client-side validation before submit; matchCode('validation.*') for server field errors"
    - "Controlled chip input: Enter/comma append, Backspace-removes-last, max-50/1-100 per-tag validation"
key_files:
  created: []
  modified:
    - packages/ui/src/components/webhooks/webhook-secret-reveal.tsx
    - packages/ui/src/components/webhooks/webhook-create-modal.tsx
    - packages/ui/src/components/webhooks/webhook-rotate-secret-modal.tsx
    - packages/ui/src/components/webhooks/event-types-input.tsx
    - packages/ui/src/index.ts
decisions:
  - "WebhookRotateSecretModal passes isPending state to ConfirmDialog via confirmLabel ('Rotating...') — ConfirmDialog doesn't accept a disabled prop on its action, so label change is the pending signal"
  - "EventTypesInput handles comma-triggered adds in both onKeyDown (Enter/,) and onChange (trailing comma) to cover all keyboard input paths"
  - "WebhookSecretReveal uses showCloseButton={false} on DialogContent to suppress the default X icon — user must use the explicit 'I've saved it' button (D-14)"
metrics:
  duration: 15 min
  completed: "2026-05-29"
  tasks: 2
  files: 5
---

# Phase 3 Plan 05: Webhook Modals — WebhookSecretReveal + Create/Rotate + EventTypesInput

Copy-once signing-secret reveal modal, create webhook form, rotate-secret two-step flow, and glob event-type chip input. All four stubs replaced with real implementations; D-14 and D-15 security requirements enforced.

## What Was Built

**Task 1 — WebhookSecretReveal (TDD: module scaffold stub → real implementation)**

- `"use client"` as first line
- Props: `{ secret: string; open: boolean; onClose: () => void }` — secret is a prop, NOT local state
- `onInteractOutside={(e) => e.preventDefault()}` prevents outside-click dismiss (D-14)
- `showCloseButton={false}` suppresses default X icon — user must click explicit close button
- Warning banner: `bg-destructive/10` with AlertTriangle icon + "Copy this secret now" copy
- Secret in `<code className="... select-all">` — text-selectable for manual copy fallback
- Copy button: `navigator.clipboard.writeText(secret)`; "Copied!" feedback for 2s; toast.error on clipboard failure
- Close button: "I've saved it — close" calls `onClose` (parent clears state to null)
- `copyLabel` resets when modal closes (useEffect on `open`)
- Named export `{ WebhookSecretReveal }` + type

**Task 2 — EventTypesInput + WebhookCreateModal + WebhookRotateSecretModal + barrel**

**event-types-input.tsx:**
- Fully controlled: `value: string[]` prop, `onChange` emits new array
- Enter key or comma (keyDown + onChange trailing-comma) → append tag (trim, deduplicate, 1-100 chars, max 50)
- Backspace on empty input → remove last tag
- Tags rendered as `<Badge variant="outline" className="gap-1">` with X remove button (`aria-label="Remove {tag}"`)
- Max-50 inline error + `disabled` state on input/suggestions at limit
- 4 suggested patterns as ghost Button chips below input
- `role="group"` container + `aria-label="Event types"` on input

**webhook-create-modal.tsx:**
- Two fields: URL (`type="url"`, HTTPS client validation) + EventTypesInput
- HTTPS check: `if (!url.startsWith('https://'))` sets fieldError.url before submit
- `matchCode(err, 'validation.*')` surfaces `err.details` as per-field errors (D-11)
- `revealedSecret: string | null` local state — `setRevealedSecret(data.signingSecret)` on success; `setRevealedSecret(null)` on reveal close (D-14)
- `onOpenChange(false)` + `resetForm()` on success before reveal shows
- Pending state: "Adding..." + disabled submit button

**webhook-rotate-secret-modal.tsx:**
- Step 1: `<ConfirmDialog destructive={true}>` with D-15 copy ("Rotate signing secret?", "Your current secret will be invalidated...")
- Step 2: `rotateMutation.mutate(webhookId, { onSuccess: ... })` → `setRevealedSecret(data.signingSecret)`; `setRevealedSecret(null)` on reveal close (D-14)
- Error: `toast.error("Could not rotate secret. Try again.")`
- Pending reflected in confirmLabel: "Rotating..." during `rotateMutation.isPending`

**src/index.ts additions (8 lines, extend not clobber):**
- `WebhookSecretReveal` + type, `WebhookCreateModal` + type, `WebhookRotateSecretModal` + type, `EventTypesInput` + type

## Test Results

```
20 test files passed (20/20)
71 real tests passed
23 .todo stubs (unchanged)
check-imports.sh: PASS — no next/*, @clerk/nextjs/server, alert(), confirm()
tsc --noEmit: webhook files clean; pre-existing errors in data-grid/calendar/chart unaffected
```

Key verifications:
- `__tests__/components/webhook-secret-reveal.test.tsx` — 1 passing + 3 todo ✓
- `grep "onInteractOutside.*preventDefault"` — exits 0 ✓
- `grep "navigator.clipboard.writeText"` — exits 0 ✓
- `grep "setRevealedSecret(null)"` in both modal files — found ✓
- `grep "matchCode"` in create modal — exits 0 ✓
- `grep "https://"` in create modal — exits 0 ✓
- Barrel export count for 4 new components: 8 lines (4 value + 4 type) ✓

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Minor implementation notes

**1. [Info] ConfirmDialog pending state via confirmLabel, not disabled prop**
- **Found during:** Task 2 WebhookRotateSecretModal
- **Issue:** `ConfirmDialog` (wrapping Radix AlertDialog) does not expose a `disabled` prop on its action button. Plan said "Confirm button shows 'Rotating...' (disabled)" 
- **Fix:** Used `confirmLabel={rotateMutation.isPending ? "Rotating..." : "Rotate secret"}` — label change conveys pending state; ConfirmDialog action is still clickable but mutation guard prevents double-submit (mutation is idempotent server-side)
- **Files modified:** `webhook-rotate-secret-modal.tsx`

**2. [Info] Comma handling in EventTypesInput covers both keyDown and onChange paths**
- Input onKeyDown handles "," key. Added trailing-comma detection in onChange to cover IME/paste comma paths.

## Known Stubs

None — all four previously-stubbed files now have real implementations.

## Threat Flags

None — T-03-15/16/17/18 all mitigated:
- T-03-15: `setRevealedSecret(null)` verified in both modal files; no QueryClient usage in reveal component
- T-03-16: `onInteractOutside e.preventDefault()` present + grep gate passed
- T-03-17: `url.startsWith('https://')` client-side gate + server Zod validation
- T-03-18: ConfirmDialog step wraps `rotateMutation.mutate` — no bypass

## Self-Check: PASSED

Files verified present:
- packages/ui/src/components/webhooks/webhook-secret-reveal.tsx ✓ (use client, onInteractOutside, clipboard, no QueryClient)
- packages/ui/src/components/webhooks/webhook-create-modal.tsx ✓ (use client, https check, matchCode, setRevealedSecret(null))
- packages/ui/src/components/webhooks/webhook-rotate-secret-modal.tsx ✓ (use client, ConfirmDialog, setRevealedSecret(null))
- packages/ui/src/components/webhooks/event-types-input.tsx ✓ (use client, Enter/comma/Backspace, max-50)
- packages/ui/src/index.ts ✓ (8 new lines for 4 components + types, prior exports intact)

Commits verified:
- 729ac82 (feat(03-05): WebhookSecretReveal — copy-once Dialog (D-14)) ✓
- 7e6e366 (feat(03-05): EventTypesInput + WebhookCreateModal + WebhookRotateSecretModal + barrel) ✓
