import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { db } from '@vambiant/db';
import type { Database } from '@vambiant/db';

// Context type - will be populated by the Next.js adapter
export interface TRPCContext {
  session: {
    user: {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
    };
    companyId: number;
  } | null;
  db: Database;
}

export function createTRPCContext(opts?: {
  session?: TRPCContext['session'];
}): TRPCContext {
  return {
    session: opts?.session ?? null,
    db,
  };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

// Middleware: require authenticated user
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: ctx.session,
      db: ctx.db,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

// Middleware: require specific company context
const enforceCompany = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.companyId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No company selected' });
  }
  return next({
    ctx: {
      session: ctx.session,
      companyId: ctx.session.companyId,
      db: ctx.db,
    },
  });
});

export const companyProcedure = t.procedure.use(enforceAuth).use(enforceCompany);
