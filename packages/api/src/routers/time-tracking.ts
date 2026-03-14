import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, count, isNull, desc, asc, gte, lte, sum } from 'drizzle-orm';
import { timeEntries, timeEntryTemplates, projects, modules, tasks, users } from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const timeEntryStatusEnum = z.enum(['draft', 'submitted', 'approved', 'rejected']);

const entriesFilterSchema = z
  .object({
    userId: z.number().int().positive().optional(),
    projectId: z.number().int().positive().optional(),
    moduleId: z.number().int().positive().optional(),
    taskId: z.number().int().positive().optional(),
    status: timeEntryStatusEnum.optional(),
    billable: z.boolean().optional(),
    dateRange: z
      .object({
        from: z.coerce.date(),
        to: z.coerce.date(),
      })
      .optional(),
  })
  .merge(paginationSchema);

const createEntrySchema = z.object({
  projectId: z.number().int().positive().optional(),
  moduleId: z.number().int().positive().optional(),
  taskId: z.number().int().positive().optional(),
  date: z.coerce.date(),
  hours: z.number().min(0.25, 'Mindestens 0,25 Stunden').max(24, 'Maximal 24 Stunden'),
  description: z.string().optional(),
  billable: z.boolean().default(true),
  workType: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
});

const updateEntrySchema = createEntrySchema.partial().extend({
  id: z.number().int().positive(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const submitSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
});

const approveRejectSchema = z.object({
  id: z.number().int().positive(),
  comment: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  templateType: z.enum(['favorite', 'recurring']),
  projectId: z.number().int().positive().optional(),
  moduleId: z.number().int().positive().optional(),
  taskId: z.number().int().positive().optional(),
  hours: z.number().min(0.25).max(24).optional(),
  description: z.string().optional(),
  recurrence: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      days: z.array(z.number().int().min(0).max(6)).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .optional(),
});

const weeklyStatsSchema = z.object({
  userId: z.number().int().positive().optional(),
  weekStart: z.coerce.date(),
});

const projectStatsSchema = z.object({
  projectId: z.number().int().positive(),
  dateRange: z
    .object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const timeTrackingRouter = createTRPCRouter({
  entries: createTRPCRouter({
    /**
     * List time entries with pagination and filtering.
     */
    list: companyProcedure
      .input(entriesFilterSchema)
      .query(async ({ ctx, input }) => {
        const conditions: any[] = [
          eq(timeEntries.companyId, ctx.companyId),
          isNull(timeEntries.deletedAt),
        ];

        // Default to current user if no userId filter
        const targetUserId = input.userId ?? ctx.session.user.id;
        conditions.push(eq(timeEntries.userId, targetUserId));

        if (input.projectId) conditions.push(eq(timeEntries.projectId, input.projectId));
        if (input.moduleId) conditions.push(eq(timeEntries.moduleId, input.moduleId));
        if (input.taskId) conditions.push(eq(timeEntries.taskId, input.taskId));
        if (input.status) conditions.push(eq(timeEntries.status, input.status));
        if (input.billable !== undefined) conditions.push(eq(timeEntries.billable, input.billable));
        if (input.dateRange) {
          conditions.push(sql`${timeEntries.date} >= ${input.dateRange.from.toISOString().split('T')[0]}`);
          conditions.push(sql`${timeEntries.date} <= ${input.dateRange.to.toISOString().split('T')[0]}`);
        }

        const whereClause = and(...conditions);

        const countResult = await ctx.db
          .select({ total: count() })
          .from(timeEntries)
          .where(whereClause);
        const total = countResult[0]?.total ?? 0;

        const items = await ctx.db
          .select({
            id: timeEntries.id,
            date: timeEntries.date,
            hours: timeEntries.hours,
            description: timeEntries.description,
            billable: timeEntries.billable,
            status: timeEntries.status,
            workType: timeEntries.workType,
            projectId: timeEntries.projectId,
            moduleId: timeEntries.moduleId,
            taskId: timeEntries.taskId,
            userId: timeEntries.userId,
            createdAt: timeEntries.createdAt,
          })
          .from(timeEntries)
          .where(whereClause)
          .orderBy(desc(timeEntries.date), desc(timeEntries.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        // Batch fetch project, module, task, user names
        const projectIds = [...new Set(items.map(i => i.projectId).filter((id): id is number => id !== null))];
        const moduleIds = [...new Set(items.map(i => i.moduleId).filter((id): id is number => id !== null))];
        const taskIds = [...new Set(items.map(i => i.taskId).filter((id): id is number => id !== null))];
        const userIds = [...new Set(items.map(i => i.userId))];

        let projectMap: Record<number, string> = {};
        if (projectIds.length > 0) {
          const recs = await ctx.db
            .select({ id: projects.id, name: projects.name })
            .from(projects)
            .where(sql`${projects.id} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) projectMap[r.id] = r.name;
        }

        let moduleMap: Record<number, string> = {};
        if (moduleIds.length > 0) {
          const recs = await ctx.db
            .select({ id: modules.id, name: modules.name })
            .from(modules)
            .where(sql`${modules.id} IN (${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) moduleMap[r.id] = r.name;
        }

        let taskMap: Record<number, string> = {};
        if (taskIds.length > 0) {
          const recs = await ctx.db
            .select({ id: tasks.id, title: tasks.title })
            .from(tasks)
            .where(sql`${tasks.id} IN (${sql.join(taskIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) taskMap[r.id] = r.title;
        }

        let userMap: Record<number, string> = {};
        if (userIds.length > 0) {
          const recs = await ctx.db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) userMap[r.id] = `${r.firstName} ${r.lastName}`;
        }

        return {
          items: items.map((item) => ({
            id: item.id,
            date: item.date,
            hours: item.hours,
            description: item.description,
            billable: item.billable,
            status: item.status,
            workType: item.workType,
            projectName: item.projectId ? (projectMap[item.projectId] ?? null) : null,
            moduleName: item.moduleId ? (moduleMap[item.moduleId] ?? null) : null,
            taskTitle: item.taskId ? (taskMap[item.taskId] ?? null) : null,
            userName: userMap[item.userId] ?? 'Unbekannt',
            createdAt: item.createdAt,
          })),
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Create a new time entry.
     */
    create: companyProcedure
      .input(createEntrySchema)
      .mutation(async ({ ctx, input }) => {
        // If projectId provided, verify it belongs to company
        if (input.projectId) {
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
        }

        const { date, hours, ...rest } = input;

        const [newEntry] = await ctx.db
          .insert(timeEntries)
          .values({
            ...rest,
            userId: ctx.session.user.id,
            companyId: ctx.companyId,
            date: date.toISOString().split('T')[0]!,
            hours: hours.toString(),
            status: 'draft',
          })
          .returning();

        return newEntry!;
      }),

    /**
     * Update an existing time entry (only if draft or rejected).
     */
    update: companyProcedure
      .input(updateEntrySchema)
      .mutation(async ({ ctx, input }) => {
        const [entry] = await ctx.db
          .select({ id: timeEntries.id, status: timeEntries.status, userId: timeEntries.userId })
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.id, input.id),
              eq(timeEntries.companyId, ctx.companyId),
              isNull(timeEntries.deletedAt),
            ),
          )
          .limit(1);

        if (!entry) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Zeiteintrag nicht gefunden',
          });
        }

        if (entry.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Nicht berechtigt',
          });
        }

        if (entry.status !== 'draft' && entry.status !== 'rejected') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nur Entwuerfe und abgelehnte Eintraege koennen bearbeitet werden',
          });
        }

        const { id, date, hours, ...rest } = input;

        const updateData: Record<string, unknown> = {
          ...rest,
          updatedAt: new Date(),
        };

        if (date !== undefined) updateData.date = date.toISOString().split('T')[0];
        if (hours !== undefined) updateData.hours = hours.toString();

        // Reset status to draft if it was rejected
        if (entry.status === 'rejected') {
          updateData.status = 'draft';
        }

        const [updated] = await ctx.db
          .update(timeEntries)
          .set(updateData)
          .where(eq(timeEntries.id, id))
          .returning();

        return updated!;
      }),

    /**
     * Soft-delete a time entry (only if draft).
     */
    delete: companyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        const [entry] = await ctx.db
          .select({ id: timeEntries.id, status: timeEntries.status, userId: timeEntries.userId })
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.id, input.id),
              eq(timeEntries.companyId, ctx.companyId),
              isNull(timeEntries.deletedAt),
            ),
          )
          .limit(1);

        if (!entry) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Zeiteintrag nicht gefunden',
          });
        }

        if (entry.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Nicht berechtigt',
          });
        }

        if (entry.status !== 'draft') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nur Entwuerfe koennen geloescht werden',
          });
        }

        await ctx.db
          .update(timeEntries)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(timeEntries.id, input.id));

        return { success: true };
      }),

    /**
     * Submit time entries for approval.
     */
    submit: companyProcedure
      .input(submitSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify all entries belong to current user and company, and are in draft status
        const entries = await ctx.db
          .select({ id: timeEntries.id, status: timeEntries.status, userId: timeEntries.userId })
          .from(timeEntries)
          .where(
            and(
              sql`${timeEntries.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`,
              eq(timeEntries.companyId, ctx.companyId),
              isNull(timeEntries.deletedAt),
            ),
          );

        if (entries.length !== input.ids.length) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Nicht alle Zeiteintraege gefunden',
          });
        }

        for (const entry of entries) {
          if (entry.userId !== ctx.session.user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Nicht berechtigt',
            });
          }
          if (entry.status !== 'draft') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Nur Entwuerfe koennen eingereicht werden',
            });
          }
        }

        await ctx.db
          .update(timeEntries)
          .set({ status: 'submitted', updatedAt: new Date() })
          .where(sql`${timeEntries.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);

        return { submitted: input.ids.length };
      }),

    /**
     * Approve a submitted time entry.
     */
    approve: companyProcedure
      .input(approveRejectSchema)
      .mutation(async ({ ctx, input }) => {
        const [entry] = await ctx.db
          .select({ id: timeEntries.id, status: timeEntries.status })
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.id, input.id),
              eq(timeEntries.companyId, ctx.companyId),
              isNull(timeEntries.deletedAt),
            ),
          )
          .limit(1);

        if (!entry) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Zeiteintrag nicht gefunden',
          });
        }

        if (entry.status !== 'submitted') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nur eingereichte Eintraege koennen genehmigt werden',
          });
        }

        await ctx.db
          .update(timeEntries)
          .set({
            status: 'approved',
            approvedBy: ctx.session.user.id,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(timeEntries.id, input.id));

        return { success: true };
      }),

    /**
     * Reject a submitted time entry.
     */
    reject: companyProcedure
      .input(approveRejectSchema)
      .mutation(async ({ ctx, input }) => {
        const [entry] = await ctx.db
          .select({ id: timeEntries.id, status: timeEntries.status, metadata: timeEntries.metadata })
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.id, input.id),
              eq(timeEntries.companyId, ctx.companyId),
              isNull(timeEntries.deletedAt),
            ),
          )
          .limit(1);

        if (!entry) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Zeiteintrag nicht gefunden',
          });
        }

        if (entry.status !== 'submitted') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nur eingereichte Eintraege koennen abgelehnt werden',
          });
        }

        const metadata = {
          ...(entry.metadata as object ?? {}),
          rejectionComment: input.comment,
          rejectedBy: ctx.session.user.id,
          rejectedAt: new Date().toISOString(),
        };

        await ctx.db
          .update(timeEntries)
          .set({
            status: 'rejected',
            metadata,
            updatedAt: new Date(),
          })
          .where(eq(timeEntries.id, input.id));

        return { success: true };
      }),
  }),

  templates: createTRPCRouter({
    /**
     * List the current user's time entry templates/favorites.
     */
    list: companyProcedure
      .query(async ({ ctx }) => {
        const templateList = await ctx.db
          .select({
            id: timeEntryTemplates.id,
            name: timeEntryTemplates.name,
            templateType: timeEntryTemplates.templateType,
            projectId: timeEntryTemplates.projectId,
            moduleId: timeEntryTemplates.moduleId,
            taskId: timeEntryTemplates.taskId,
            hours: timeEntryTemplates.hours,
            description: timeEntryTemplates.description,
            isActive: timeEntryTemplates.isActive,
          })
          .from(timeEntryTemplates)
          .where(
            and(
              eq(timeEntryTemplates.companyId, ctx.companyId),
              eq(timeEntryTemplates.userId, ctx.session.user.id),
            ),
          )
          .orderBy(asc(timeEntryTemplates.name));

        // Batch fetch names
        const projectIds = [...new Set(templateList.map(t => t.projectId).filter((id): id is number => id !== null))];
        const moduleIds = [...new Set(templateList.map(t => t.moduleId).filter((id): id is number => id !== null))];
        const taskIds = [...new Set(templateList.map(t => t.taskId).filter((id): id is number => id !== null))];

        let projectMap: Record<number, string> = {};
        if (projectIds.length > 0) {
          const recs = await ctx.db
            .select({ id: projects.id, name: projects.name })
            .from(projects)
            .where(sql`${projects.id} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) projectMap[r.id] = r.name;
        }

        let moduleMap: Record<number, string> = {};
        if (moduleIds.length > 0) {
          const recs = await ctx.db
            .select({ id: modules.id, name: modules.name })
            .from(modules)
            .where(sql`${modules.id} IN (${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) moduleMap[r.id] = r.name;
        }

        let taskMap: Record<number, string> = {};
        if (taskIds.length > 0) {
          const recs = await ctx.db
            .select({ id: tasks.id, title: tasks.title })
            .from(tasks)
            .where(sql`${tasks.id} IN (${sql.join(taskIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) taskMap[r.id] = r.title;
        }

        return templateList.map((t) => ({
          id: t.id,
          name: t.name,
          templateType: t.templateType,
          projectName: t.projectId ? (projectMap[t.projectId] ?? null) : null,
          moduleName: t.moduleId ? (moduleMap[t.moduleId] ?? null) : null,
          taskTitle: t.taskId ? (taskMap[t.taskId] ?? null) : null,
          hours: t.hours,
          description: t.description,
          isActive: t.isActive,
        }));
      }),

    /**
     * Save a new time entry template or favorite.
     */
    create: companyProcedure
      .input(createTemplateSchema)
      .mutation(async ({ ctx, input }) => {
        // If projectId provided, verify it belongs to company
        if (input.projectId) {
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
        }

        const { hours, ...rest } = input;

        const [newTemplate] = await ctx.db
          .insert(timeEntryTemplates)
          .values({
            ...rest,
            hours: hours?.toString(),
            companyId: ctx.companyId,
            userId: ctx.session.user.id,
          })
          .returning();

        return newTemplate!;
      }),
  }),

  stats: createTRPCRouter({
    /**
     * Get weekly time summary for a user.
     */
    weekly: companyProcedure
      .input(weeklyStatsSchema)
      .query(async ({ ctx, input }) => {
        const targetUserId = input.userId ?? ctx.session.user.id;
        const weekStartStr = input.weekStart.toISOString().split('T')[0]!;
        const weekEnd = new Date(input.weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = weekEnd.toISOString().split('T')[0]!;

        // Get daily entries with project info
        const entries = await ctx.db
          .select({
            date: timeEntries.date,
            hours: timeEntries.hours,
            billable: timeEntries.billable,
            projectId: timeEntries.projectId,
          })
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.companyId, ctx.companyId),
              eq(timeEntries.userId, targetUserId),
              isNull(timeEntries.deletedAt),
              sql`${timeEntries.date} >= ${weekStartStr}`,
              sql`${timeEntries.date} <= ${weekEndStr}`,
            ),
          );

        // Build daily breakdown
        const dailyMap: Record<string, { hours: number; projects: Record<number, number> }> = {};
        const projectTotals: Record<number, { hours: number; billableHours: number }> = {};
        let totalHours = 0;

        for (const entry of entries) {
          const dateKey = entry.date;
          const hours = parseFloat(entry.hours);
          totalHours += hours;

          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { hours: 0, projects: {} };
          }
          dailyMap[dateKey]!.hours += hours;

          if (entry.projectId) {
            dailyMap[dateKey]!.projects[entry.projectId] = (dailyMap[dateKey]!.projects[entry.projectId] ?? 0) + hours;

            if (!projectTotals[entry.projectId]) {
              projectTotals[entry.projectId] = { hours: 0, billableHours: 0 };
            }
            projectTotals[entry.projectId]!.hours += hours;
            if (entry.billable) {
              projectTotals[entry.projectId]!.billableHours += hours;
            }
          }
        }

        // Fetch project names
        const projectIds = Object.keys(projectTotals).map(Number);
        let projectNameMap: Record<number, string> = {};
        if (projectIds.length > 0) {
          const recs = await ctx.db
            .select({ id: projects.id, name: projects.name })
            .from(projects)
            .where(sql`${projects.id} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) projectNameMap[r.id] = r.name;
        }

        // Build daily breakdown array
        const dailyBreakdown = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(input.weekStart);
          d.setDate(d.getDate() + i);
          const dateKey = d.toISOString().split('T')[0]!;
          const dayData = dailyMap[dateKey];

          dailyBreakdown.push({
            date: dateKey,
            hours: dayData?.hours ?? 0,
            projectBreakdown: dayData
              ? Object.entries(dayData.projects).map(([pid, hrs]) => ({
                  projectId: Number(pid),
                  projectName: projectNameMap[Number(pid)] ?? 'Unbekannt',
                  hours: hrs,
                }))
              : [],
          });
        }

        return {
          userId: targetUserId,
          weekStart: input.weekStart,
          totalHours,
          targetHours: 40,
          dailyBreakdown,
          projectTotals: Object.entries(projectTotals).map(([pid, data]) => ({
            projectId: Number(pid),
            projectName: projectNameMap[Number(pid)] ?? 'Unbekannt',
            hours: data.hours,
            billableHours: data.billableHours,
          })),
        };
      }),

    /**
     * Get time breakdown by project.
     */
    project: companyProcedure
      .input(projectStatsSchema)
      .query(async ({ ctx, input }) => {
        // Verify project belongs to company
        const [project] = await ctx.db
          .select({ id: projects.id, budgetHours: projects.budgetHours })
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
          eq(timeEntries.companyId, ctx.companyId),
          eq(timeEntries.projectId, input.projectId),
          isNull(timeEntries.deletedAt),
        ];

        if (input.dateRange?.from) {
          conditions.push(sql`${timeEntries.date} >= ${input.dateRange.from.toISOString().split('T')[0]}`);
        }
        if (input.dateRange?.to) {
          conditions.push(sql`${timeEntries.date} <= ${input.dateRange.to.toISOString().split('T')[0]}`);
        }

        const whereClause = and(...conditions);

        // By user
        const byUserRaw = await ctx.db
          .select({
            userId: timeEntries.userId,
            hours: sql<string>`SUM(CAST(${timeEntries.hours} AS NUMERIC))`,
            billableHours: sql<string>`SUM(CASE WHEN ${timeEntries.billable} THEN CAST(${timeEntries.hours} AS NUMERIC) ELSE 0 END)`,
          })
          .from(timeEntries)
          .where(whereClause)
          .groupBy(timeEntries.userId);

        const userIds = byUserRaw.map(r => r.userId);
        let userMap: Record<number, string> = {};
        if (userIds.length > 0) {
          const recs = await ctx.db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(sql`${users.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) userMap[r.id] = `${r.firstName} ${r.lastName}`;
        }

        // By module
        const byModuleRaw = await ctx.db
          .select({
            moduleId: timeEntries.moduleId,
            hours: sql<string>`SUM(CAST(${timeEntries.hours} AS NUMERIC))`,
          })
          .from(timeEntries)
          .where(and(...conditions, sql`${timeEntries.moduleId} IS NOT NULL`))
          .groupBy(timeEntries.moduleId);

        const moduleIds = byModuleRaw.map(r => r.moduleId).filter((id): id is number => id !== null);
        let moduleMap: Record<number, { name: string; plannedHours: string | null }> = {};
        if (moduleIds.length > 0) {
          const recs = await ctx.db
            .select({ id: modules.id, name: modules.name, plannedHours: modules.plannedHours })
            .from(modules)
            .where(sql`${modules.id} IN (${sql.join(moduleIds.map(id => sql`${id}`), sql`, `)})`);
          for (const r of recs) moduleMap[r.id] = { name: r.name, plannedHours: r.plannedHours };
        }

        // By status
        const byStatusRaw = await ctx.db
          .select({
            status: timeEntries.status,
            hours: sql<string>`SUM(CAST(${timeEntries.hours} AS NUMERIC))`,
          })
          .from(timeEntries)
          .where(whereClause)
          .groupBy(timeEntries.status);

        const statusMap: Record<string, number> = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
        for (const s of byStatusRaw) {
          if (s.status) statusMap[s.status] = parseFloat(s.hours);
        }

        const totalHours = byUserRaw.reduce((sum, r) => sum + parseFloat(r.hours), 0);
        const billableHours = byUserRaw.reduce((sum, r) => sum + parseFloat(r.billableHours), 0);
        const budgetHours = project.budgetHours ? parseFloat(project.budgetHours) : 0;

        return {
          projectId: input.projectId,
          totalHours,
          billableHours,
          budgetHours,
          budgetUsedPercentage: budgetHours > 0 ? Math.round((totalHours / budgetHours) * 100) : 0,
          byUser: byUserRaw.map(r => ({
            userId: r.userId,
            userName: userMap[r.userId] ?? 'Unbekannt',
            hours: parseFloat(r.hours),
            billableHours: parseFloat(r.billableHours),
          })),
          byModule: byModuleRaw.map(r => ({
            moduleId: r.moduleId!,
            moduleName: r.moduleId ? (moduleMap[r.moduleId]?.name ?? 'Unbekannt') : 'Unbekannt',
            hours: parseFloat(r.hours),
            plannedHours: r.moduleId ? parseFloat(moduleMap[r.moduleId]?.plannedHours ?? '0') : 0,
          })),
          byStatus: statusMap,
        };
      }),
  }),
});
