import { verifySessionToken, type SessionPayload } from './jwt';
import { SESSION_COOKIE_NAME } from './session';

export interface AuthenticatedRequest {
  userId: number;
  email: string;
  companyId?: number;
}

/**
 * Middleware helper for Next.js Edge middleware.
 * Checks the session cookie and returns the session payload if valid.
 *
 * Usage in middleware.ts:
 *   import { withAuth } from '@vambiant/auth';
 *
 *   export default async function middleware(request: NextRequest) {
 *     const session = await withAuth(request);
 *     if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
 *       return NextResponse.redirect(new URL('/login', request.url));
 *     }
 *     return NextResponse.next();
 *   }
 */
export async function withAuth(
  request: Request & { cookies?: { get: (name: string) => { value: string } | undefined } },
): Promise<AuthenticatedRequest | null> {
  // Try to get cookie from NextRequest cookies API
  let token: string | undefined;

  if (request.cookies?.get) {
    token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  }

  // Fallback: parse Cookie header manually
  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c: string) => {
          const [key, ...rest] = c.trim().split('=');
          return [key, rest.join('=')] as [string, string];
        }),
      );
      token = cookies[SESSION_COOKIE_NAME];
    }
  }

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    email: payload.email,
    companyId: payload.companyId,
  };
}
