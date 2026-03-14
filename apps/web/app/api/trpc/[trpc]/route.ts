import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { cookies } from 'next/headers';
import { appRouter, createTRPCContext } from '@vambiant/api';
import { getSession } from '@vambiant/auth';
import { db, schema, eq } from '@vambiant/db';

async function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => {
      const cookieStore = await cookies();
      const sessionData = await getSession(cookieStore);

      if (!sessionData) {
        return createTRPCContext({ session: null });
      }

      // Look up the user to get fresh data
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
        return createTRPCContext({ session: null });
      }

      return createTRPCContext({
        session: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          companyId: user.currentCompanyId ?? 0,
        },
      });
    },
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`tRPC error on '${path ?? '<no-path>'}':`, error);
          }
        : undefined,
  });
}

export { handler as GET, handler as POST };
