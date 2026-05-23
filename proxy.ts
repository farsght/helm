import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',  // email tracking webhooks don't need auth
  '/api/cron(.*)',      // cron jobs use internal calls
  '/api/health',        // health check endpoint
  '/api/inngest(.*)',    // Inngest webhook — must bypass auth
  '/monitoring(.*)',    // Sentry tunnelRoute — must bypass auth or events drop
  '/.well-known/workflow(.*)', // Vercel Workflow SDK runtime routes — must be public
])

// Check if Clerk is configured
const isClerkConfigured = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY
)

// Fallback middleware when Clerk is not configured
function noAuthMiddleware(request: NextRequest) {
  return NextResponse.next()
}

// Clerk middleware when configured
const authMiddleware = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export default isClerkConfigured ? authMiddleware : noAuthMiddleware

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
