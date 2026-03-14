import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { marketplaceListings, intercompanyTransactions } from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const listListingsSchema = z
  .object({
    listingType: z.enum(['offer', 'request']).optional(),
    category: z.string().max(100).optional(),
    status: z.enum(['active', 'inactive', 'expired']).optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const createListingSchema = z.object({
  listingType: z.enum(['offer', 'request']),
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  trades: z.array(z.string()).optional(),
  availability: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      hoursPerWeek: z.number().optional(),
    })
    .optional(),
  pricing: z
    .object({
      type: z.string().optional(),
      amount: z.number().optional(),
      currency: z.string().max(3).optional(),
    })
    .optional(),
  location: z
    .object({
      city: z.string().optional(),
      radiusKm: z.number().optional(),
      remotePossible: z.boolean().optional(),
    })
    .optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  metadata: z.record(z.unknown()).optional(),
});

const updateListingSchema = createListingSchema.partial().extend({
  id: z.number().int().positive(),
});

const listTransactionsSchema = z
  .object({
    listingId: z.number().int().positive().optional(),
    status: z.enum(['pending', 'accepted', 'rejected', 'completed']).optional(),
  })
  .merge(paginationSchema);

const createTransactionSchema = z.object({
  listingId: z.number().int().positive().optional(),
  providingCompanyId: z.number().int().positive(),
  transactionType: z.string().max(50).optional(),
  amount: z.string().optional(), // numeric as string for precision
  description: z.string().optional(),
  terms: z.record(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const marketplaceRouter = createTRPCRouter({
  listings: createTRPCRouter({
    /**
     * List marketplace listings with pagination and filtering.
     */
    list: companyProcedure
      .input(listListingsSchema)
      .query(async ({ ctx, input }) => {
        const conditions: any[] = [
          sql`${marketplaceListings.deletedAt} IS NULL`,
        ];

        if (input.listingType) {
          conditions.push(eq(marketplaceListings.listingType, input.listingType));
        }
        if (input.category) {
          conditions.push(eq(marketplaceListings.category, input.category));
        }
        if (input.status) {
          conditions.push(eq(marketplaceListings.status, input.status));
        }
        if (input.search) {
          conditions.push(
            sql`(${marketplaceListings.title} ILIKE ${'%' + input.search + '%'} OR ${marketplaceListings.description} ILIKE ${'%' + input.search + '%'})`,
          );
        }

        const whereClause = and(...conditions);

        const countResult = await ctx.db
          .select({ total: sql<number>`count(*)::int` })
          .from(marketplaceListings)
          .where(whereClause);
        const total = countResult[0]?.total ?? 0;

        const items = await ctx.db
          .select({
            id: marketplaceListings.id,
            companyId: marketplaceListings.companyId,
            listingType: marketplaceListings.listingType,
            title: marketplaceListings.title,
            description: marketplaceListings.description,
            category: marketplaceListings.category,
            trades: marketplaceListings.trades,
            availability: marketplaceListings.availability,
            pricing: marketplaceListings.pricing,
            location: marketplaceListings.location,
            status: marketplaceListings.status,
            createdAt: marketplaceListings.createdAt,
            updatedAt: marketplaceListings.updatedAt,
          })
          .from(marketplaceListings)
          .where(whereClause)
          .orderBy(desc(marketplaceListings.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return {
          items,
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Get a single marketplace listing by ID.
     */
    getById: companyProcedure
      .input(idSchema)
      .query(async ({ ctx, input }) => {
        const [listing] = await ctx.db
          .select()
          .from(marketplaceListings)
          .where(
            and(
              eq(marketplaceListings.id, input.id),
              sql`${marketplaceListings.deletedAt} IS NULL`,
            ),
          )
          .limit(1);

        if (!listing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Inserat nicht gefunden',
          });
        }

        return listing;
      }),

    /**
     * Create a new marketplace listing.
     */
    create: companyProcedure
      .input(createListingSchema)
      .mutation(async ({ ctx, input }) => {
        const [newListing] = await ctx.db
          .insert(marketplaceListings)
          .values({
            companyId: ctx.companyId,
            listingType: input.listingType,
            title: input.title,
            description: input.description,
            category: input.category,
            trades: input.trades ?? [],
            availability: input.availability,
            pricing: input.pricing,
            location: input.location,
            status: input.status,
            metadata: input.metadata,
          })
          .returning();

        if (!newListing) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Inserat konnte nicht erstellt werden',
          });
        }

        return newListing;
      }),

    /**
     * Update an existing marketplace listing.
     */
    update: companyProcedure
      .input(updateListingSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify listing belongs to company
        const [existing] = await ctx.db
          .select({ id: marketplaceListings.id })
          .from(marketplaceListings)
          .where(
            and(
              eq(marketplaceListings.id, input.id),
              eq(marketplaceListings.companyId, ctx.companyId),
              sql`${marketplaceListings.deletedAt} IS NULL`,
            ),
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Inserat nicht gefunden',
          });
        }

        const { id, ...rest } = input;

        const [updated] = await ctx.db
          .update(marketplaceListings)
          .set({ ...rest, updatedAt: new Date() })
          .where(
            and(
              eq(marketplaceListings.id, id),
              eq(marketplaceListings.companyId, ctx.companyId),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Inserat nicht gefunden',
          });
        }

        return updated;
      }),

    /**
     * Soft-delete a marketplace listing.
     */
    delete: companyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        const [existing] = await ctx.db
          .select({ id: marketplaceListings.id })
          .from(marketplaceListings)
          .where(
            and(
              eq(marketplaceListings.id, input.id),
              eq(marketplaceListings.companyId, ctx.companyId),
              sql`${marketplaceListings.deletedAt} IS NULL`,
            ),
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Inserat nicht gefunden',
          });
        }

        await ctx.db
          .update(marketplaceListings)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(marketplaceListings.id, input.id),
              eq(marketplaceListings.companyId, ctx.companyId),
            ),
          );

        return { success: true };
      }),
  }),

  transactions: createTRPCRouter({
    /**
     * List intercompany transactions with pagination and filtering.
     */
    list: companyProcedure
      .input(listTransactionsSchema)
      .query(async ({ ctx, input }) => {
        const conditions: any[] = [
          sql`(${intercompanyTransactions.requestingCompanyId} = ${ctx.companyId} OR ${intercompanyTransactions.providingCompanyId} = ${ctx.companyId})`,
        ];

        if (input.listingId) {
          conditions.push(eq(intercompanyTransactions.listingId, input.listingId));
        }
        if (input.status) {
          conditions.push(eq(intercompanyTransactions.status, input.status));
        }

        const whereClause = and(...conditions);

        const countResult = await ctx.db
          .select({ total: sql<number>`count(*)::int` })
          .from(intercompanyTransactions)
          .where(whereClause);
        const total = countResult[0]?.total ?? 0;

        const items = await ctx.db
          .select({
            id: intercompanyTransactions.id,
            listingId: intercompanyTransactions.listingId,
            requestingCompanyId: intercompanyTransactions.requestingCompanyId,
            providingCompanyId: intercompanyTransactions.providingCompanyId,
            transactionType: intercompanyTransactions.transactionType,
            amount: intercompanyTransactions.amount,
            description: intercompanyTransactions.description,
            status: intercompanyTransactions.status,
            terms: intercompanyTransactions.terms,
            approvals: intercompanyTransactions.approvals,
            createdAt: intercompanyTransactions.createdAt,
            updatedAt: intercompanyTransactions.updatedAt,
          })
          .from(intercompanyTransactions)
          .where(whereClause)
          .orderBy(desc(intercompanyTransactions.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return {
          items,
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Create a new intercompany transaction.
     */
    create: companyProcedure
      .input(createTransactionSchema)
      .mutation(async ({ ctx, input }) => {
        // If listingId provided, verify it exists and is active
        if (input.listingId) {
          const [listing] = await ctx.db
            .select({ id: marketplaceListings.id })
            .from(marketplaceListings)
            .where(
              and(
                eq(marketplaceListings.id, input.listingId),
                sql`${marketplaceListings.deletedAt} IS NULL`,
              ),
            )
            .limit(1);

          if (!listing) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Inserat nicht gefunden',
            });
          }
        }

        const [newTransaction] = await ctx.db
          .insert(intercompanyTransactions)
          .values({
            listingId: input.listingId,
            requestingCompanyId: ctx.companyId,
            providingCompanyId: input.providingCompanyId,
            transactionType: input.transactionType,
            amount: input.amount,
            description: input.description,
            terms: input.terms ?? {},
          })
          .returning();

        if (!newTransaction) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Transaktion konnte nicht erstellt werden',
          });
        }

        return newTransaction;
      }),

    /**
     * Get a single transaction by ID.
     */
    getById: companyProcedure
      .input(idSchema)
      .query(async ({ ctx, input }) => {
        const [transaction] = await ctx.db
          .select()
          .from(intercompanyTransactions)
          .where(
            and(
              eq(intercompanyTransactions.id, input.id),
              sql`(${intercompanyTransactions.requestingCompanyId} = ${ctx.companyId} OR ${intercompanyTransactions.providingCompanyId} = ${ctx.companyId})`,
            ),
          )
          .limit(1);

        if (!transaction) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Transaktion nicht gefunden',
          });
        }

        return transaction;
      }),
  }),
});
