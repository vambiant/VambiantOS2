import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface SessionPayload extends JWTPayload {
  userId: number;
  email: string;
  companyId?: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a signed JWT session token.
 */
export async function createSessionToken(payload: {
  userId: number;
  email: string;
  companyId?: number;
}): Promise<string> {
  const secret = getSecret();
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    companyId: payload.companyId,
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verify and decode a JWT session token.
 * Returns the payload if valid, or null if invalid/expired.
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.userId !== 'number' ||
      typeof payload.email !== 'string'
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
