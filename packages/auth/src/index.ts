/**
 * VambiantOS2 Authentication
 *
 * Session-based auth using JWT (jose) + bcryptjs for password hashing.
 * Uses the existing users table from @vambiant/db.
 */

export { hashPassword, verifyPassword } from './password';
export { createSessionToken, verifySessionToken } from './jwt';
export {
  getSession,
  setSession,
  clearSession,
  type SessionData,
} from './session';
export { withAuth, type AuthenticatedRequest } from './middleware';
