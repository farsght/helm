import { NextRequest, NextResponse } from 'next/server';

// TODO: Add authentication - see IMPLEMENTATION.md GAP-22
export function middleware(request: NextRequest) {
  console.log(`[MIDDLEWARE] ${request.method} ${request.nextUrl.pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
