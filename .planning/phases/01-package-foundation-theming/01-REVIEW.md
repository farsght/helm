---
phase: 01-package-foundation-theming
reviewed: 2026-05-29T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - packages/ui/package.json
  - packages/ui/tsconfig.json
  - packages/ui/tsdown.config.ts
  - packages/ui/src/index.ts
  - packages/ui/src/lib/utils.ts
  - packages/ui/src/lib/tokens.ts
  - packages/ui/src/styles/theme.css
  - packages/ui/src/components/ui/button.tsx
  - packages/ui/src/components/ui/label.tsx
  - packages/ui/scripts/check-directives.sh
  - packages/ui/README.md
  - .gitignore
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-05-29
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 1 establishes the `@farsight/ui` package foundation: an installable, tree-shakeable,
themed package with a CSS token contract and two seed components (Button, Label). I reviewed
all 12 source files and additionally **executed the build pipeline** (`tsdown` + `npm run build`),
ran `tsc --noEmit`, `publint`, and `npm pack --dry-run` to verify the phase invariants empirically
rather than by inspection alone.

The good news: the core PKG-03 invariant holds — `'use client'` is preserved on `label.tsx` and
correctly omitted from `button.tsx` in `dist/` output, the CSS contract has no `@import "tailwindcss"`,
and after a full `npm run build` (with the css-copy step) `publint` reports "All good!".

However, two blocking defects were proven by execution:

1. **`tsconfig.json` does not type-check.** `module: "NodeNext"` with `moduleResolution: "bundler"`
   is an illegal combination — `tsc` exits with errors TS5095 and TS5109. The codebase's authoritative
   TS check (`npx tsc --noEmit -p .`, per CLAUDE.md) is broken for this package. `tsdown` papers over
   it because it uses its own bundler resolver.

2. **`radix-ui` and `class-variance-authority` are undeclared dependencies.** Both are imported by the
   shipped components and explicitly externalized in `tsdown.config.ts` (`neverBundle`), yet they appear
   nowhere in `package.json` — not in `dependencies`, `peerDependencies`, or `peerDependenciesMeta`. The
   build only resolves them by monorepo hoisting from the Helm root; a clean consumer install would fail
   at runtime/type-check.

The remaining findings concern type-declaration leakage from the build, brittle CI threshold logic,
and a missing `types` export condition.

## Critical Issues

### CR-01: tsconfig.json uses an illegal module/moduleResolution combination — `tsc` fails

**File:** `packages/ui/tsconfig.json:4-5`
**Issue:** `module: "NodeNext"` requires `moduleResolution: "nodenext"`, but the config sets
`moduleResolution: "bundler"`. Running `npx tsc --noEmit -p packages/ui/tsconfig.json` (the
authoritative TS check mandated by CLAUDE.md) fails:

```
tsconfig.json(5,25): error TS5095: Option 'bundler' can only be used when 'module' is set to 'preserve' or to 'es2015' or later.
tsconfig.json(5,25): error TS5109: Option 'moduleResolution' must be set to 'NodeNext' (or left unspecified) when option 'module' is set to 'NodeNext'.
```

`tsdown` builds successfully because it resolves modules through its own (rolldown) resolver and does
not honor this `tsconfig`'s `module` setting — so the broken config is invisible to the build but breaks
any `tsc`-based type check, IDE project service, or downstream config that extends this file. Since
`dts: true` declaration generation and a clean `tsc` gate are both Phase-1 deliverables, this is blocking.

**Fix:** Choose one coherent pairing. For a bundler-consumed library the simplest correct config is:

```jsonc
{
  "compilerOptions": {
    "module": "ESNext",        // or "Preserve"
    "moduleResolution": "Bundler",
    // ...rest unchanged
  }
}
```

Then verify with `npx tsc --noEmit -p packages/ui/tsconfig.json` returning clean.

### CR-02: `radix-ui` and `class-variance-authority` imported but declared nowhere in package.json

**File:** `packages/ui/package.json:30-57` (and `packages/ui/src/components/ui/button.tsx:2-3`, `packages/ui/src/components/ui/label.tsx:4`)
**Issue:** `button.tsx` imports `cva`/`VariantProps` from `class-variance-authority` and `Slot` from
`radix-ui`; `label.tsx` imports `Label` from `radix-ui`. Both packages are listed in
`tsdown.config.ts` `neverBundle` (lines 27-28) so they are emitted as bare external imports in
`dist/components/ui/*.js`:

```js
// dist/components/ui/button.js
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui";
```

But `package.json` declares them in **no** dependency field — only `clsx` and `tailwind-merge` are
in `dependencies`, and the peer set is `react`/`react-dom`/`@clerk/react`/`@xyflow/react`/`@tanstack/react-query`.
The build currently resolves `radix-ui` (1.4.3) and `class-variance-authority` only because they are
hoisted from the Helm monorepo root `node_modules`. A consumer that installs `@farsight/ui` in a tree
that does not already provide these packages will get unresolved-module failures at type-check and
runtime. This breaks the "installable, framework-clean" invariant.

**Fix:** Declare both. They are genuine runtime requirements of the shipped components, so they belong
in `dependencies` (they are not consumer-substitutable the way React is):

```jsonc
"dependencies": {
  "clsx": "^2.1.0",
  "tailwind-merge": "^3.0.0",
  "radix-ui": "^1.4.0",
  "class-variance-authority": "^0.7.0"
}
```

If the intent is for consumers to dedupe them, make them peers instead — but in that case they must
appear in `peerDependencies` (+ `peerDependenciesMeta` if optional). Either way, "imported + externalized
+ undeclared" is not a valid state. Once declared, reconcile with the `neverBundle` list so intent is
explicit in one place.

## Warnings

### WR-01: Declaration build leaks an internal `node_modules` path and ships a stray `dist/node_modules/` directory

**File:** `packages/ui/tsdown.config.ts:12,16-29` (manifests in generated `dist/components/ui/button.d.ts` and `dist/node_modules/...`)
**Issue:** With `unbundle: true` and `dts: true`, tsdown rolls up the `ClassProp` type from
`class-variance-authority` into a copied file and rewrites `button.d.ts` to import it via a relative
`node_modules` path:

```ts
// dist/components/ui/button.d.ts
import { ClassProp } from "../../node_modules/class-variance-authority/dist/types.js";
```

That path resolves to `dist/node_modules/class-variance-authority/dist/types.d.ts`, which the build
emits and `npm pack` includes (confirmed via `npm pack --dry-run`). Two problems: (a) the emitted
specifier points at `types.js` but only `types.d.ts` is produced — fragile and confusing; (b) leaking
a relative `../../node_modules/...` import into published `.d.ts` is brittle — consumer type resolution
depends on this internal directory surviving install/hoist, and it bypasses the consumer's own
`class-variance-authority` version. The build also prints a tsdown hint that `class-variance-authority`
was "detected in bundle."

**Fix:** Keep the type external rather than rolling it up. After declaring `class-variance-authority`
(CR-02), configure dts to treat it as external so `button.d.ts` emits
`import { ClassProp } from "class-variance-authority"`:

```ts
export default defineConfig({
  // ...
  dts: { resolve: false },          // do not inline/rollup external .d.ts
})
```

Verify `dist/node_modules/` is no longer produced and `button.d.ts` imports the bare package name.

### WR-02: `'use client'` build emits parse-failure warnings from the preserve-directives plugin

**File:** `packages/ui/tsdown.config.ts:13-15`
**Issue:** Running the build prints repeated errors:

```
(preserve-directives plugin) [rollup-preserve-directives]: failed to parse ".../button.tsx" and extract the directives.
make sure you have added "rollup-preserve-directives" to the last of your plugins list, after swc/babel/esbuild/typescript or any other transform plugins.
```

The directive *did* survive for `label.js` in this run, so PKG-03 currently passes — but the plugin is
reporting it cannot reliably parse the (TSX) inputs because it runs before tsdown's internal transform,
not after it. This is exactly the fragile ordering the plugin warns about: a future component, a syntax
the parser chokes on, or a tsdown version bump could silently drop `'use client'` from a server-incompatible
component, and the only guard (`check-directives.sh`, threshold `>= 1`) would still pass as long as any
one file keeps its directive. The warning indicates the mechanism is working by accident, not by design.

**Fix:** Confirm the plugin is positioned after tsdown's transform (tsdown applies its own esbuild/oxc
transform; a Rollup-era `plugins: [...]` entry may run in the wrong phase). Prefer tsdown's native
directive handling if available in 0.22.1, or pin/position the plugin per its docs so the warning
disappears. Treat any remaining "failed to parse" output as a build failure, not noise.

### WR-03: `check-directives.sh` threshold (`>= 1`) cannot detect a per-component regression

**File:** `packages/ui/scripts/check-directives.sh:18-27`
**Issue:** The check counts files containing `"use client"` and asserts the count is `>= 1`. With Phase 1
shipping exactly one client component (Label), this passes the moment any single directive survives.
If a future build drops `'use client'` from a component that needs it but keeps it on another, the count
stays `>= 1` and the regression ships undetected. The grep is also coupled to the double-quoted form only
(`'"use client"'`) — a single-quoted emit (`'use client'`) would count as zero and produce a false
failure, or a future formatter change would silently break the assertion.

**Fix:** Assert an exact expected count and assert the directive on specific files, not a floor:

```bash
# Files that MUST carry the directive (server-incompatible components)
REQUIRED=( "components/ui/label.js" )
for f in "${REQUIRED[@]}"; do
  head -1 "$DIST_DIR/$f" | grep -Eq "^['\"]use client['\"]" \
    || { echo "FAIL: missing 'use client' in $f"; exit 1; }
done
# And assert the total equals the known set, not >= 1
```

Match both quote styles with the `-E "['\"]use client['\"]"` pattern.

### WR-04: `publishConfig.exports["./lib/*"]` has no `types` condition — subpath imports lose declarations

**File:** `packages/ui/package.json:24`
**Issue:** The published `lib/*` subpath maps to `"./dist/lib/*.js"` with no `types` condition. Under
`node16`/`nodenext`/`bundler` module resolution, `import { tokens } from '@farsight/ui/lib/tokens'`
(the exact pattern the README and `tokens.ts` advertise) resolves the JS but finds no `.d.ts`, even
though `dist/lib/tokens.d.ts` is produced and packed. Consumers of the *built* package silently lose
`TokenChart`/`TokenColor` typings on the subpath. (In `workspace:*` dev mode the top-level dev export
serves raw `.ts` so types survive there, which is why this is latent rather than active — but it will
bite the eventual monorepo port that consumes built output.)

**Fix:** Add a `types` condition to the subpath:

```jsonc
"./lib/*": {
  "types": "./dist/lib/*.d.ts",
  "import": "./dist/lib/*.js"
}
```

### WR-05: `package-lock.json` committed inside a package destined for a pnpm `workspace:*` monorepo

**File:** `packages/ui/package-lock.json` (committed in this phase's diff; `packages/ui/package.json` ecosystem)
**Issue:** A 61 KB npm `package-lock.json` was committed under `packages/ui/`. Per CLAUDE.md and the
Phase constraints, the final artifact lives in a **pnpm** workspace consumed via `workspace:*`, and the
package is `private: true` (never npm-published). A per-package npm lockfile is the wrong lockfile format
for the target ecosystem, will drift from the pnpm resolution used in the monorepo, and gives a false
impression of how deps are pinned. There is no root `pnpm-lock.yaml`/`pnpm-workspace.yaml` here yet, so
this lone npm lock is misleading.

**Fix:** Remove `packages/ui/package-lock.json` from version control and let the workspace's single root
lockfile (pnpm, in the target monorepo) own resolution. If a lockfile is needed locally during Helm-side
prep, add it to `.gitignore` rather than committing it. (Out of scope to fix here, but flag for the
fixer: confirm with the monorepo plan before deleting.)

## Info

### IN-01: README install instructions contradict `private: true` / `workspace:*` consumption

**File:** `packages/ui/README.md:11-13,27-36`
**Issue:** The README leads with `npm install @farsight/ui react react-dom`, but `package.json` sets
`"private": true` and the package is consumed via `workspace:*` from the Farsight monorepo — it will
never be `npm install`-able. New readers will try a registry install that cannot work.
**Fix:** Replace the install snippet with the workspace form, e.g. add `"@farsight/ui": "workspace:*"`
to the consuming app's `package.json` and note that peers are provided by the monorepo root. Keep the
peer-dependency table; just reframe the install mechanism.

### IN-02: `globals.css` is a stub but is already wired into the `exports` map and build copy step

**File:** `packages/ui/src/styles/globals.css:1-4`, `packages/ui/package.json:13,23,28`
**Issue:** `globals.css` contains only a stub comment ("Full content will be populated in Phase 1 Plan 02")
yet is exported (`"./styles/globals.css"`), copied by the build script, and packed. A consumer importing
`@farsight/ui/styles/globals.css` today gets an effectively empty stylesheet with no error, which can mask
a missing-import bug downstream.
**Fix:** Acceptable as a tracked stub for this plan, but consider not exporting it until populated, or add
a visible `@layer`/comment banner so an accidental early consumer notices it is incomplete. At minimum,
ensure the THEME-01 follow-up is tracked so the export does not ship empty.

### IN-03: `@theme inline` declares several self-referential tokens that read as no-ops

**File:** `packages/ui/src/styles/theme.css:29-36,76`
**Issue:** Entries like `--shadow-2xl: var(--shadow-2xl);`, `--shadow-xl: var(--shadow-xl);` … and
`--spacing: var(--spacing);` map a token to itself. They resolve correctly only because `:root`/`.dark`
define the same names later (lines 117-126), so at paint time they fall through to those values. The
self-reference is intentional-looking (re-registering the `:root` value as a Tailwind theme key) but is
easy to misread as a typo/cycle and would silently break if the matching `:root` definition were ever
removed.
**Fix:** Add a one-line comment above the block explaining the "re-expose `:root` value as a `@theme`
key so utilities generate" intent, or alias to the underlying name explicitly if the design system uses
a distinct source token. No runtime bug today.

### IN-04: `preserveDirectives() as any` cast hides plugin type incompatibility

**File:** `packages/ui/tsdown.config.ts:14`
**Issue:** The plugin is cast `as any` to fit tsdown's `plugins` type. This suppresses any type signal if
the plugin's expected hook shape diverges from what tsdown 0.22.1 passes (related to the WR-02 parse
warnings). The cast means a genuine incompatibility surfaces only as the runtime warning, not at config
type-check.
**Fix:** Prefer a typed import or a narrower cast (e.g. `as Plugin` from rolldown/rollup) so a future
plugin/tsdown mismatch is caught statically. Cosmetic but reduces the blast radius of WR-02.

---

_Reviewed: 2026-05-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
