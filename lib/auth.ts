import { auth } from '@clerk/nextjs/server';

const DEV_USER_ID = 'dev-user-local';

// Check if Clerk is configured
const isClerkConfigured = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY
);

/**
 * Get the current user ID, falling back to a dev user when Clerk is not configured.
 * This allows the app to work in development without Clerk keys.
 */
export async function getAuthUserId(): Promise<string | null> {
  if (!isClerkConfigured) {
    // Return a dev user ID when Clerk is not configured
    return DEV_USER_ID;
  }
  
  const { userId } = await auth();
  return userId;
}

/**
 * Get auth info with dev fallback
 */
export async function getAuth() {
  if (!isClerkConfigured) {
    return { userId: DEV_USER_ID };
  }
  
  return auth();
}
