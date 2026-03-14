import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, count, isNull, asc } from 'drizzle-orm';
import { modules, projects, tasks, projectActivities } from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const moduleStatusEnum = z.enum([
  'planned',
  'active',
  'completed',
  'on_hold',
  'cancelled',
]);

const listModulesSchema = z.object({
  projectId: z.number().int().positive(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const createModuleSchema = z.object({
  projectId: z.number().int().positive(),
  parentModuleId: z.number().int().positive().optional(),
  contractId: z.number().int().positive().optional(),
  name: z.string().min(1, 'Modulname ist erforderlich').max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  hoaiPhase: z.number().int().min(1).max(9).optional(),
  phaseType: z.string().max(50).optional(),
  percentage: z.number().min(0).max(100).optional(),
  hoaiFeeAllocated: z.number().min(0).optional(),
  goals: z.array(z.string()).optional(),
  relatedTrades: z.array(z.string()).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: moduleStatusEnum.default('planned'),
  plannedHours: z.number().min(0).optional(),
  budgetNet: z.number().min(0).optional(),
});

const updateModuleSchema = z.object({
  id: z.number().int().positive(),
  parentModuleId: z.number().int().positive().nullable().optional(),
  contractId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  hoaiPhase: z.number().int().min(1).max(9).optional(),
  phaseType: z.string().max(50).optional(),
  percentage: z.number().min(0).max(100).optional(),
  hoaiFeeAllocated: z.number().min(0).optional(),
  invoicingStatus: z.enum(['pending', 'partial', 'invoiced']).optional(),
  goals: z.array(z.string()).optional(),
  relatedTrades: z.array(z.string()).optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  actualStartDate: z.coerce.date().nullable().optional(),
  actualEndDate: z.coerce.date().nullable().optional(),
  status: moduleStatusEnum.optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  plannedHours: z.number().min(0).nullable().optional(),
  budgetNet: z.number().min(0).nullable().optional(),
});

const reorderSchema = z.object({
  id: z.number().int().positive(),
  sortOrder: z.number().int().min(0),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyModuleCompany(db: any, moduleId: number, companyId: number) {
  const [mod] = await db
    .select({ id: modules.id, projectId: modules.projectId })
    .from(modules)
    .innerJoin(projects, eq(modules.projectId, projects.id))
    .where(
      and(
        eq(modules.id, moduleId),
        eq(projects.companyId, companyId),
        isNull(modules.deletedAt),
      ),
    )
    .limit(1);

  if (!mod) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Modul nicht gefunden',
    });
  }
  return mod;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const modulesRouter = createTRPCRouter({
  /**
   * List all modules for a project, including task counts and progress.
   */
  list: companyProcedure
    .input(listModulesSchema)
    .query(async ({ ctx, input }) => {
      // Verify project belongs to company
      const [project] = await ctx.db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.companyId, ctx.companyId),
            isNull(projects.deletedAt),
          ),
        )
        .limit(1);

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Projekt nicht gefunden',
        });
      }

      const moduleList = await ctx.db
        .select()
        .from(modules)
        .where(
          and(
            eq(modules.projectId, input.projectId),
            isNull(modules.deletedAt),
          ),
        )
        .orderBy(asc(modules.sortOrder), asc(modules.id));

      // Get task counts per module
      const taskCounts = await ctx.db
        .select({
          moduleId: tasks.moduleId,
          total: count(),
          completed: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done')`,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, input.projectId),
            isNull(tasks.deletedAt),
            sql`${tasks.moduleId} IS NOT NULL`,
          ),
        )
        .groupBy(tasks.moduleId);

      const countMap: Record<number, { total: number; completed: number }> = {};
      for (const tc of taskCounts) {
        if (tc.moduleId) {
          countMap[tc.moduleId] = { total: tc.total, completed: tc.completed };
        }
      }

      return moduleList.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        hoaiPhase: m.hoaiPhase,
        phaseType: m.phaseType,
        status: m.status,
        sortOrder: m.sortOrder,
        progressPercentage: m.progressPercentage ?? '0',
        taskCount: countMap[m.id]?.total ?? 0,
        tasksCompleted: countMap[m.id]?.completed ?? 0,
        plannedHours: m.plannedHours,
        budgetNet: m.budgetNet,
        startDate: m.startDate,
        endDate: m.endDate,
      }));
    }),

  /**
   * Get a single module with detailed task counts.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const modInfo = await verifyModuleCompany(ctx.db, input.id, ctx.companyId);

      const [mod] = await ctx.db
        .select()
        .from(modules)
        .where(eq(modules.id, input.id))
        .limit(1);

      if (!mod) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Modul nicht gefunden',
        });
      }

      // Get task statistics
      const [taskStats] = await ctx.db
        .select({
          total: count(),
          completed: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done')`,
          inProgress: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'in_progress')`,
          open: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'open')`,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.moduleId, input.id),
            isNull(tasks.deletedAt),
          ),
        );

      return {
        ...mod,
        taskStats: taskStats ?? { total: 0, completed: 0, inProgress: 0, open: 0 },
      };
    }),

  /**
   * Create a new module within a project.
   */
  create: companyProcedure
    .input(createModuleSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify project belongs to company
      const [project] = await ctx.db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.companyId, ctx.companyId),
            isNull(projects.deletedAt),
          ),
        )
        .limit(1);

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Projekt nicht gefunden',
        });
      }

      // If parentModuleId provided, verify it belongs to same project
      if (input.parentModuleId) {
        const [parent] = await ctx.db
          .select({ id: modules.id })
          .from(modules)
          .where(
            and(
              eq(modules.id, input.parentModuleId),
              eq(modules.projectId, input.projectId),
              isNull(modules.deletedAt),
            ),
          )
          .limit(1);

        if (!parent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Uebergeordnetes Modul nicht gefunden',
          });
        }
      }

      const { startDate, endDate, plannedHours, budgetNet, percentage, hoaiFeeAllocated, ...rest } = input;

      const [newModule] = await ctx.db
        .insert(modules)
        .values({
          ...rest,
          scope: 'project',
          startDate: startDate?.toISOString().split('T')[0],
          endDate: endDate?.toISOString().split('T')[0],
          plannedHours: plannedHours?.toString(),
          budgetNet: budgetNet?.toString(),
          percentage: percentage?.toString(),
          hoaiFeeAllocated: hoaiFeeAllocated?.toString(),
        })
        .returning();

      await ctx.db.insert(projectActivities).values({
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: 'module_created',
        entityType: 'module',
        entityId: newModule!.id,
        description: `Modul "${input.name}" erstellt`,
      });

      return newModule!;
    }),

  /**
   * Update a module's details.
   */
  update: companyProcedure
    .input(updateModuleSchema)
    .mutation(async ({ ctx, input }) => {
      const modInfo = await verifyModuleCompany(ctx.db, input.id, ctx.companyId);

      const { id, startDate, endDate, actualStartDate, actualEndDate, plannedHours, budgetNet, percentage, hoaiFeeAllocated, progressPercentage, ...rest } = input;

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      if (startDate !== undefined) updateData.startDate = startDate?.toISOString().split('T')[0] ?? null;
      if (endDate !== undefined) updateData.endDate = endDate?.toISOString().split('T')[0] ?? null;
      if (actualStartDate !== undefined) updateData.actualStartDate = actualStartDate?.toISOString().split('T')[0] ?? null;
      if (actualEndDate !== undefined) updateData.actualEndDate = actualEndDate?.toISOString().split('T')[0] ?? null;
      if (plannedHours !== undefined) updateData.plannedHours = plannedHours?.toString() ?? null;
      if (budgetNet !== undefined) updateData.budgetNet = budgetNet?.toString() ?? null;
      if (percentage !== undefined) updateData.percentage = percentage?.toString() ?? null;
      if (hoaiFeeAllocated !== undefined) updateData.hoaiFeeAllocated = hoaiFeeAllocated?.toString() ?? null;
      if (progressPercentage !== undefined) updateData.progressPercentage = progressPercentage.toString();

      const [updated] = await ctx.db
        .update(modules)
        .set(updateData)
        .where(eq(modules.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Modul nicht gefunden',
        });
      }

      await ctx.db.insert(projectActivities).values({
        projectId: modInfo.projectId,
        userId: ctx.session.user.id,
        action: 'module_updated',
        entityType: 'module',
        entityId: id,
        description: 'Modul aktualisiert',
      });

      return updated;
    }),

  /**
   * Soft-delete a module.
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const modInfo = await verifyModuleCompany(ctx.db, input.id, ctx.companyId);

      // Soft-delete the module
      await ctx.db
        .update(modules)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(modules.id, input.id));

      // Soft-delete associated tasks
      await ctx.db
        .update(tasks)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(tasks.moduleId, input.id), isNull(tasks.deletedAt)));

      await ctx.db.insert(projectActivities).values({
        projectId: modInfo.projectId,
        userId: ctx.session.user.id,
        action: 'module_deleted',
        entityType: 'module',
        entityId: input.id,
        description: 'Modul geloescht',
      });

      return { success: true };
    }),

  /**
   * Reorder a module within its project.
   */
  reorder: companyProcedure
    .input(reorderSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyModuleCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(modules)
        .set({ sortOrder: input.sortOrder, updatedAt: new Date() })
        .where(eq(modules.id, input.id));

      return { success: true };
    }),
});
