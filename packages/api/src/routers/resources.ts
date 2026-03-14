import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  resourceScenarios,
  resourceAllocations,
  resourceAlerts,
} from '@vambiant/db';
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

// -- Scenarios
const listScenariosSchema = z
  .object({
    isActive: z.boolean().optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const createScenarioSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  isBaseline: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

const updateScenarioSchema = createScenarioSchema.partial().extend({
  id: z.number().int().positive(),
});

// -- Allocations
const listAllocationsSchema = z
  .object({
    scenarioId: z.number().int().positive(),
    userId: z.number().int().positive().optional(),
    projectId: z.number().int().positive().optional(),
    status: z.string().max(30).optional(),
  })
  .merge(paginationSchema);

const createAllocationSchema = z.object({
  scenarioId: z.number().int().positive(),
  userId: z.number().int().positive(),
  projectId: z.number().int().positive(),
  moduleId: z.number().int().positive().optional(),
  startDate: z.string().min(1, 'Startdatum ist erforderlich'),
  endDate: z.string().min(1, 'Enddatum ist erforderlich'),
  hoursPerWeek: z.string().min(1, 'Stunden pro Woche ist erforderlich'),
  weeklyOverrides: z.record(z.number()).optional(),
  status: z.string().max(30).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateAllocationSchema = createAllocationSchema.partial().extend({
  id: z.number().int().positive(),
});

// -- Alerts
const listAlertsSchema = z
  .object({
    alertType: z.enum(['overallocation', 'underallocation', 'skill_gap', 'expiring_cert']).optional(),
    severity: z.enum(['info', 'warning', 'critical']).optional(),
    isResolved: z.boolean().optional(),
    userId: z.number().int().positive().optional(),
    projectId: z.number().int().positive().optional(),
  })
  .merge(paginationSchema);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyScenarioCompany(
  db: any,
  scenarioId: number,
  companyId: number,
) {
  const [scenario] = await db
    .select({ id: resourceScenarios.id })
    .from(resourceScenarios)
    .where(
      and(
        eq(resourceScenarios.id, scenarioId),
        eq(resourceScenarios.companyId, companyId),
      ),
    )
    .limit(1);

  if (!scenario) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Szenario nicht gefunden',
    });
  }
  return scenario;
}

// ---------------------------------------------------------------------------
// Sub-routers
// ---------------------------------------------------------------------------

const scenariosRouter = createTRPCRouter({
  /**
   * List resource scenarios for the company.
   */
  list: companyProcedure
    .input(listScenariosSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, isActive, search } = input;
      const offset = (page - 1) * pageSize;

      const conditions: any[] = [
        eq(resourceScenarios.companyId, ctx.companyId),
      ];

      if (isActive !== undefined) {
        conditions.push(eq(resourceScenarios.isActive, isActive));
      }
      if (search) {
        conditions.push(sql`${resourceScenarios.name} ILIKE ${'%' + search + '%'}`);
      }

      const where = and(...conditions);

      const [countResult] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(resourceScenarios)
        .where(where);

      const total = countResult?.total ?? 0;

      const items = await ctx.db
        .select()
        .from(resourceScenarios)
        .where(where)
        .orderBy(desc(resourceScenarios.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        items,
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      };
    }),

  /**
   * Get a single resource scenario by ID.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [scenario] = await ctx.db
        .select()
        .from(resourceScenarios)
        .where(
          and(
            eq(resourceScenarios.id, input.id),
            eq(resourceScenarios.companyId, ctx.companyId),
          ),
        )
        .limit(1);

      if (!scenario) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Szenario nicht gefunden',
        });
      }

      return scenario;
    }),

  /**
   * Create a new resource scenario.
   */
  create: companyProcedure
    .input(createScenarioSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(resourceScenarios)
        .values({
          companyId: ctx.companyId,
          name: input.name,
          description: input.description,
          createdBy: ctx.session.user.id,
          isActive: input.isActive,
          isBaseline: input.isBaseline,
          metadata: input.metadata,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Szenario konnte nicht erstellt werden',
        });
      }

      return created;
    }),

  /**
   * Update a resource scenario.
   */
  update: companyProcedure
    .input(updateScenarioSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      await verifyScenarioCompany(ctx.db, id, ctx.companyId);

      const [updated] = await ctx.db
        .update(resourceScenarios)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(resourceScenarios.id, id),
            eq(resourceScenarios.companyId, ctx.companyId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Szenario nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Soft delete a resource scenario (set isActive to false).
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyScenarioCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(resourceScenarios)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(resourceScenarios.id, input.id),
            eq(resourceScenarios.companyId, ctx.companyId),
          ),
        );

      return { success: true };
    }),
});

const allocationsRouter = createTRPCRouter({
  /**
   * List allocations for a scenario.
   */
  list: companyProcedure
    .input(listAllocationsSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, scenarioId, userId, projectId, status } = input;
      const offset = (page - 1) * pageSize;

      // Verify scenario belongs to company
      await verifyScenarioCompany(ctx.db, scenarioId, ctx.companyId);

      const conditions: any[] = [
        eq(resourceAllocations.scenarioId, scenarioId),
      ];

      if (userId) conditions.push(eq(resourceAllocations.userId, userId));
      if (projectId) conditions.push(eq(resourceAllocations.projectId, projectId));
      if (status) conditions.push(eq(resourceAllocations.status, status));

      const where = and(...conditions);

      const [countResult] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(resourceAllocations)
        .where(where);

      const total = countResult?.total ?? 0;

      const items = await ctx.db
        .select()
        .from(resourceAllocations)
        .where(where)
        .orderBy(desc(resourceAllocations.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        items,
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      };
    }),

  /**
   * Create a new resource allocation.
   */
  create: companyProcedure
    .input(createAllocationSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyScenarioCompany(ctx.db, input.scenarioId, ctx.companyId);

      const [created] = await ctx.db
        .insert(resourceAllocations)
        .values({
          scenarioId: input.scenarioId,
          userId: input.userId,
          projectId: input.projectId,
          moduleId: input.moduleId,
          startDate: input.startDate,
          endDate: input.endDate,
          hoursPerWeek: input.hoursPerWeek,
          weeklyOverrides: input.weeklyOverrides ?? {},
          status: input.status ?? 'planned',
          notes: input.notes,
          metadata: input.metadata,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Allokation konnte nicht erstellt werden',
        });
      }

      return created;
    }),

  /**
   * Update an allocation.
   */
  update: companyProcedure
    .input(updateAllocationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Look up the allocation and verify its scenario belongs to company
      const [existing] = await ctx.db
        .select({
          id: resourceAllocations.id,
          scenarioId: resourceAllocations.scenarioId,
        })
        .from(resourceAllocations)
        .where(eq(resourceAllocations.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Allokation nicht gefunden',
        });
      }

      await verifyScenarioCompany(ctx.db, existing.scenarioId, ctx.companyId);

      // If scenarioId is changing, verify new scenario too
      if (data.scenarioId && data.scenarioId !== existing.scenarioId) {
        await verifyScenarioCompany(ctx.db, data.scenarioId, ctx.companyId);
      }

      const [updated] = await ctx.db
        .update(resourceAllocations)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(resourceAllocations.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Allokation nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Delete an allocation (hard delete).
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({
          id: resourceAllocations.id,
          scenarioId: resourceAllocations.scenarioId,
        })
        .from(resourceAllocations)
        .where(eq(resourceAllocations.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Allokation nicht gefunden',
        });
      }

      await verifyScenarioCompany(ctx.db, existing.scenarioId, ctx.companyId);

      await ctx.db
        .delete(resourceAllocations)
        .where(eq(resourceAllocations.id, input.id));

      return { success: true };
    }),
});

const alertsRouter = createTRPCRouter({
  /**
   * List resource alerts for the company.
   */
  list: companyProcedure
    .input(listAlertsSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, alertType, severity, isResolved, userId, projectId } = input;
      const offset = (page - 1) * pageSize;

      const conditions: any[] = [
        eq(resourceAlerts.companyId, ctx.companyId),
      ];

      if (alertType) conditions.push(eq(resourceAlerts.alertType, alertType));
      if (severity) conditions.push(eq(resourceAlerts.severity, severity));
      if (isResolved !== undefined) {
        conditions.push(eq(resourceAlerts.isResolved, isResolved));
      }
      if (userId) conditions.push(eq(resourceAlerts.userId, userId));
      if (projectId) conditions.push(eq(resourceAlerts.projectId, projectId));

      const where = and(...conditions);

      const [countResult] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(resourceAlerts)
        .where(where);

      const total = countResult?.total ?? 0;

      const items = await ctx.db
        .select()
        .from(resourceAlerts)
        .where(where)
        .orderBy(desc(resourceAlerts.createdAt))
        .limit(pageSize)
        .offset(offset);

      return {
        items,
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      };
    }),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const resourcesRouter = createTRPCRouter({
  scenarios: scenariosRouter,
  allocations: allocationsRouter,
  alerts: alertsRouter,
});
