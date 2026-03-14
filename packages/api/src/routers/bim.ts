import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  bimModels,
  projectRooms,
  projects,
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

const listModelsSchema = z
  .object({
    projectId: z.number().int().positive(),
    modelType: z.enum(['architecture', 'structural', 'mep', 'coordination']).optional(),
    format: z.enum(['ifc', 'rvt', 'nwd']).optional(),
    status: z.string().max(30).optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const createModelSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  modelType: z.enum(['architecture', 'structural', 'mep', 'coordination']).optional(),
  filePath: z.string().max(500).optional(),
  fileId: z.number().int().positive().optional(),
  version: z.string().max(50).optional(),
  format: z.enum(['ifc', 'rvt', 'nwd']).optional(),
  ifcStandard: z.string().max(50).optional(),
  status: z.string().max(30).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateModelSchema = createModelSchema.partial().extend({
  id: z.number().int().positive(),
});

const listRoomsSchema = z
  .object({
    projectId: z.number().int().positive(),
    bimModelId: z.number().int().positive().optional(),
    floor: z.string().max(50).optional(),
    category: z.string().max(100).optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const createRoomSchema = z.object({
  projectId: z.number().int().positive(),
  bimModelId: z.number().int().positive().optional(),
  roomNumber: z.string().max(50).optional(),
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  floor: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  areaSqm: z.string().optional(),
  volume: z.string().optional(),
  ceilingHeight: z.string().optional(),
  usageType: z.string().max(100).optional(),
  specifications: z.record(z.unknown()).optional(),
  properties: z.record(z.unknown()).optional(),
  boundingBox: z.record(z.unknown()).optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateRoomSchema = createRoomSchema.partial().extend({
  id: z.number().int().positive(),
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
        sql`${projects.deletedAt} IS NULL`,
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
// Sub-routers
// ---------------------------------------------------------------------------

const modelsRouter = createTRPCRouter({
  /**
   * List BIM models for a project.
   */
  list: companyProcedure
    .input(listModelsSchema)
    .query(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      const { page, pageSize, projectId, modelType, format, status, search } = input;
      const offset = (page - 1) * pageSize;

      const conditions: any[] = [
        eq(bimModels.projectId, projectId),
        sql`${bimModels.status} != 'deleted'`,
      ];

      if (modelType) conditions.push(eq(bimModels.modelType, modelType));
      if (format) conditions.push(eq(bimModels.format, format));
      if (status) conditions.push(eq(bimModels.status, status));
      if (search) {
        conditions.push(sql`${bimModels.name} ILIKE ${'%' + search + '%'}`);
      }

      const where = and(...conditions);

      const [countResult] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(bimModels)
        .where(where);

      const total = countResult?.total ?? 0;

      const items = await ctx.db
        .select()
        .from(bimModels)
        .where(where)
        .orderBy(desc(bimModels.createdAt))
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
   * Get a single BIM model by ID.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [model] = await ctx.db
        .select()
        .from(bimModels)
        .where(
          and(
            eq(bimModels.id, input.id),
            sql`${bimModels.status} != 'deleted'`,
          ),
        )
        .limit(1);

      if (!model) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'BIM-Modell nicht gefunden',
        });
      }

      // Verify project belongs to company
      await verifyProjectCompany(ctx.db, model.projectId, ctx.companyId);

      return model;
    }),

  /**
   * Create a new BIM model record.
   */
  create: companyProcedure
    .input(createModelSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      const [created] = await ctx.db
        .insert(bimModels)
        .values({
          projectId: input.projectId,
          name: input.name,
          modelType: input.modelType,
          filePath: input.filePath,
          fileId: input.fileId,
          version: input.version,
          format: input.format,
          ifcStandard: input.ifcStandard,
          status: input.status ?? 'active',
          createdBy: ctx.session.user.id,
          metadata: input.metadata ?? {},
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'BIM-Modell konnte nicht erstellt werden',
        });
      }

      return created;
    }),

  /**
   * Update a BIM model.
   */
  update: companyProcedure
    .input(updateModelSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify model exists and belongs to company
      const [existing] = await ctx.db
        .select({ id: bimModels.id, projectId: bimModels.projectId })
        .from(bimModels)
        .where(
          and(
            eq(bimModels.id, id),
            sql`${bimModels.status} != 'deleted'`,
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'BIM-Modell nicht gefunden',
        });
      }

      await verifyProjectCompany(ctx.db, existing.projectId, ctx.companyId);

      // If projectId is being changed, verify new project too
      if (data.projectId && data.projectId !== existing.projectId) {
        await verifyProjectCompany(ctx.db, data.projectId, ctx.companyId);
      }

      const [updated] = await ctx.db
        .update(bimModels)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(bimModels.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'BIM-Modell nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Soft delete a BIM model (set status to 'deleted').
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: bimModels.id, projectId: bimModels.projectId })
        .from(bimModels)
        .where(
          and(
            eq(bimModels.id, input.id),
            sql`${bimModels.status} != 'deleted'`,
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'BIM-Modell nicht gefunden',
        });
      }

      await verifyProjectCompany(ctx.db, existing.projectId, ctx.companyId);

      await ctx.db
        .update(bimModels)
        .set({ status: 'deleted', updatedAt: new Date() })
        .where(eq(bimModels.id, input.id));

      return { success: true };
    }),
});

const roomsRouter = createTRPCRouter({
  /**
   * List rooms for a project.
   */
  list: companyProcedure
    .input(listRoomsSchema)
    .query(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      const { page, pageSize, projectId, bimModelId, floor, category, search } = input;
      const offset = (page - 1) * pageSize;

      const conditions: any[] = [
        eq(projectRooms.projectId, projectId),
      ];

      if (bimModelId) conditions.push(eq(projectRooms.bimModelId, bimModelId));
      if (floor) conditions.push(eq(projectRooms.floor, floor));
      if (category) conditions.push(eq(projectRooms.category, category));
      if (search) {
        conditions.push(sql`${projectRooms.name} ILIKE ${'%' + search + '%'}`);
      }

      const where = and(...conditions);

      const [countResult] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(projectRooms)
        .where(where);

      const total = countResult?.total ?? 0;

      const items = await ctx.db
        .select()
        .from(projectRooms)
        .where(where)
        .orderBy(desc(projectRooms.createdAt))
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
   * Get a single room by ID.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [room] = await ctx.db
        .select()
        .from(projectRooms)
        .where(eq(projectRooms.id, input.id))
        .limit(1);

      if (!room) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Raum nicht gefunden',
        });
      }

      await verifyProjectCompany(ctx.db, room.projectId, ctx.companyId);

      return room;
    }),

  /**
   * Create a new room.
   */
  create: companyProcedure
    .input(createRoomSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      const [created] = await ctx.db
        .insert(projectRooms)
        .values({
          projectId: input.projectId,
          bimModelId: input.bimModelId,
          roomNumber: input.roomNumber,
          name: input.name,
          floor: input.floor,
          category: input.category,
          areaSqm: input.areaSqm,
          volume: input.volume,
          ceilingHeight: input.ceilingHeight,
          usageType: input.usageType,
          specifications: input.specifications ?? {},
          properties: input.properties ?? {},
          boundingBox: input.boundingBox,
          description: input.description,
          metadata: input.metadata,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Raum konnte nicht erstellt werden',
        });
      }

      return created;
    }),

  /**
   * Update a room.
   */
  update: companyProcedure
    .input(updateRoomSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [existing] = await ctx.db
        .select({ id: projectRooms.id, projectId: projectRooms.projectId })
        .from(projectRooms)
        .where(eq(projectRooms.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Raum nicht gefunden',
        });
      }

      await verifyProjectCompany(ctx.db, existing.projectId, ctx.companyId);

      if (data.projectId && data.projectId !== existing.projectId) {
        await verifyProjectCompany(ctx.db, data.projectId, ctx.companyId);
      }

      const [updated] = await ctx.db
        .update(projectRooms)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(projectRooms.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Raum nicht gefunden',
        });
      }

      return updated;
    }),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const bimRouter = createTRPCRouter({
  models: modelsRouter,
  rooms: roomsRouter,
});
