// packages/ui/vitest.setup.ts
// No DATABASE_URL stub — packages/ui has no DB
// No next/* mocks — packages/ui has zero next/* imports (enforced by check-imports.sh)
// No @clerk/* mocks — packages/ui has no clerk imports

import '@testing-library/jest-dom'
import * as vitestAxeMatchers from 'vitest-axe/matchers'
import { expect } from 'vitest'
// Register vitest-axe matchers (toHaveNoViolations) — extend-expect provides types only
expect.extend(vitestAxeMatchers)
