# Page Primitive Call-Site Conventions

Co-located with the page primitives (`PageHeader`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `Toaster`, layout skeletons).

---

## 1. Loading / Error / Empty Call-Site Pattern (D-04)

Every data-surface consumer **must** implement the four-branch rendering pattern. The order matters — resolve loading before error, error before empty, empty before the real content.

```tsx
function MyDataSurface() {
  const { data, isLoading, error, refetch } = useMyData()

  // Branch 1: Loading — render the appropriate skeleton
  if (isLoading) {
    return <ListSkeleton count={5} />
    // Other options: <CardGridSkeleton />, <DetailSkeleton />
  }

  // Branch 2: Error — render ErrorState with onRetry
  if (error) {
    return (
      <ErrorState
        title="Failed to load"
        description="Check your connection and try again."
        onRetry={refetch}
      />
    )
  }

  // Branch 3: Empty — zero items, render EmptyState
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No items yet"
        description="Create your first item to get started."
      />
    )
  }

  // Branch 4: Else — render real content
  return <MyDataList items={data} />
}
```

### Prop signatures used

| Branch | Component | Key props |
|--------|-----------|-----------|
| `isLoading` | `<CardGridSkeleton />`, `<ListSkeleton />`, `<DetailSkeleton />` | `count?`, `columns?` |
| `error` | `<ErrorState onRetry={refetch} />` | `title?`, `description?`, `icon?`, `onRetry?`, `action?` |
| empty | `<EmptyState title="..." />` | `title` (required), `description?`, `icon?`, `action?` |
| else | real content | — |

**Enforcement:** This pattern is enforced by convention in Phase 2 and by linting in Phase 3/4. Every surface that fetches data must render all four branches — omitting the loading or error branch is a correctness defect.

---

## 2. Alert / Confirm Replacement Convention (D-08)

The browser's native `alert()` and `confirm()` are **prohibited** in all `@farsight/ui` source. They block the main thread, are inaccessible to screen readers, and are caught by the CI import guard (`check-imports.sh` Rule 3).

Use the following replacements instead:

### Destructive actions → `<ConfirmDialog>`

For any action that is irreversible or destructive (deletes, overwrites, bulk operations), use `<ConfirmDialog>` to gate the action behind an explicit user confirmation:

```tsx
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this item?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </>
  )
}
```

**Never use `confirm()`** for this — it is inaccessible and blocked by the CI guard.

### Transient notifications → Sonner `toast()` via `<Toaster>`

For success messages, info notices, and non-blocking warnings, use Sonner's `toast()` function. The `<Toaster>` primitive must be mounted once in the app root (or layout):

```tsx
// In your app layout/root:
import { Toaster } from "@farsight/ui/components/page/toaster"

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

// At call sites:
import { toast } from "sonner"

function handleSave() {
  await save()
  toast.success("Saved successfully")
}
```

**Never use `alert()`** for notifications — it is inaccessible and blocked by the CI guard.

### Summary table

| Scenario | Use | Never use |
|----------|-----|-----------|
| Irreversible / destructive action | `<ConfirmDialog>` | `confirm()` |
| Transient notification (success, info, warning) | `toast()` via `<Toaster>` | `alert()` |

**The prohibition is absolute:** never use the browser's native `alert()` or `confirm()` in any `@farsight/ui` source file. They block the main thread, are inaccessible to assistive technology, and are caught by the CI import guard.
