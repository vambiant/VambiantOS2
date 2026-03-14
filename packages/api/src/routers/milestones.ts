import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, count, isNull, asc, desc } from 'drizzle-orm';
import { milestones, projects, modules, tasks, projectActivities } from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const milestoneStatusEnum = z.enum([
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'cancelled',
]);

const listMilestonesSchema = z.object({
  projectId: z.number().int().positive(),
  status: milestoneStatusEnum.optional(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const createMilestoneSchema = z.object({
  projectId: z.number().int().positive(),
  moduleId: z.number().int().positive().optional(),
  name: z.string().min(1, 'Meilensteinname ist erforderlich').max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  targetDate: z.coerce.date().optional(),
  status: milestoneStatusEnum.default('pending'),
});

const updateMilestoneSchema = z.object({
  id: z.number().int().positive(),
  moduleId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  completedDate: z.coerce.date().nullable().optional(),
  status: milestoneStatusEnum.optional(),
  approvalNotes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyMilestoneCompany(db: any, milestoneId: number, companyId: number) {
  const [ms] = await db
    .select({ id: milestones.id, projectId: milestones.projectId })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(
      and(
        eq(milestones.id, milestoneId),
        eq(projects.companyId, companyId),
        isNull(milestones.deletedAt),
      ),
    )
    .limit(1);

  if (!ms) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Meilenstein nicht gefunden',
    });
  }
  return ms;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const milestonesRouter = createTRPCRouter({
  /**
   * List all milestones for a project.
   */
  list: companyProcedure
    .input(listMilestonesSchema)
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

      const conditions: any[] = [
        eq(milestones.projectId, input.projectId),
        isNull(milestones.deletedAt),
      ];

      if (input.status) {
        conditions.push(eq(milestones.status, input.status));
      }

      const milestoneList = await ctx.db
        .select()
        .from(milestones)
        .where(and(...conditions))
        .orderBy(asc(milestones.sortOrder), asc(milestones.targetDate), asc(milestones.id));

      // Get task counts per milestone
      const taskCounts = await ctx.db
        .select({
          milestoneId: tasks.milestoneId,
          total: count(),
          completed: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done')`,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, input.projectId),
            isNull(tasks.deletedAt),
            sql`${tasks.milestoneId} IS NOT NULL`,
          ),
        )
        .groupBy(tasks.milestoneId);

      const countMap: Record<number, { total: number; completed: number }> = {};
      for (const tc of taskCounts) {
        if (tc.milestoneId) {
          countMap[tc.milestoneId] = { total: tc.total, completed: tc.completed };
        }
      }

      // Fetch module names
      const moduleIds = milestoneList
        .map((m) => m.moduleId)
        .filter((id): id is number => id !== null);

      let moduleMap: Record<number, string> = {};
      if (moduleIds.length > 0) {
        const moduleRecords = await ctx.db
          .select({ id: modules.id, name: modules.name, hoaiPhase: modules.hoaiPhase })
          .from(modules)
          .where(sql`${modules.id} IN (${sql.join(moduleIds.map((id) => sql`${id}`), sql`, `)})`);
        for (const m of moduleRecords) {
          moduleMap[m.id] = m.hoaiPhase ? `LP ${m.hoaiPhase}` : m.name;
        }
      }

      return milestoneList.map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        description: m.description,
        status: m.status,
        targetDate: m.targetDate,
        completedDate: m.completedDate,
        moduleId: m.moduleId,
        moduleName: m.moduleId ? (moduleMap[m.moduleId] ?? null) : null,
        taskCount: countMap[m.id]?.total ?? 0,
        tasksCompleted: countMap[m.id]?.completed ?? 0,
        sortOrder: m.sortOrder,
        createdAt: m.createdAt,
      }));
    }),

  /**
   * Get a single milestone.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      await verifyMilestoneCompany(ctx.db, input.id, ctx.companyId);

      const [ms] = await ctx.db
        .select()
        .from(milestones)
        .where(eq(milestones.id, input.id))
        .limit(1);

      if (!ms) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meilenstein nicht gefunden',
        });
      }

      return ms;
    }),

  /**
   * Create a new milestone.
   */
  create: companyProcedure
    .input(createMilestoneSchema)
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

      // Verify module if provided
      if (input.moduleId) {
        const [mod] = await ctx.db
          .select({ id: modules.id })
          .from(modules)
          .where(
            and(
              eq(modules.id, input.moduleId),
              eq(modules.projectId, input.projectId),
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
      }

      const { targetDate, ...rest } = input;

      const [newMilestone] = await ctx.db
        .insert(milestones)
        .values({
          ...rest,
          scope: 'project',
          targetDate: targetDate?.toISOString().split('T')[0],
        })
        .returning();

      await ctx.db.insert(projectActivities).values({
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: 'milestone_created',
        entityType: 'milestone',
        entityId: newMilestone!.id,
        description: `Meilenstein "${input.name}" erstellt`,
      });

      return newMilestone!;
    }),

  /**
   * Update a milestone.
   */
  update: companyProcedure
    .input(updateMilestoneSchema)
    .mutation(async ({ ctx, input }) => {
      const msInfo = await verifyMilestoneCompany(ctx.db, input.id, ctx.companyId);

      const { id, targetDate, completedDate, ...rest } = input;

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      if (targetDate !== undefined) updateData.targetDate = targetDate?.toISOString().split('T')[0] ?? null;
      if (completedDate !== undefined) updateData.completedDate = completedDate?.toISOString().split('T')[0] ?? null;

      // If status changed to completed, set completedDate if not provided
      if (input.status === 'completed' && completedDate === undefined) {
        updateData.completedDate = new Date().toISOString().split('T')[0];
      }

      const [updated] = await ctx.db
        .update(milestones)
        .set(updateData)
        .where(eq(milestones.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Meilenstein nicht gefunden',
        });
      }

      await ctx.db.insert(projectActivities).values({
        projectId: msInfo.projectId,
        userId: ctx.session.user.id,
        action: 'milestone_updated',
        entityType: 'milestone',
        entityId: id,
        description: 'Meilenstein aktualisiert',
      });

      return updated;
    }),

  /**
   * Soft-delete a milestone.
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const msInfo = await verifyMilestoneCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(milestones)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(milestones.id, input.id));

      await ctx.db.insert(projectActivities).values({
        projectId: msInfo.projectId,
        userId: ctx.session.user.id,
        action: 'milestone_deleted',
        entityType: 'milestone',
        entityId: input.id,
        description: 'Meilenstein geloescht',
      });

      return { success: true };
    }),
});
