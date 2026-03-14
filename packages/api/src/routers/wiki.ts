import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc, count, like } from 'drizzle-orm';
import { wikiNorms, wikiReports } from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const normFilterSchema = z
  .object({
    search: z.string().max(200).optional(),
    isActive: z.boolean().optional(),
  })
  .merge(paginationSchema);

const createNormSchema = z.object({
  code: z.string().min(1, 'Code ist erforderlich').max(50),
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  version: z.string().max(50).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  description: z.string().optional(),
  sections: z.any().optional(),
  trades: z.any().optional(),
  relations_data: z.any().optional(),
  isActive: z.boolean().optional(),
  metadata: z.any().optional(),
});

const updateNormSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(500).optional(),
  version: z.string().max(50).optional(),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sections: z.any().optional(),
  trades: z.any().optional(),
  relations_data: z.any().optional(),
  isActive: z.boolean().optional(),
  metadata: z.any().optional(),
});

const reportFilterSchema = z
  .object({
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const createReportSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  description: z.string().optional(),
  sections: z.any(),
  metadata: z.any().optional(),
});

const updateReportSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  sections: z.any().optional(),
  metadata: z.any().optional(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const wikiRouter = createTRPCRouter({
  // =========================================================================
  // Norms
  // =========================================================================

  /**
   * List wiki norms for the current company (includes system norms where companyId is null).
   */
  normsList: companyProcedure
    .input(normFilterSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        sql`(${wikiNorms.companyId} = ${ctx.companyId} OR ${wikiNorms.companyId} IS NULL)`,
      ];

      if (input.isActive !== undefined) {
        conditions.push(eq(wikiNorms.isActive, input.isActive));
      }
      if (input.search) {
        conditions.push(
          sql`(${like(wikiNorms.code, `%${input.search}%`)} OR ${like(wikiNorms.title, `%${input.search}%`)})`,
        );
      }

      const whereClause = and(...conditions);

      // Get total count
      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(wikiNorms)
        .where(whereClause);

      const total = countResult[0]?.total ?? 0;

      // Get items
      const items = await ctx.db
        .select({
          id: wikiNorms.id,
          companyId: wikiNorms.companyId,
          code: wikiNorms.code,
          title: wikiNorms.title,
          version: wikiNorms.version,
          validFrom: wikiNorms.validFrom,
          validUntil: wikiNorms.validUntil,
          description: wikiNorms.description,
          isActive: wikiNorms.isActive,
          createdAt: wikiNorms.createdAt,
          updatedAt: wikiNorms.updatedAt,
        })
        .from(wikiNorms)
        .where(whereClause)
        .orderBy(desc(wikiNorms.updatedAt))
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
   * Get a single wiki norm by ID.
   */
  normsGetById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [norm] = await ctx.db
        .select()
        .from(wikiNorms)
        .where(
          and(
            eq(wikiNorms.id, input.id),
            sql`(${wikiNorms.companyId} = ${ctx.companyId} OR ${wikiNorms.companyId} IS NULL)`,
          ),
        )
        .limit(1);

      if (!norm) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Norm nicht gefunden',
        });
      }

      return norm;
    }),

  /**
   * Create a new wiki norm.
   */
  normsCreate: companyProcedure
    .input(createNormSchema)
    .mutation(async ({ ctx, input }) => {
      const [norm] = await ctx.db
        .insert(wikiNorms)
        .values({
          companyId: ctx.companyId,
          code: input.code,
          title: input.title,
          version: input.version,
          validFrom: input.validFrom,
          validUntil: input.validUntil,
          description: input.description,
          sections: input.sections ?? [],
          trades: input.trades ?? [],
          relations_data: input.relations_data ?? [],
          isActive: input.isActive ?? true,
          metadata: input.metadata,
        })
        .returning();

      if (!norm) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Norm konnte nicht erstellt werden',
        });
      }

      return norm;
    }),

  /**
   * Update a wiki norm.
   */
  normsUpdate: companyProcedure
    .input(updateNormSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      // Verify norm belongs to company (system norms cannot be updated)
      const [existing] = await ctx.db
        .select({ id: wikiNorms.id })
        .from(wikiNorms)
        .where(
          and(
            eq(wikiNorms.id, id),
            eq(wikiNorms.companyId, ctx.companyId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Norm nicht gefunden oder keine Berechtigung',
        });
      }

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      const [updated] = await ctx.db
        .update(wikiNorms)
        .set(updateData)
        .where(
          and(
            eq(wikiNorms.id, id),
            eq(wikiNorms.companyId, ctx.companyId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Norm nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Soft-delete a wiki norm (set isActive to false).
   */
  normsDelete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: wikiNorms.id })
        .from(wikiNorms)
        .where(
          and(
            eq(wikiNorms.id, input.id),
            eq(wikiNorms.companyId, ctx.companyId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Norm nicht gefunden oder keine Berechtigung',
        });
      }

      await ctx.db
        .update(wikiNorms)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(wikiNorms.id, input.id),
            eq(wikiNorms.companyId, ctx.companyId),
          ),
        );

      return { success: true };
    }),

  // =========================================================================
  // Reports (Wiki Reports / templates)
  // =========================================================================

  /**
   * List wiki reports for the current company.
   */
  reportsList: companyProcedure
    .input(reportFilterSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(wikiReports.companyId, ctx.companyId),
      ];

      if (input.search) {
        conditions.push(like(wikiReports.title, `%${input.search}%`));
      }

      const whereClause = and(...conditions);

      // Get total count
      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(wikiReports)
        .where(whereClause);

      const total = countResult[0]?.total ?? 0;

      // Get items
      const items = await ctx.db
        .select({
          id: wikiReports.id,
          companyId: wikiReports.companyId,
          title: wikiReports.title,
          description: wikiReports.description,
          createdAt: wikiReports.createdAt,
          updatedAt: wikiReports.updatedAt,
        })
        .from(wikiReports)
        .where(whereClause)
        .orderBy(desc(wikiReports.updatedAt))
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
   * Get a single wiki report by ID.
   */
  reportsGetById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [report] = await ctx.db
        .select()
        .from(wikiReports)
        .where(
          and(
            eq(wikiReports.id, input.id),
            eq(wikiReports.companyId, ctx.companyId),
          ),
        )
        .limit(1);

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki-Bericht nicht gefunden',
        });
      }

      return report;
    }),

  /**
   * Create a new wiki report.
   */
  reportsCreate: companyProcedure
    .input(createReportSchema)
    .mutation(async ({ ctx, input }) => {
      const [report] = await ctx.db
        .insert(wikiReports)
        .values({
          companyId: ctx.companyId,
          title: input.title,
          description: input.description,
          sections: input.sections,
          metadata: input.metadata,
        })
        .returning();

      if (!report) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Wiki-Bericht konnte nicht erstellt werden',
        });
      }

      return report;
    }),

  /**
   * Update a wiki report.
   */
  reportsUpdate: companyProcedure
    .input(updateReportSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      const [updated] = await ctx.db
        .update(wikiReports)
        .set(updateData)
        .where(
          and(
            eq(wikiReports.id, id),
            eq(wikiReports.companyId, ctx.companyId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki-Bericht nicht gefunden',
        });
      }

      return updated;
    }),
});
