import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, like, desc, asc, sql, count, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import {
  projects,
  projectUsers,
  projectActivities,
  projectRevisions,
  organizations,
  users,
  companyUser,
} from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

const projectStatusEnum = z.enum([
  'draft',
  'active',
  'on_hold',
  'completed',
  'archived',
  'cancelled',
]);

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const projectFilterSchema = z
  .object({
    status: projectStatusEnum.optional(),
    projectType: z.string().optional(),
    search: z.string().max(200).optional(),
    clientId: z.number().int().positive().optional(),
    dateRange: z
      .object({
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
      .optional(),
  })
  .merge(paginationSchema);

const addressSchema = z.object({
  street: z.string().max(255).optional(),
  streetNumber: z.string().max(20).optional(),
  zip: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  bundesland: z.string().max(100).optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(1, 'Projektname ist erforderlich').max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  clientId: z.number().int().positive().optional(),
  commissionerId: z.number().int().positive().optional(),
  projectManagerId: z.number().int().positive().optional(),
  parentProjectId: z.number().int().positive().optional(),
  templateId: z.number().int().positive().optional(),
  projectType: z.string().max(50).optional(),
  status: projectStatusEnum.default('draft'),
  hoaiZone: z.number().int().min(1).max(5).optional(),
  useBim: z.boolean().optional(),
  bimStandard: z.string().max(50).optional(),
  timeTrackingEnabled: z.boolean().optional(),
  address: addressSchema.optional(),
  buildingType: z.string().max(100).optional(),
  buildingTypeL2: z.string().max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  budgetNet: z.number().min(0, 'Budget darf nicht negativ sein').optional(),
  estimatedHours: z.number().min(0).optional(),
  budgetHours: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).default('EUR'),
  quickNote: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) return data.startDate <= data.endDate;
    return true;
  },
  { message: 'Startdatum muss vor dem Enddatum liegen', path: ['endDate'] },
);

const updateProjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  clientId: z.number().int().positive().nullable().optional(),
  commissionerId: z.number().int().positive().nullable().optional(),
  projectManagerId: z.number().int().positive().nullable().optional(),
  parentProjectId: z.number().int().positive().nullable().optional(),
  projectType: z.string().max(50).optional(),
  status: projectStatusEnum.optional(),
  hoaiZone: z.number().int().min(1).max(5).optional(),
  useBim: z.boolean().optional(),
  bimStandard: z.string().max(50).optional(),
  timeTrackingEnabled: z.boolean().optional(),
  address: addressSchema.optional(),
  buildingType: z.string().max(100).optional(),
  buildingTypeL2: z.string().max(100).optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  budgetNet: z.number().min(0).nullable().optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  budgetHours: z.number().min(0).nullable().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  quickNote: z.string().optional(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const projectMemberSchema = z.object({
  projectId: z.number().int().positive(),
  userId: z.number().int().positive(),
  role: z.string().max(50).default('member'),
});

const projectActivitiesSchema = z
  .object({
    projectId: z.number().int().positive(),
  })
  .merge(paginationSchema);

const createRevisionSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().max(255).optional(),
  description: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyProjectCompany(
  db: any,
  projectId: number,
  companyId: number,
) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.companyId, companyId),
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
  return project;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const projectsRouter = createTRPCRouter({
  /**
   * List projects with pagination, filtering, and search.
   */
  list: companyProcedure
    .input(projectFilterSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(projects.companyId, ctx.companyId),
        eq(projects.scope, 'project'),
        isNull(projects.deletedAt),
      ];

      if (input.status) {
        conditions.push(eq(projects.status, input.status));
      }
      if (input.projectType) {
        conditions.push(eq(projects.projectType, input.projectType));
      }
      if (input.clientId) {
        conditions.push(eq(projects.clientId, input.clientId));
      }
      if (input.search) {
        conditions.push(like(projects.name, `%${input.search}%`));
      }
      if (input.dateRange?.from) {
        conditions.push(sql`${projects.startDate} >= ${input.dateRange.from.toISOString().split('T')[0]}`);
      }
      if (input.dateRange?.to) {
        conditions.push(sql`${projects.endDate} <= ${input.dateRange.to.toISOString().split('T')[0]}`);
      }

      const whereClause = and(...conditions);

      // Get total count
      const totalResult = await ctx.db
        .select({ total: count() })
        .from(projects)
        .where(whereClause);
      const total = totalResult[0]?.total ?? 0;

      // Get items with joins
      const orderDir = input.sortOrder === 'desc' ? desc : asc;
      const orderField =
        input.sortBy === 'name' ? projects.name :
        input.sortBy === 'status' ? projects.status :
        input.sortBy === 'startDate' ? projects.startDate :
        projects.createdAt;

      const items = await ctx.db
        .select({
          id: projects.id,
          ulid: projects.ulid,
          name: projects.name,
          code: projects.code,
          status: projects.status,
          projectType: projects.projectType,
          startDate: projects.startDate,
          endDate: projects.endDate,
          budgetNet: projects.budgetNet,
          createdAt: projects.createdAt,
          clientId: projects.clientId,
          projectManagerId: projects.projectManagerId,
        })
        .from(projects)
        .where(whereClause)
        .orderBy(orderDir(orderField))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      // Fetch client names and PM names in batch
      const clientIds = items.map(i => i.clientId).filter((id): id is number => id !== null);
      const pmIds = items.map(i => i.projectManagerId).filter((id): id is number => id !== null);

      let clientMap: Record<number, string> = {};
      if (clientIds.length > 0) {
        const clientRecords = await ctx.db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations)
          .where(sql`${organizations.id} IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})`);
        for (const c of clientRecords) {
          clientMap[c.id] = c.name;
        }
      }

      let pmMap: Record<number, string> = {};
      if (pmIds.length > 0) {
        const pmRecords = await ctx.db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(pmIds.map(id => sql`${id}`), sql`, `)})`);
        for (const pm of pmRecords) {
          pmMap[pm.id] = `${pm.firstName} ${pm.lastName}`;
        }
      }

      return {
        items: items.map((item) => ({
          id: item.id,
          ulid: item.ulid,
          name: item.name,
          code: item.code,
          status: item.status,
          projectType: item.projectType,
          clientName: item.clientId ? (clientMap[item.clientId] ?? null) : null,
          projectManagerName: item.projectManagerId ? (pmMap[item.projectManagerId] ?? null) : null,
          startDate: item.startDate,
          endDate: item.endDate,
          budgetNet: item.budgetNet,
          createdAt: item.createdAt,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * Get a single project with full details.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.id),
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

      // Get member count
      const memberCountResult = await ctx.db
        .select({ memberCount: count() })
        .from(projectUsers)
        .where(eq(projectUsers.projectId, input.id));
      const memberCount = memberCountResult[0]?.memberCount ?? 0;

      return {
        ...project,
        memberCount,
      };
    }),

  /**
   * Create a new project.
   */
  create: companyProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const projectUlid = ulid();

      const { startDate, endDate, budgetNet, estimatedHours, budgetHours, vatRate, ...rest } = input;

      const [newProject] = await ctx.db
        .insert(projects)
        .values({
          ...rest,
          ulid: projectUlid,
          companyId: ctx.companyId,
          scope: 'project',
          startDate: startDate?.toISOString().split('T')[0],
          endDate: endDate?.toISOString().split('T')[0],
          budgetNet: budgetNet?.toString(),
          estimatedHours: estimatedHours?.toString(),
          budgetHours: budgetHours?.toString(),
          vatRate: vatRate?.toString() ?? '19.0',
        })
        .returning();

      if (!newProject) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Projekt konnte nicht erstellt werden',
        });
      }

      // Add creator as project member
      await ctx.db.insert(projectUsers).values({
        projectId: newProject.id,
        userId: ctx.session.user.id,
        role: 'owner',
      });

      // Log activity
      await ctx.db.insert(projectActivities).values({
        projectId: newProject.id,
        userId: ctx.session.user.id,
        action: 'project_created',
        description: `Projekt "${newProject.name}" erstellt`,
      });

      return newProject;
    }),

  /**
   * Update project details.
   */
  update: companyProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.id, ctx.companyId);

      const { id, startDate, endDate, budgetNet, estimatedHours, budgetHours, vatRate, ...rest } = input;

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      if (startDate !== undefined) updateData.startDate = startDate?.toISOString().split('T')[0] ?? null;
      if (endDate !== undefined) updateData.endDate = endDate?.toISOString().split('T')[0] ?? null;
      if (budgetNet !== undefined) updateData.budgetNet = budgetNet?.toString() ?? null;
      if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours?.toString() ?? null;
      if (budgetHours !== undefined) updateData.budgetHours = budgetHours?.toString() ?? null;
      if (vatRate !== undefined) updateData.vatRate = vatRate?.toString();

      const [updated] = await ctx.db
        .update(projects)
        .set(updateData)
        .where(and(eq(projects.id, id), eq(projects.companyId, ctx.companyId)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Projekt nicht gefunden',
        });
      }

      // Log activity
      await ctx.db.insert(projectActivities).values({
        projectId: id,
        userId: ctx.session.user.id,
        action: 'project_updated',
        description: `Projekt aktualisiert`,
        changes: rest,
      });

      return updated;
    }),

  /**
   * Archive a project.
   */
  archive: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(projects)
        .set({
          status: 'archived',
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, input.id), eq(projects.companyId, ctx.companyId)));

      await ctx.db.insert(projectActivities).values({
        projectId: input.id,
        userId: ctx.session.user.id,
        action: 'project_archived',
        description: 'Projekt archiviert',
      });

      return { success: true };
    }),

  /**
   * Soft-delete a project.
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(projects)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(projects.id, input.id), eq(projects.companyId, ctx.companyId)));

      return { success: true };
    }),

  /**
   * Add a user as a member to a project.
   */
  addMember: companyProcedure
    .input(projectMemberSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      // Verify user is a company member
      const [membership] = await ctx.db
        .select({ id: companyUser.id })
        .from(companyUser)
        .where(
          and(
            eq(companyUser.companyId, ctx.companyId),
            eq(companyUser.userId, input.userId),
          ),
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Benutzer ist kein Mitglied des Unternehmens',
        });
      }

      // Check user not already a project member
      const [existingMember] = await ctx.db
        .select({ id: projectUsers.id })
        .from(projectUsers)
        .where(
          and(
            eq(projectUsers.projectId, input.projectId),
            eq(projectUsers.userId, input.userId),
          ),
        )
        .limit(1);

      if (existingMember) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Benutzer ist bereits Projektmitglied',
        });
      }

      const [member] = await ctx.db
        .insert(projectUsers)
        .values({
          projectId: input.projectId,
          userId: input.userId,
          role: input.role,
        })
        .returning();

      await ctx.db.insert(projectActivities).values({
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: 'member_added',
        entityType: 'project_user',
        entityId: member!.id,
        description: 'Projektmitglied hinzugefuegt',
      });

      return member!;
    }),

  /**
   * Remove a user from a project.
   */
  removeMember: companyProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      userId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      const deleted = await ctx.db
        .delete(projectUsers)
        .where(
          and(
            eq(projectUsers.projectId, input.projectId),
            eq(projectUsers.userId, input.userId),
          ),
        )
        .returning({ id: projectUsers.id });

      if (deleted.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Projektmitglied nicht gefunden',
        });
      }

      await ctx.db.insert(projectActivities).values({
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: 'member_removed',
        description: 'Projektmitglied entfernt',
      });

      return { success: true };
    }),

  /**
   * Get the activity feed for a project.
   */
  getActivities: companyProcedure
    .input(projectActivitiesSchema)
    .query(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      const whereClause = eq(projectActivities.projectId, input.projectId);

      const totalResult = await ctx.db
        .select({ total: count() })
        .from(projectActivities)
        .where(whereClause);
      const total = totalResult[0]?.total ?? 0;

      const items = await ctx.db
        .select({
          id: projectActivities.id,
          action: projectActivities.action,
          entityType: projectActivities.entityType,
          entityId: projectActivities.entityId,
          description: projectActivities.description,
          changes: projectActivities.changes,
          createdAt: projectActivities.createdAt,
          userFirstName: users.firstName,
          userLastName: users.lastName,
        })
        .from(projectActivities)
        .leftJoin(users, eq(projectActivities.userId, users.id))
        .where(whereClause)
        .orderBy(desc(projectActivities.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        items: items.map((item) => ({
          id: item.id,
          action: item.action,
          entityType: item.entityType,
          entityId: item.entityId,
          description: item.description,
          changes: item.changes,
          userName: item.userFirstName && item.userLastName
            ? `${item.userFirstName} ${item.userLastName}`
            : 'System',
          createdAt: item.createdAt,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * Create a snapshot revision of the current project state.
   */
  createRevision: companyProcedure
    .input(createRevisionSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      // Get next revision number
      const [latest] = await ctx.db
        .select({ revisionNumber: projectRevisions.revisionNumber })
        .from(projectRevisions)
        .where(eq(projectRevisions.projectId, input.projectId))
        .orderBy(desc(projectRevisions.revisionNumber))
        .limit(1);

      const nextRevision = (latest?.revisionNumber ?? 0) + 1;

      // Get current project state for snapshot
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      // Set previous revision isCurrent = false
      await ctx.db
        .update(projectRevisions)
        .set({ isCurrent: false })
        .where(
          and(
            eq(projectRevisions.projectId, input.projectId),
            eq(projectRevisions.isCurrent, true),
          ),
        );

      // Create new revision
      const [revision] = await ctx.db
        .insert(projectRevisions)
        .values({
          projectId: input.projectId,
          revisionNumber: nextRevision,
          name: input.name ?? `Revision ${nextRevision}`,
          description: input.description,
          isCurrent: true,
          snapshot: project,
          createdBy: ctx.session.user.id,
        })
        .returning();

      await ctx.db.insert(projectActivities).values({
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: 'revision_created',
        entityType: 'project_revision',
        entityId: revision!.id,
        description: `Revision ${nextRevision} erstellt`,
      });

      return revision!;
    }),
});
