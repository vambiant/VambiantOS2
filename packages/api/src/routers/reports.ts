import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc, count, like, isNull } from 'drizzle-orm';
import {
  reports,
  reportSnapshots,
  contentBlocks,
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

const reportFilterSchema = z
  .object({
    projectId: z.number().int().positive().optional(),
    reportType: z.enum(['explanatory', 'proposal', 'submission']).optional(),
    status: z.string().max(30).optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const createReportSchema = z.object({
  projectId: z.number().int().positive(),
  reportType: z.string().min(1, 'Berichtstyp ist erforderlich').max(30),
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  description: z.string().optional(),
  status: z.string().max(30).optional(),
  sections: z.any().optional(),
  metadata: z.any().optional(),
});

const updateReportSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  reportType: z.string().max(30).optional(),
  status: z.string().max(30).optional(),
  version: z.number().int().min(1).optional(),
  sections: z.any().optional(),
  metadata: z.any().optional(),
});

const idSchema = z.object({
  id: z.number().int().positive(),
});

const createSnapshotSchema = z.object({
  reportId: z.number().int().positive(),
  snapshotVersion: z.number().int().min(1),
  content: z.any(),
});

const snapshotListSchema = z
  .object({
    reportId: z.number().int().positive(),
  })
  .merge(paginationSchema);

const contentBlockFilterSchema = z
  .object({
    blockType: z.enum(['text', 'template', 'reusable']).optional(),
    category: z.string().max(100).optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const createContentBlockSchema = z.object({
  blockType: z.string().min(1, 'Blocktyp ist erforderlich').max(30),
  category: z.string().max(100).optional(),
  name: z.string().max(255).optional(),
  title: z.string().max(255).optional(),
  content: z.any(),
  metadata: z.any().optional(),
});

const updateContentBlockSchema = z.object({
  id: z.number().int().positive(),
  blockType: z.string().max(30).optional(),
  category: z.string().max(100).nullable().optional(),
  name: z.string().max(255).nullable().optional(),
  title: z.string().max(255).nullable().optional(),
  content: z.any().optional(),
  version: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
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
 * Verify that a report belongs to a project owned by the given company.
 */
async function verifyReportCompany(
  db: any,
  reportId: number,
  companyId: number,
) {
  const [report] = await db
    .select({
      id: reports.id,
      projectId: reports.projectId,
    })
    .from(reports)
    .innerJoin(projects, eq(reports.projectId, projects.id))
    .where(
      and(
        eq(reports.id, reportId),
        eq(projects.companyId, companyId),
        isNull(reports.deletedAt),
      ),
    )
    .limit(1);

  if (!report) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Bericht nicht gefunden',
    });
  }
  return report;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const reportsRouter = createTRPCRouter({
  // =========================================================================
  // Reports
  // =========================================================================

  /**
   * List reports for the current company, optionally filtered by project.
   */
  list: companyProcedure
    .input(reportFilterSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(projects.companyId, ctx.companyId),
        isNull(reports.deletedAt),
      ];

      if (input.projectId) {
        conditions.push(eq(reports.projectId, input.projectId));
      }
      if (input.reportType) {
        conditions.push(eq(reports.reportType, input.reportType));
      }
      if (input.status) {
        conditions.push(eq(reports.status, input.status));
      }
      if (input.search) {
        conditions.push(like(reports.title, `%${input.search}%`));
      }

      const whereClause = and(...conditions);

      // Get total count
      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(reports)
        .innerJoin(projects, eq(reports.projectId, projects.id))
        .where(whereClause);

      const total = countResult[0]?.total ?? 0;

      // Get items with creator info
      const items = await ctx.db
        .select({
          id: reports.id,
          projectId: reports.projectId,
          projectName: projects.name,
          reportType: reports.reportType,
          title: reports.title,
          description: reports.description,
          status: reports.status,
          version: reports.version,
          createdBy: reports.createdBy,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
          createdAt: reports.createdAt,
          updatedAt: reports.updatedAt,
        })
        .from(reports)
        .innerJoin(projects, eq(reports.projectId, projects.id))
        .leftJoin(users, eq(reports.createdBy, users.id))
        .where(whereClause)
        .orderBy(desc(reports.updatedAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        items: items.map((item) => ({
          id: item.id,
          projectId: item.projectId,
          projectName: item.projectName,
          reportType: item.reportType,
          title: item.title,
          description: item.description,
          status: item.status,
          version: item.version,
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
   * Get a single report with its snapshots.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      // Get report with project/company verification
      const [report] = await ctx.db
        .select({
          id: reports.id,
          projectId: reports.projectId,
          projectName: projects.name,
          reportType: reports.reportType,
          title: reports.title,
          description: reports.description,
          status: reports.status,
          version: reports.version,
          sections: reports.sections,
          createdBy: reports.createdBy,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
          metadata: reports.metadata,
          createdAt: reports.createdAt,
          updatedAt: reports.updatedAt,
        })
        .from(reports)
        .innerJoin(projects, eq(reports.projectId, projects.id))
        .leftJoin(users, eq(reports.createdBy, users.id))
        .where(
          and(
            eq(reports.id, input.id),
            eq(projects.companyId, ctx.companyId),
            isNull(reports.deletedAt),
          ),
        )
        .limit(1);

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bericht nicht gefunden',
        });
      }

      // Get snapshots for this report
      const snapshots = await ctx.db
        .select({
          id: reportSnapshots.id,
          snapshotVersion: reportSnapshots.snapshotVersion,
          generatedBy: reportSnapshots.generatedBy,
          generatedAt: reportSnapshots.generatedAt,
        })
        .from(reportSnapshots)
        .where(eq(reportSnapshots.reportId, input.id))
        .orderBy(desc(reportSnapshots.snapshotVersion));

      return {
        id: report.id,
        projectId: report.projectId,
        projectName: report.projectName,
        reportType: report.reportType,
        title: report.title,
        description: report.description,
        status: report.status,
        version: report.version,
        sections: report.sections,
        createdBy: report.createdBy,
        creatorName:
          report.creatorFirstName && report.creatorLastName
            ? `${report.creatorFirstName} ${report.creatorLastName}`
            : null,
        metadata: report.metadata,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        snapshots,
      };
    }),

  /**
   * Create a new report.
   */
  create: companyProcedure
    .input(createReportSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify project belongs to company
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      const [report] = await ctx.db
        .insert(reports)
        .values({
          projectId: input.projectId,
          reportType: input.reportType,
          title: input.title,
          description: input.description,
          status: input.status ?? 'draft',
          sections: input.sections ?? [],
          createdBy: ctx.session.user.id,
          metadata: input.metadata,
        })
        .returning();

      if (!report) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Bericht konnte nicht erstellt werden',
        });
      }

      return report;
    }),

  /**
   * Update a report.
   */
  update: companyProcedure
    .input(updateReportSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      // Verify report belongs to company
      await verifyReportCompany(ctx.db, id, ctx.companyId);

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      const [updated] = await ctx.db
        .update(reports)
        .set(updateData)
        .where(eq(reports.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bericht nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Soft-delete a report.
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyReportCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(reports)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(reports.id, input.id));

      return { success: true };
    }),

  // =========================================================================
  // Snapshots
  // =========================================================================

  /**
   * Create a snapshot of a report.
   */
  snapshotsCreate: companyProcedure
    .input(createSnapshotSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify report belongs to company
      await verifyReportCompany(ctx.db, input.reportId, ctx.companyId);

      const [snapshot] = await ctx.db
        .insert(reportSnapshots)
        .values({
          reportId: input.reportId,
          snapshotVersion: input.snapshotVersion,
          content: input.content,
          generatedBy: ctx.session.user.id,
        })
        .returning();

      if (!snapshot) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Snapshot konnte nicht erstellt werden',
        });
      }

      return snapshot;
    }),

  /**
   * List snapshots for a report.
   */
  snapshotsList: companyProcedure
    .input(snapshotListSchema)
    .query(async ({ ctx, input }) => {
      // Verify report belongs to company
      await verifyReportCompany(ctx.db, input.reportId, ctx.companyId);

      const whereClause = eq(reportSnapshots.reportId, input.reportId);

      // Get total count
      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(reportSnapshots)
        .where(whereClause);

      const total = countResult[0]?.total ?? 0;

      // Get items with generator info
      const items = await ctx.db
        .select({
          id: reportSnapshots.id,
          reportId: reportSnapshots.reportId,
          snapshotVersion: reportSnapshots.snapshotVersion,
          content: reportSnapshots.content,
          generatedBy: reportSnapshots.generatedBy,
          generatorFirstName: users.firstName,
          generatorLastName: users.lastName,
          generatedAt: reportSnapshots.generatedAt,
        })
        .from(reportSnapshots)
        .leftJoin(users, eq(reportSnapshots.generatedBy, users.id))
        .where(whereClause)
        .orderBy(desc(reportSnapshots.snapshotVersion))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        items: items.map((item) => ({
          id: item.id,
          reportId: item.reportId,
          snapshotVersion: item.snapshotVersion,
          content: item.content,
          generatedBy: item.generatedBy,
          generatorName:
            item.generatorFirstName && item.generatorLastName
              ? `${item.generatorFirstName} ${item.generatorLastName}`
              : null,
          generatedAt: item.generatedAt,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  // =========================================================================
  // Content Blocks
  // =========================================================================

  /**
   * List content blocks for the current company.
   */
  contentBlocksList: companyProcedure
    .input(contentBlockFilterSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(contentBlocks.companyId, ctx.companyId),
        eq(contentBlocks.isActive, true),
      ];

      if (input.blockType) {
        conditions.push(eq(contentBlocks.blockType, input.blockType));
      }
      if (input.category) {
        conditions.push(eq(contentBlocks.category, input.category));
      }
      if (input.search) {
        conditions.push(
          sql`(${like(contentBlocks.name, `%${input.search}%`)} OR ${like(contentBlocks.title, `%${input.search}%`)})`,
        );
      }

      const whereClause = and(...conditions);

      // Get total count
      const countResult = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(contentBlocks)
        .where(whereClause);

      const total = countResult[0]?.total ?? 0;

      // Get items
      const items = await ctx.db
        .select({
          id: contentBlocks.id,
          companyId: contentBlocks.companyId,
          blockType: contentBlocks.blockType,
          category: contentBlocks.category,
          name: contentBlocks.name,
          title: contentBlocks.title,
          content: contentBlocks.content,
          version: contentBlocks.version,
          isActive: contentBlocks.isActive,
          createdBy: contentBlocks.createdBy,
          createdAt: contentBlocks.createdAt,
          updatedAt: contentBlocks.updatedAt,
        })
        .from(contentBlocks)
        .where(whereClause)
        .orderBy(desc(contentBlocks.updatedAt))
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
   * Create a new content block.
   */
  contentBlocksCreate: companyProcedure
    .input(createContentBlockSchema)
    .mutation(async ({ ctx, input }) => {
      const [block] = await ctx.db
        .insert(contentBlocks)
        .values({
          companyId: ctx.companyId,
          blockType: input.blockType,
          category: input.category,
          name: input.name,
          title: input.title,
          content: input.content,
          createdBy: ctx.session.user.id,
          metadata: input.metadata,
        })
        .returning();

      if (!block) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Textbaustein konnte nicht erstellt werden',
        });
      }

      return block;
    }),

  /**
   * Update a content block.
   */
  contentBlocksUpdate: companyProcedure
    .input(updateContentBlockSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      const updateData: Record<string, unknown> = {
        ...rest,
        updatedAt: new Date(),
      };

      const [updated] = await ctx.db
        .update(contentBlocks)
        .set(updateData)
        .where(
          and(
            eq(contentBlocks.id, id),
            eq(contentBlocks.companyId, ctx.companyId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Textbaustein nicht gefunden',
        });
      }

      return updated;
    }),
});
