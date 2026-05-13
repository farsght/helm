import { NextRequest, NextResponse } from 'next/server';

// Redirect to /api/analytics/dashboard — this route is no longer used directly
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/analytics/dashboard', request.url));
}
