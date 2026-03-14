import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, like, desc, asc, sql, count, isNull, inArray } from 'drizzle-orm';
import { tasks, projects, users, modules, deliverables, projectActivities } from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const taskStatusEnum = z.enum([
  'open',
  'in_progress',
  'review',
  'done',
  'blocked',
  'cancelled',
]);

const taskPriorityEnum = z.number().int().min(1).max(5);

const taskFilterSchema = z
  .object({
    projectId: z.number().int().positive().optional(),
    moduleId: z.number().int().positive().optional(),
    milestoneId: z.number().int().positive().optional(),
    assignedTo: z.number().int().positive().optional(),
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    search: z.string().max(200).optional(),
    dateRange: z
      .object({
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
      .optional(),
  })
  .merge(paginationSchema);

const createTaskSchema = z.object({
  projectId: z.number().int().positive(),
  moduleId: z.number().int().positive().optional(),
  milestoneId: z.number().int().positive().optional(),
  assignedTo: z.number().int().positive().optional(),
  projectTradeId: z.number().int().positive().optional(),
  projectRoleId: z.number().int().positive().optional(),
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  hoaiPhase: z.number().int().min(1).max(9).optional(),
  isHoaiBasic: z.boolean().optional(),
  isHoaiSpecial: z.boolean().optional(),
  status: taskStatusEnum.default('open'),
  priority: taskPriorityEnum.default(3),
  estimatedHours: z.number().min(0).optional(),
  effortDays: z.number().min(0).optional(),
  complexity: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  boardPosition: z.number().int().optional(),
  notes: z.string().optional(),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  id: z.number().int().positive(),
  moduleId: z.number().int().positive().nullable().optional(),
  milestoneId: z.number().int().positive().nullable().optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  projectTradeId: z.number().int().positive().nullable().optional(),
  projectRoleId: z.number().int().positive().nullable().optional(),
  title: z.string().min(1).max(500).optional(),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  hoaiPhase: z.number().int().min(1).max(9).optional(),
  isHoaiBasic: z.boolean().optional(),
  isHoaiSpecial: z.boolean().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  effortDays: z.number().min(0).nullable().optional(),
  complexity: z.enum(['low', 'medium', 'high', 'very_high']).nullable().optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  boardPosition: z.number().int().optional(),
  notes: z.string().optional(),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const reorderSchema = z.object({
  id: z.number().int().positive(),
  boardPosition: z.number().int(),
  status: taskStatusEnum.optional(),
});

const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
  status: taskStatusEnum,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyTaskCompany(db: any, taskId: number, companyId: number) {
  const [task] = await db
    .select({ id: tasks.id, projectId: tasks.projectId })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.id, taskId),
        eq(projects.companyId, companyId),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(1);

  if (!task) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Aufgabe nicht gefunden',
    });
  }
  return task;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const tasksRouter = createTRPCRouter({
  /**
   * List tasks with pagination and filtering.
   */
  list: companyProcedure
    .input(taskFilterSchema)
    .query(async ({ ctx, input }) => {
      const conditions: any[] = [
        isNull(tasks.deletedAt),
        eq(projects.companyId, ctx.companyId),
      ];

      if (input.projectId) conditions.push(eq(tasks.projectId, input.projectId));
      if (input.moduleId) conditions.push(eq(tasks.moduleId, input.moduleId));
      if (input.milestoneId) conditions.push(eq(tasks.milestoneId, input.milestoneId));
      if (input.assignedTo) conditions.push(eq(tasks.assignedTo, input.assignedTo));
      if (input.status) conditions.push(eq(tasks.status, input.status));
      if (input.priority) conditions.push(eq(tasks.priority, input.priority));
      if (input.search) conditions.push(like(tasks.title, `%${input.search}%`));
      if (input.dateRange?.from) {
        conditions.push(sql`${tasks.dueDate} >= ${input.dateRange.from.toISOString().split('T')[0]}`);
      }
      if (input.dateRange?.to) {
        conditions.push(sql`${tasks.dueDate} <= ${input.dateRange.to.toISOString().split('T')[0]}`);
      }

      const whereClause = and(...conditions);

      // Count
      const totalResult = await ctx.db
        .select({ total: count() })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(whereClause);
      const total = totalResult[0]?.total ?? 0;

      // Items
      const orderDir = input.sortOrder === 'desc' ? desc : asc;
      const orderField =
        input.sortBy === 'title' ? tasks.title :
        input.sortBy === 'status' ? tasks.status :
        input.sortBy === 'priority' ? tasks.priority :
        input.sortBy === 'dueDate' ? tasks.dueDate :
        tasks.createdAt;

      const items = await ctx.db
        .select({
          id: tasks.id,
          projectId: tasks.projectId,
          moduleId: tasks.moduleId,
          title: tasks.title,
          code: tasks.code,
          status: tasks.status,
          priority: tasks.priority,
          assignedTo: tasks.assignedTo,
          estimatedHours: tasks.estimatedHours,
          dueDate: tasks.dueDate,
          progressPercentage: tasks.progressPercentage,
          boardPosition: tasks.boardPosition,
          createdAt: tasks.createdAt,
        })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(whereClause)
        .orderBy(orderDir(orderField))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      // Batch fetch assignee names
      const assigneeIds = items.map(i => i.assignedTo).filter((id): id is number => id !== null);
      let assigneeMap: Record<number, string> = {};
      if (assigneeIds.length > 0) {
        const assignees = await ctx.db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(assigneeIds.map(id => sql`${id}`), sql`, `)})`);
        for (const a of assignees) {
          assigneeMap[a.id] = `${a.firstName} ${a.lastName}`;
        }
      }

      return {
        items: items.map((item) => ({
          id: item.id,
          projectId: item.projectId,
          moduleId: item.moduleId,
          title: item.title,
          code: item.code,
          status: item.status,
          priority: item.priority,
          assigneeName: item.assignedTo ? (assigneeMap[item.assignedTo] ?? null) : null,
          estimatedHours: item.estimatedHours,
          dueDate: item.dueDate,
          progressPercentage: item.progressPercentage ?? '0',
          boardPosition: item.boardPosition,
          createdAt: item.createdAt,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * Get a single task with full details.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      // Verify the task's project belongs to this company
      const taskInfo = await verifyTaskCompany(ctx.db, input.id, ctx.companyId);

      // Fetch full task record
      const [task] = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.id))
        .limit(1);

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Aufgabe nicht gefunden',
        });
      }

      // Fetch assignee name
      let assigneeName: string | null = null;
      if (task.assignedTo) {
        const [assignee] = await ctx.db
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, task.assignedTo))
          .limit(1);
        if (assignee) {
          assigneeName = `${assignee.firstName} ${assignee.lastName}`;
        }
      }

      // Fetch deliverables for this task
      const taskDeliverables = await ctx.db
        .select({
          id: deliverables.id,
          name: deliverables.name,
          code: deliverables.code,
          type: deliverables.type,
          status: deliverables.status,
          dueDate: deliverables.dueDate,
        })
        .from(deliverables)
        .where(eq(deliverables.taskId, input.id));

      return {
        ...task,
        assigneeName,
        deliverables: taskDeliverables,
      };
    }),

  /**
   * Create a new task within a project/module.
   */
  create: companyProcedure
    .input(createTaskSchema)
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

      // Verify module belongs to project (if provided)
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

      const { startDate, dueDate, estimatedHours, effortDays, ...rest } = input;

      const [newTask] = await ctx.db
        .insert(tasks)
        .values({
          ...rest,
          scope: 'project',
          startDate: startDate?.toISOString().split('T')[0],
          dueDate: dueDate?.toISOString().split('T')[0],
          estimatedHours: estimatedHours?.toString(),
          effortDays: effortDays?.toString(),
        })
        .returning();

      // Log activity
      await ctx.db.insert(projectActivities).values({
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: 'task_created',
        entityType: 'task',
        entityId: newTask!.id,
        description: `Aufgabe "${input.title}" erstellt`,
      });

      return newTask!;
    }),

  /**
   * Update a task's details, status, assignment, etc.
   */
  update: companyProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const taskInfo = await verifyTaskCompany(ctx.db, input.id, ctx.companyId);

      const { id, startDate, dueDate, estimatedHours, effortDays, progressPercentage, ...rest } = input;

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      if (startDate !== undefined) updateData.startDate = startDate?.toISOString().split('T')[0] ?? null;
      if (dueDate !== undefined) updateData.dueDate = dueDate?.toISOString().split('T')[0] ?? null;
      if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours?.toString() ?? null;
      if (effortDays !== undefined) updateData.effortDays = effortDays?.toString() ?? null;
      if (progressPercentage !== undefined) updateData.progressPercentage = progressPercentage.toString();

      // If status changed to 'done', set completedAt
      if (input.status === 'done') {
        updateData.completedAt = new Date();
        updateData.progressPercentage = '100';
      }

      const [updated] = await ctx.db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Aufgabe nicht gefunden',
        });
      }

      await ctx.db.insert(projectActivities).values({
        projectId: taskInfo.projectId,
        userId: ctx.session.user.id,
        action: 'task_updated',
        entityType: 'task',
        entityId: id,
        description: `Aufgabe aktualisiert`,
        changes: rest,
      });

      return updated;
    }),

  /**
   * Soft-delete a task.
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const taskInfo = await verifyTaskCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(tasks)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, input.id));

      await ctx.db.insert(projectActivities).values({
        projectId: taskInfo.projectId,
        userId: ctx.session.user.id,
        action: 'task_deleted',
        entityType: 'task',
        entityId: input.id,
        description: 'Aufgabe geloescht',
      });

      return { success: true };
    }),

  /**
   * Reorder a task on the kanban board.
   */
  reorder: companyProcedure
    .input(reorderSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyTaskCompany(ctx.db, input.id, ctx.companyId);

      const updateData: Record<string, unknown> = {
        boardPosition: input.boardPosition,
        updatedAt: new Date(),
      };

      if (input.status) {
        updateData.status = input.status;
        if (input.status === 'done') {
          updateData.completedAt = new Date();
          updateData.progressPercentage = '100';
        }
      }

      await ctx.db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, input.id));

      return { success: true };
    }),

  /**
   * Batch-update the status of multiple tasks.
   */
  bulkUpdateStatus: companyProcedure
    .input(bulkUpdateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify all tasks belong to projects in the company
      const taskRecords = await ctx.db
        .select({ id: tasks.id, projectId: tasks.projectId })
        .from(tasks)
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .where(
          and(
            sql`${tasks.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`,
            eq(projects.companyId, ctx.companyId),
            isNull(tasks.deletedAt),
          ),
        );

      if (taskRecords.length !== input.ids.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nicht alle Aufgaben gehoeren zu diesem Unternehmen',
        });
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };

      if (input.status === 'done') {
        updateData.completedAt = new Date();
        updateData.progressPercentage = '100';
      }

      await ctx.db
        .update(tasks)
        .set(updateData)
        .where(sql`${tasks.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);

      // Log project activities for each affected project
      const projectIds = [...new Set(taskRecords.map(t => t.projectId))];
      for (const projectId of projectIds) {
        await ctx.db.insert(projectActivities).values({
          projectId,
          userId: ctx.session.user.id,
          action: 'tasks_bulk_status_update',
          description: `Status von ${input.ids.length} Aufgaben auf "${input.status}" geaendert`,
          changes: { taskIds: input.ids, newStatus: input.status },
        });
      }

      return { updated: input.ids.length };
    }),
});
