import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
}))

// Mock server-only (used by Clerk internally) — prevents "Client Component" import error
vi.mock('server-only', () => ({}))

// Mock Clerk auth — all requests succeed as authenticated in tests
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'test-user-id' }),
  currentUser: vi.fn().mockResolvedValue({ id: 'test-user-id' }),
  clerkMiddleware: vi.fn(),
}))
