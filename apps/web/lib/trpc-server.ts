import 'server-only';

import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { createCaller, createTRPCContext } from '@vambiant/api';
import { getSession } from '@vambiant/auth';
import { db, schema } from '@vambiant/db';

/**
 * Server-side tRPC caller for use in Server Components and Server Actions.
 *
 * Usage:
 *   const caller = await createServerCaller();
 *   const data = await caller.someRouter.someQuery();
 */
export async function createServerCaller() {
  const cookieStore = await cookies();
  const sessionData = await getSession(cookieStore);

  if (!sessionData) {
    return createCaller(createTRPCContext({ session: null }));
  }

  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      currentCompanyId: schema.users.currentCompanyId,
    })
    .from(schema.users)
    .where(eq(schema.users.id, sessionData.userId))
    .limit(1);

  if (!user) {
    return createCaller(createTRPCContext({ session: null }));
  }

  return createCaller(
    createTRPCContext({
      session: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        companyId: user.currentCompanyId ?? 0,
      },
    }),
  );
}
