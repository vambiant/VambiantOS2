import { createSessionToken, verifySessionToken } from './jwt';
import type { SessionPayload } from './jwt';

const SESSION_COOKIE_NAME = 'vambiant-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface SessionData {
  userId: number;
  email: string;
  companyId?: number;
}

/**
 * Read and verify the session from request cookies.
 * Works with Next.js cookies() API.
 *
 * Usage in a server component or route handler:
 *   import { cookies } from 'next/headers';
 *   const session = await getSession(await cookies());
 */
export async function getSession(
  cookies: { get: (name: string) => { value: string } | undefined },
): Promise<SessionData | null> {
  const cookie = cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) {
    return null;
  }

  const payload = await verifySessionToken(cookie.value);
  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    email: payload.email,
    companyId: payload.companyId,
  };
}

/**
 * Set the session cookie with a signed JWT.
 * Works with Next.js cookies() API.
 *
 * Usage in a route handler:
 *   import { cookies } from 'next/headers';
 *   await setSession(await cookies(), { userId: 1, email: 'test@example.com' });
 */
export async function setSession(
  cookies: {
    set: (
      name: string,
      value: string,
      options: Record<string, unknown>,
    ) => void;
  },
  data: SessionData,
): Promise<void> {
  const token = await createSessionToken(data);
  cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear the session cookie.
 *
 * Usage in a route handler:
 *   import { cookies } from 'next/headers';
 *   clearSession(await cookies());
 */
export function clearSession(
  cookies: {
    set: (
      name: string,
      value: string,
      options: Record<string, unknown>,
    ) => void;
  },
): void {
  cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/',
  });
}

export { SESSION_COOKIE_NAME };
