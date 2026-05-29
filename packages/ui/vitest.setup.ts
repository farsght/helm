// packages/ui/vitest.setup.ts
// No DATABASE_URL stub — packages/ui has no DB
// No next/* mocks — packages/ui has zero next/* imports (enforced by check-imports.sh)
// No @clerk/* mocks — packages/ui has no clerk imports

import '@testing-library/jest-dom'
import 'vitest-axe/extend-expect'
// vitest-axe/extend-expect adds toHaveNoViolations() matcher to expect()
