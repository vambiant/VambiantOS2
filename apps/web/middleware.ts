import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from '@vambiant/auth/middleware';

export async function middleware(request: NextRequest) {
  const session = await withAuth(request);
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register') ||
                     request.nextUrl.pathname.startsWith('/forgot-password') ||
                     request.nextUrl.pathname.startsWith('/verify-2fa');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard') ||
                      request.nextUrl.pathname.startsWith('/projects') ||
                      request.nextUrl.pathname.startsWith('/crm') ||
                      request.nextUrl.pathname.startsWith('/costs') ||
                      request.nextUrl.pathname.startsWith('/hoai') ||
                      request.nextUrl.pathname.startsWith('/ava') ||
                      request.nextUrl.pathname.startsWith('/contracts') ||
                      request.nextUrl.pathname.startsWith('/invoices') ||
                      request.nextUrl.pathname.startsWith('/time-tracking') ||
                      request.nextUrl.pathname.startsWith('/resources') ||
                      request.nextUrl.pathname.startsWith('/bim') ||
                      request.nextUrl.pathname.startsWith('/communication') ||
                      request.nextUrl.pathname.startsWith('/reports') ||
                      request.nextUrl.pathname.startsWith('/tenders') ||
                      request.nextUrl.pathname.startsWith('/wiki') ||
                      request.nextUrl.pathname.startsWith('/marketplace') ||
                      request.nextUrl.pathname.startsWith('/references') ||
                      request.nextUrl.pathname.startsWith('/settings') ||
                      request.nextUrl.pathname.startsWith('/questionnaires');

  if (isDashboard && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
