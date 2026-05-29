// packages/ui/vitest.setup.ts
// No DATABASE_URL stub — packages/ui has no DB
// No next/* mocks — packages/ui has zero next/* imports (enforced by check-imports.sh)
// @clerk/react is mocked globally — FarsightProvider calls useAuth/useOrganization;
// tests inject _testClient/_testUserId/_testOrgSlug props to bypass real Clerk data.

import { vi } from 'vitest'
import '@testing-library/jest-dom'
import * as vitestAxeMatchers from 'vitest-axe/matchers'
import { expect } from 'vitest'
// Register vitest-axe matchers (toHaveNoViolations) — extend-expect provides types only
expect.extend(vitestAxeMatchers)

// Mock @clerk/react so FarsightProvider can call useAuth()/useOrganization() in tests
// without a real <ClerkProvider>. Tests use _testClient/_testUserId/_testOrgSlug props.
vi.mock('@clerk/react', () => ({
  useAuth: vi.fn(() => ({
    userId: null,
    getToken: vi.fn().mockResolvedValue(null),
    orgRole: null,
    isSignedIn: false,
    isLoaded: true,
  })),
  useOrganization: vi.fn(() => ({
    organization: null,
    isLoaded: true,
  })),
}))
