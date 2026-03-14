import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import { references } from '@vambiant/db';
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

const listReferencesSchema = z
  .object({
    buildingType: z.string().max(100).optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const locationSchema = z.object({
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
});

const createReferenceSchema = z.object({
  organizationId: z.number().int().positive().optional(),
  projectId: z.number().int().positive().optional(),
  title: z.string().min(1, 'Titel ist erforderlich').max(255),
  description: z.string().optional(),
  projectValue: z.string().optional(), // numeric as string for precision
  completionDate: z.string().optional(), // ISO date string
  location: locationSchema.optional(),
  buildingType: z.string().max(100).optional(),
  buildingTypeL2: z.string().max(100).optional(),
  teamSize: z.number().int().positive().optional(),
  trades: z.array(z.string()).optional(),
  activities: z
    .array(
      z.object({
        description: z.string().optional(),
        date: z.string().optional(),
        outcome: z.string().optional(),
      }),
    )
    .optional(),
  packages: z
    .array(
      z.object({
        name: z.string().optional(),
        scope: z.string().optional(),
        value: z.string().optional(),
      }),
    )
    .optional(),
  images: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateReferenceSchema = createReferenceSchema.partial().extend({
  id: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const referencesRouter = createTRPCRouter({
  /**
   * List references for the current company with pagination.
   */
  list: companyProcedure
    .input(listReferencesSchema)
    .query(async ({ ctx, input }) => {
      const conditions: any[] = [
        eq(references.companyId, ctx.companyId),
      ];

      if (input.buildingType) {
        conditions.push(eq(references.buildingType, input.buildingType));
      }
      if (input.search) {
        conditions.push(
          sql`(${references.title} ILIKE ${'%' + input.search + '%'} OR ${references.description} ILIKE ${'%' + input.search + '%'})`,
        );
      }

      const whereClause = and(...conditions);

      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(references)
        .where(whereClause);
      const total = countResult[0]?.total ?? 0;

      const items = await ctx.db
        .select({
          id: references.id,
          companyId: references.companyId,
          organizationId: references.organizationId,
          projectId: references.projectId,
          title: references.title,
          description: references.description,
          projectValue: references.projectValue,
          completionDate: references.completionDate,
          location: references.location,
          buildingType: references.buildingType,
          buildingTypeL2: references.buildingTypeL2,
          teamSize: references.teamSize,
          trades: references.trades,
          images: references.images,
          createdAt: references.createdAt,
          updatedAt: references.updatedAt,
        })
        .from(references)
        .where(whereClause)
        .orderBy(desc(references.createdAt))
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
   * Get a single reference by ID.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [reference] = await ctx.db
        .select()
        .from(references)
        .where(
          and(
            eq(references.id, input.id),
            eq(references.companyId, ctx.companyId),
          ),
        )
        .limit(1);

      if (!reference) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Referenz nicht gefunden',
        });
      }

      return reference;
    }),

  /**
   * Create a new reference.
   */
  create: companyProcedure
    .input(createReferenceSchema)
    .mutation(async ({ ctx, input }) => {
      const [newReference] = await ctx.db
        .insert(references)
        .values({
          companyId: ctx.companyId,
          organizationId: input.organizationId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          projectValue: input.projectValue,
          completionDate: input.completionDate,
          location: input.location,
          buildingType: input.buildingType,
          buildingTypeL2: input.buildingTypeL2,
          teamSize: input.teamSize,
          trades: input.trades ?? [],
          activities: input.activities ?? [],
          packages: input.packages ?? [],
          images: input.images ?? [],
          metadata: input.metadata ?? {},
        })
        .returning();

      if (!newReference) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Referenz konnte nicht erstellt werden',
        });
      }

      return newReference;
    }),

  /**
   * Update an existing reference.
   */
  update: companyProcedure
    .input(updateReferenceSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify reference belongs to company
      const [existing] = await ctx.db
        .select({ id: references.id })
        .from(references)
        .where(
          and(
            eq(references.id, input.id),
            eq(references.companyId, ctx.companyId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Referenz nicht gefunden',
        });
      }

      const { id, ...rest } = input;

      const [updated] = await ctx.db
        .update(references)
        .set({ ...rest, updatedAt: new Date() })
        .where(
          and(
            eq(references.id, id),
            eq(references.companyId, ctx.companyId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Referenz nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Delete a reference.
   * Note: The references table has no deletedAt column, so this performs a
   * hard delete. If soft-delete is needed, add a deletedAt column to the schema.
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: references.id })
        .from(references)
        .where(
          and(
            eq(references.id, input.id),
            eq(references.companyId, ctx.companyId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Referenz nicht gefunden',
        });
      }

      await ctx.db
        .delete(references)
        .where(
          and(
            eq(references.id, input.id),
            eq(references.companyId, ctx.companyId),
          ),
        );

      return { success: true };
    }),
});
