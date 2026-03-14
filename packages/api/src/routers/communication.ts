import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc, count, like, isNull } from 'drizzle-orm';
import {
  communications,
  communicationParticipants,
  actionItems,
  projects,
  users,
} from '@vambiant/db';
import { createTRPCRouter, companyProcedure } from '../trpc';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const communicationFilterSchema = z
  .object({
    projectId: z.number().int().positive().optional(),
    type: z.enum(['meeting_protocol', 'correspondence', 'note']).optional(),
    status: z.string().max(30).optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const createCommunicationSchema = z.object({
  projectId: z.number().int().positive(),
  type: z.string().min(1, 'Typ ist erforderlich').max(30),
  subject: z.string().min(1, 'Betreff ist erforderlich').max(500),
  content: z.string().optional(),
  date: z.coerce.date(),
  location: z.string().max(255).optional(),
  entryType: z.string().max(30).optional(),
  externalReference: z.string().max(255).optional(),
  status: z.string().max(30).optional(),
  actionItemsSummary: z.string().optional(),
  metadata: z.any().optional(),
});

const updateCommunicationSchema = z.object({
  id: z.number().int().positive(),
  type: z.string().max(30).optional(),
  subject: z.string().min(1).max(500).optional(),
  content: z.string().nullable().optional(),
  date: z.coerce.date().optional(),
  location: z.string().max(255).nullable().optional(),
  entryType: z.string().max(30).nullable().optional(),
  externalReference: z.string().max(255).nullable().optional(),
  status: z.string().max(30).optional(),
  actionItemsSummary: z.string().nullable().optional(),
  metadata: z.any().optional(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const addParticipantSchema = z.object({
  communicationId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  role: z.string().max(30).optional(),
  attended: z.boolean().optional(),
  participationType: z.string().max(30).optional(),
});

const removeParticipantSchema = z.object({
  id: z.number().int().positive(),
  communicationId: z.number().int().positive(),
});

const actionItemFilterSchema = z
  .object({
    projectId: z.number().int().positive().optional(),
    communicationId: z.number().int().positive().optional(),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
    assignedTo: z.number().int().positive().optional(),
  })
  .merge(paginationSchema);

const createActionItemSchema = z.object({
  projectId: z.number().int().positive(),
  communicationId: z.number().int().positive().optional(),
  entityType: z.string().max(30).optional(),
  entityId: z.number().int().positive().optional(),
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  description: z.string().optional(),
  assignedTo: z.number().int().positive().optional(),
  dueDate: z.string().optional(),
  status: z.string().max(30).optional(),
  metadata: z.any().optional(),
});

const updateActionItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.string().max(30).optional(),
  completedAt: z.coerce.date().nullable().optional(),
  metadata: z.any().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify that a project belongs to the given company and is not deleted.
 */
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

/**
 * Verify that a communication belongs to a project owned by the given company.
 */
async function verifyCommunicationCompany(
  db: any,
  communicationId: number,
  companyId: number,
) {
  const [comm] = await db
    .select({
      id: communications.id,
      projectId: communications.projectId,
    })
    .from(communications)
    .innerJoin(projects, eq(communications.projectId, projects.id))
    .where(
      and(
        eq(communications.id, communicationId),
        eq(projects.companyId, companyId),
      ),
    )
    .limit(1);

  if (!comm) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Kommunikation nicht gefunden',
    });
  }
  return comm;
}

/**
 * Verify that an action item belongs to a project owned by the given company.
 */
async function verifyActionItemCompany(
  db: any,
  actionItemId: number,
  companyId: number,
) {
  const [item] = await db
    .select({
      id: actionItems.id,
      projectId: actionItems.projectId,
    })
    .from(actionItems)
    .innerJoin(projects, eq(actionItems.projectId, projects.id))
    .where(
      and(
        eq(actionItems.id, actionItemId),
        eq(projects.companyId, companyId),
      ),
    )
    .limit(1);

  if (!item) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Massnahme nicht gefunden',
    });
  }
  return item;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const communicationRouter = createTRPCRouter({
  // =========================================================================
  // Communications
  // =========================================================================

  /**
   * List communications for the current company, optionally filtered by project.
   */
  list: companyProcedure
    .input(communicationFilterSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(projects.companyId, ctx.companyId),
      ];

      if (input.projectId) {
        conditions.push(eq(communications.projectId, input.projectId));
      }
      if (input.type) {
        conditions.push(eq(communications.type, input.type));
      }
      if (input.status) {
        conditions.push(eq(communications.status, input.status));
      }
      if (input.search) {
        conditions.push(like(communications.subject, `%${input.search}%`));
      }

      const whereClause = and(...conditions);

      // Get total count
      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(communications)
        .innerJoin(projects, eq(communications.projectId, projects.id))
        .where(whereClause);

      const total = countResult[0]?.total ?? 0;

      // Get items with creator and project info
      const items = await ctx.db
        .select({
          id: communications.id,
          projectId: communications.projectId,
          projectName: projects.name,
          type: communications.type,
          subject: communications.subject,
          date: communications.date,
          location: communications.location,
          entryType: communications.entryType,
          externalReference: communications.externalReference,
          status: communications.status,
          createdBy: communications.createdBy,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
          createdAt: communications.createdAt,
          updatedAt: communications.updatedAt,
        })
        .from(communications)
        .innerJoin(projects, eq(communications.projectId, projects.id))
        .leftJoin(users, eq(communications.createdBy, users.id))
        .where(whereClause)
        .orderBy(desc(communications.date))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        items: items.map((item) => ({
          id: item.id,
          projectId: item.projectId,
          projectName: item.projectName,
          type: item.type,
          subject: item.subject,
          date: item.date,
          location: item.location,
          entryType: item.entryType,
          externalReference: item.externalReference,
          status: item.status,
          createdBy: item.createdBy,
          creatorName:
            item.creatorFirstName && item.creatorLastName
              ? `${item.creatorFirstName} ${item.creatorLastName}`
              : null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * Get a single communication with participants and action items.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      // Get communication with project/company verification
      const [comm] = await ctx.db
        .select({
          id: communications.id,
          projectId: communications.projectId,
          projectName: projects.name,
          type: communications.type,
          subject: communications.subject,
          content: communications.content,
          date: communications.date,
          location: communications.location,
          entryType: communications.entryType,
          externalReference: communications.externalReference,
          status: communications.status,
          actionItemsSummary: communications.actionItemsSummary,
          createdBy: communications.createdBy,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
          metadata: communications.metadata,
          createdAt: communications.createdAt,
          updatedAt: communications.updatedAt,
        })
        .from(communications)
        .innerJoin(projects, eq(communications.projectId, projects.id))
        .leftJoin(users, eq(communications.createdBy, users.id))
        .where(
          and(
            eq(communications.id, input.id),
            eq(projects.companyId, ctx.companyId),
          ),
        )
        .limit(1);

      if (!comm) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Kommunikation nicht gefunden',
        });
      }

      // Get participants
      const participants = await ctx.db
        .select({
          id: communicationParticipants.id,
          userId: communicationParticipants.userId,
          contactId: communicationParticipants.contactId,
          role: communicationParticipants.role,
          attended: communicationParticipants.attended,
          participationType: communicationParticipants.participationType,
          userFirstName: users.firstName,
          userLastName: users.lastName,
        })
        .from(communicationParticipants)
        .leftJoin(users, eq(communicationParticipants.userId, users.id))
        .where(eq(communicationParticipants.communicationId, input.id));

      // Get action items
      const items = await ctx.db
        .select({
          id: actionItems.id,
          title: actionItems.title,
          description: actionItems.description,
          assignedTo: actionItems.assignedTo,
          dueDate: actionItems.dueDate,
          status: actionItems.status,
          completedAt: actionItems.completedAt,
          createdAt: actionItems.createdAt,
        })
        .from(actionItems)
        .where(eq(actionItems.communicationId, input.id))
        .orderBy(desc(actionItems.createdAt));

      return {
        id: comm.id,
        projectId: comm.projectId,
        projectName: comm.projectName,
        type: comm.type,
        subject: comm.subject,
        content: comm.content,
        date: comm.date,
        location: comm.location,
        entryType: comm.entryType,
        externalReference: comm.externalReference,
        status: comm.status,
        actionItemsSummary: comm.actionItemsSummary,
        createdBy: comm.createdBy,
        creatorName:
          comm.creatorFirstName && comm.creatorLastName
            ? `${comm.creatorFirstName} ${comm.creatorLastName}`
            : null,
        metadata: comm.metadata,
        createdAt: comm.createdAt,
        updatedAt: comm.updatedAt,
        participants: participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          contactId: p.contactId,
          role: p.role,
          attended: p.attended,
          participationType: p.participationType,
          userName:
            p.userFirstName && p.userLastName
              ? `${p.userFirstName} ${p.userLastName}`
              : null,
        })),
        actionItems: items,
      };
    }),

  /**
   * Create a new communication (protocol, correspondence, note).
   */
  create: companyProcedure
    .input(createCommunicationSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify project belongs to company
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      const [comm] = await ctx.db
        .insert(communications)
        .values({
          projectId: input.projectId,
          type: input.type,
          subject: input.subject,
          content: input.content,
          date: input.date,
          location: input.location,
          entryType: input.entryType,
          externalReference: input.externalReference,
          status: input.status ?? 'draft',
          actionItemsSummary: input.actionItemsSummary,
          createdBy: ctx.session.user.id,
          metadata: input.metadata,
        })
        .returning();

      if (!comm) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Kommunikation konnte nicht erstellt werden',
        });
      }

      return comm;
    }),

  /**
   * Update a communication.
   */
  update: companyProcedure
    .input(updateCommunicationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      // Verify communication belongs to company
      await verifyCommunicationCompany(ctx.db, id, ctx.companyId);

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      const [updated] = await ctx.db
        .update(communications)
        .set(updateData)
        .where(eq(communications.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Kommunikation nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Soft-delete a communication (communications table has no deletedAt,
   * so we set status to 'deleted' as a convention).
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCommunicationCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(communications)
        .set({ status: 'deleted', updatedAt: new Date() })
        .where(eq(communications.id, input.id));

      return { success: true };
    }),

  // =========================================================================
  // Participants
  // =========================================================================

  /**
   * Add a participant to a communication.
   */
  participantsAdd: companyProcedure
    .input(addParticipantSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify communication belongs to company
      await verifyCommunicationCompany(
        ctx.db,
        input.communicationId,
        ctx.companyId,
      );

      // At least one of userId or contactId must be provided
      if (!input.userId && !input.contactId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Entweder userId oder contactId muss angegeben werden',
        });
      }

      // Check for duplicate participant
      const duplicateConditions = [
        eq(
          communicationParticipants.communicationId,
          input.communicationId,
        ),
      ];
      if (input.userId) {
        duplicateConditions.push(
          eq(communicationParticipants.userId, input.userId),
        );
      }
      if (input.contactId) {
        duplicateConditions.push(
          eq(communicationParticipants.contactId, input.contactId),
        );
      }

      const [existing] = await ctx.db
        .select({ id: communicationParticipants.id })
        .from(communicationParticipants)
        .where(and(...duplicateConditions))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Teilnehmer bereits vorhanden',
        });
      }

      const [participant] = await ctx.db
        .insert(communicationParticipants)
        .values({
          communicationId: input.communicationId,
          userId: input.userId,
          contactId: input.contactId,
          role: input.role ?? 'attendee',
          attended: input.attended,
          participationType: input.participationType,
        })
        .returning();

      if (!participant) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Teilnehmer konnte nicht hinzugefuegt werden',
        });
      }

      return participant;
    }),

  /**
   * Remove a participant from a communication.
   */
  participantsRemove: companyProcedure
    .input(removeParticipantSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify communication belongs to company
      await verifyCommunicationCompany(
        ctx.db,
        input.communicationId,
        ctx.companyId,
      );

      const deleted = await ctx.db
        .delete(communicationParticipants)
        .where(
          and(
            eq(communicationParticipants.id, input.id),
            eq(
              communicationParticipants.communicationId,
              input.communicationId,
            ),
          ),
        )
        .returning({ id: communicationParticipants.id });

      if (deleted.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Teilnehmer nicht gefunden',
        });
      }

      return { success: true };
    }),

  // =========================================================================
  // Action Items
  // =========================================================================

  /**
   * List action items, optionally filtered by project or communication.
   */
  actionItemsList: companyProcedure
    .input(actionItemFilterSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(projects.companyId, ctx.companyId),
      ];

      if (input.projectId) {
        conditions.push(eq(actionItems.projectId, input.projectId));
      }
      if (input.communicationId) {
        conditions.push(
          eq(actionItems.communicationId, input.communicationId),
        );
      }
      if (input.status) {
        conditions.push(eq(actionItems.status, input.status));
      }
      if (input.assignedTo) {
        conditions.push(eq(actionItems.assignedTo, input.assignedTo));
      }

      const whereClause = and(...conditions);

      // Get total count
      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(actionItems)
        .innerJoin(projects, eq(actionItems.projectId, projects.id))
        .where(whereClause);

      const total = countResult[0]?.total ?? 0;

      // Get items with assignee info
      const items = await ctx.db
        .select({
          id: actionItems.id,
          projectId: actionItems.projectId,
          projectName: projects.name,
          communicationId: actionItems.communicationId,
          entityType: actionItems.entityType,
          entityId: actionItems.entityId,
          title: actionItems.title,
          description: actionItems.description,
          assignedTo: actionItems.assignedTo,
          assigneeFirstName: users.firstName,
          assigneeLastName: users.lastName,
          dueDate: actionItems.dueDate,
          status: actionItems.status,
          completedAt: actionItems.completedAt,
          createdAt: actionItems.createdAt,
          updatedAt: actionItems.updatedAt,
        })
        .from(actionItems)
        .innerJoin(projects, eq(actionItems.projectId, projects.id))
        .leftJoin(users, eq(actionItems.assignedTo, users.id))
        .where(whereClause)
        .orderBy(desc(actionItems.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        items: items.map((item) => ({
          id: item.id,
          projectId: item.projectId,
          projectName: item.projectName,
          communicationId: item.communicationId,
          entityType: item.entityType,
          entityId: item.entityId,
          title: item.title,
          description: item.description,
          assignedTo: item.assignedTo,
          assigneeName:
            item.assigneeFirstName && item.assigneeLastName
              ? `${item.assigneeFirstName} ${item.assigneeLastName}`
              : null,
          dueDate: item.dueDate,
          status: item.status,
          completedAt: item.completedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * Create a new action item.
   */
  actionItemsCreate: companyProcedure
    .input(createActionItemSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify project belongs to company
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      // If communicationId is provided, verify it belongs to company
      if (input.communicationId) {
        await verifyCommunicationCompany(
          ctx.db,
          input.communicationId,
          ctx.companyId,
        );
      }

      const [item] = await ctx.db
        .insert(actionItems)
        .values({
          projectId: input.projectId,
          communicationId: input.communicationId,
          entityType: input.entityType,
          entityId: input.entityId,
          title: input.title,
          description: input.description,
          assignedTo: input.assignedTo,
          dueDate: input.dueDate,
          status: input.status ?? 'open',
          metadata: input.metadata,
        })
        .returning();

      if (!item) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Massnahme konnte nicht erstellt werden',
        });
      }

      return item;
    }),

  /**
   * Update an action item.
   */
  actionItemsUpdate: companyProcedure
    .input(updateActionItemSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      // Verify action item belongs to company
      await verifyActionItemCompany(ctx.db, id, ctx.companyId);

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      // Auto-set completedAt when status changes to completed
      if (rest.status === 'completed' && rest.completedAt === undefined) {
        updateData.completedAt = new Date();
      }

      const [updated] = await ctx.db
        .update(actionItems)
        .set(updateData)
        .where(eq(actionItems.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Massnahme nicht gefunden',
        });
      }

      return updated;
    }),
});
