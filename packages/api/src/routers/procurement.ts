import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, like, desc, asc, sql, count, isNull } from 'drizzle-orm';
import {
  procurements,
  procurementGroups,
  procurementPositions,
  bids,
  projects,
  organizations,
} from '@vambiant/db';
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

const procurementTypeEnum = z.enum(['hoai_offer', 'ava_tender', 'direct_award']);

const procurementStatusEnum = z.enum([
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'published',
  'bidding',
  'evaluation',
  'awarded',
  'executed',
  'cancelled',
]);

const listProcurementsSchema = z
  .object({
    projectId: z.number().int().positive().optional(),
    type: procurementTypeEnum.optional(),
    status: procurementStatusEnum.optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

const idSchema = z.object({
  id: z.number().int().positive(),
});

const createProcurementSchema = z.object({
  projectId: z.number().int().positive(),
  type: procurementTypeEnum,
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  description: z.string().optional(),
  clientId: z.number().int().positive().optional(),
  clientContactId: z.number().int().positive().optional(),
  costEstimationId: z.number().int().positive().optional(),
  number: z.string().max(50).optional(),
  totalValueNet: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).default(19),
  currency: z.string().length(3).default('EUR'),
  nebenkostenPercent: z.number().min(0).max(100).optional(),
  hoaiParams: z
    .object({
      zone: z.number().int().min(1).max(5).optional(),
      objectType: z.string().optional(),
      serviceType: z.string().optional(),
      difficultyLevel: z.string().optional(),
      baseCosts: z.number().min(0).optional(),
      calculatedFeeMin: z.number().min(0).optional(),
      calculatedFeeMax: z.number().min(0).optional(),
      offeredFee: z.number().min(0).optional(),
      conversionFactor: z.number().optional(),
      modernizationFactor: z.number().optional(),
      coordinationFactor: z.number().optional(),
    })
    .optional(),
  avaParams: z
    .object({
      vergabeart: z.string().optional(),
      contractType: z.string().optional(),
      submissionDeadline: z.coerce.date().optional(),
      bindingPeriodEnd: z.coerce.date().optional(),
      executionStart: z.coerce.date().optional(),
      executionEnd: z.coerce.date().optional(),
    })
    .optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  termsConditions: z.string().optional(),
  paymentTerms: z.string().optional(),
});

const updateProcurementSchema = createProcurementSchema.partial().extend({
  id: z.number().int().positive(),
});

// -- Positions
const createPositionSchema = z.object({
  procurementId: z.number().int().positive(),
  groupId: z.number().int().positive().optional(),
  parentId: z.number().int().positive().optional(),
  costPositionId: z.number().int().positive().optional(),
  positionNumber: z.string().max(50).optional(),
  shortText: z.string().min(1, 'Kurztext ist erforderlich').max(500),
  longText: z.string().optional(),
  workPackageCode: z.string().max(20).optional(),
  workPackageName: z.string().max(255).optional(),
  costGroup: z.string().max(10).optional(),
  level: z.number().int().min(0).optional(),
  unit: z.string().max(30).optional(),
  quantity: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isCustom: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  isGroup: z.boolean().optional(),
  color: z.string().max(20).optional(),
  typeData: z.record(z.unknown()).optional(),
});

const updatePositionSchema = createPositionSchema.partial().extend({
  id: z.number().int().positive(),
});

// -- Groups
const createGroupSchema = z.object({
  procurementId: z.number().int().positive(),
  parentGroupId: z.number().int().positive().optional(),
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  code: z.string().max(50).optional(),
  groupType: z.enum(['hoai_phase', 'hoai_service_group', 'ava_lot', 'general']).optional(),
  sortOrder: z.number().int().min(0).optional(),
  description: z.string().optional(),
  phaseNumber: z.number().int().min(1).max(9).optional(),
  percentageBasic: z.number().min(0).max(100).optional(),
  percentageSpecial: z.number().min(0).max(100).optional(),
  percentageActual: z.number().min(0).max(100).optional(),
  feeBasic: z.number().min(0).optional(),
  feeSpecial: z.number().min(0).optional(),
  feeTotal: z.number().min(0).optional(),
  isIncluded: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  estimatedDurationWeeks: z.number().int().min(0).optional(),
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
  includedServices: z.array(z.string()).optional(),
  specialServices: z.array(z.string()).optional(),
  excludedServices: z.array(z.string()).optional(),
  deliverables: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const updateGroupSchema = createGroupSchema.partial().extend({
  id: z.number().int().positive(),
});

// -- Bids
const bidFilterSchema = z.object({
  procurementId: z.number().int().positive(),
});

const createBidSchema = z.object({
  procurementId: z.number().int().positive(),
  bidderId: z.number().int().positive(),
  argePartners: z
    .array(
      z.object({
        organizationId: z.number().int().positive(),
        sharePercentage: z.number().min(0).max(100),
        role: z.string().max(100).optional(),
      }),
    )
    .optional(),
  submissionDate: z.coerce.date().optional(),
  totalNet: z.number().min(0).optional(),
  totalGross: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const evaluateBidSchema = z.object({
  id: z.number().int().positive(),
  evaluation: z.object({
    scoring: z.record(z.number()).optional(),
    notes: z.string().optional(),
    criteria: z.array(
      z.object({
        name: z.string(),
        weight: z.number().min(0).max(100),
        score: z.number().min(0).max(100),
        comment: z.string().optional(),
      }),
    ).optional(),
  }),
});

const awardBidSchema = z.object({
  id: z.number().int().positive(),
  decision: z.enum(['awarded', 'rejected', 'withdrawn']),
  decisionReason: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyProcurementCompany(
  db: any,
  procurementId: number,
  companyId: number,
) {
  const [procurement] = await db
    .select({
      id: procurements.id,
      projectId: procurements.projectId,
      isLocked: procurements.isLocked,
      status: procurements.status,
      type: procurements.type,
    })
    .from(procurements)
    .where(
      and(
        eq(procurements.id, procurementId),
        eq(procurements.companyId, companyId),
        isNull(procurements.deletedAt),
      ),
    )
    .limit(1);

  if (!procurement) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Vergabe nicht gefunden',
    });
  }
  return procurement;
}

async function verifyProjectCompany(
  db: any,
  projectId: number,
  companyId: number,
) {
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
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

/** Recalculate procurement totalValueNet/totalValueGross from its positions */
async function recalcProcurementTotals(db: any, procurementId: number) {
  const [sums] = await db
    .select({
      totalNet: sql<string>`COALESCE(SUM(${procurementPositions.totalNet}), 0)`,
      totalGross: sql<string>`COALESCE(SUM(${procurementPositions.totalGross}), 0)`,
    })
    .from(procurementPositions)
    .where(eq(procurementPositions.procurementId, procurementId));

  await db
    .update(procurements)
    .set({
      totalValueNet: sums.totalNet,
      totalValueGross: sums.totalGross,
      updatedAt: new Date(),
    })
    .where(eq(procurements.id, procurementId));
}

// Default HOAI phase names (Leistungsphasen 1-9)
const HOAI_PHASES = [
  { number: 1, name: 'Grundlagenermittlung', percentageBasic: '3.00' },
  { number: 2, name: 'Vorplanung', percentageBasic: '7.00' },
  { number: 3, name: 'Entwurfsplanung', percentageBasic: '15.00' },
  { number: 4, name: 'Genehmigungsplanung', percentageBasic: '3.00' },
  { number: 5, name: 'Ausfuehrungsplanung', percentageBasic: '25.00' },
  { number: 6, name: 'Vorbereitung der Vergabe', percentageBasic: '10.00' },
  { number: 7, name: 'Mitwirkung bei der Vergabe', percentageBasic: '4.00' },
  { number: 8, name: 'Objektueberwachung', percentageBasic: '32.00' },
  { number: 9, name: 'Objektbetreuung', percentageBasic: '1.00' },
];

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const procurementRouter = createTRPCRouter({
  /**
   * List procurements with filtering.
   */
  list: companyProcedure
    .input(listProcurementsSchema)
    .query(async ({ ctx, input }) => {
      const conditions: any[] = [
        eq(procurements.companyId, ctx.companyId),
        isNull(procurements.deletedAt),
      ];

      if (input.projectId) {
        conditions.push(eq(procurements.projectId, input.projectId));
      }
      if (input.type) {
        conditions.push(eq(procurements.type, input.type));
      }
      if (input.status) {
        conditions.push(eq(procurements.status, input.status));
      }
      if (input.search) {
        conditions.push(like(procurements.title, `%${input.search}%`));
      }

      const whereClause = and(...conditions);

      // Get total count
      const totalResult = await ctx.db
        .select({ total: count() })
        .from(procurements)
        .where(whereClause);
      const total = totalResult[0]?.total ?? 0;

      // Get items with joins
      const orderDir = input.sortOrder === 'desc' ? desc : asc;
      const orderField =
        input.sortBy === 'title' ? procurements.title :
        input.sortBy === 'status' ? procurements.status :
        input.sortBy === 'type' ? procurements.type :
        input.sortBy === 'totalValueNet' ? procurements.totalValueNet :
        procurements.createdAt;

      const offset = (input.page - 1) * input.pageSize;

      const items = await ctx.db
        .select({
          id: procurements.id,
          projectId: procurements.projectId,
          projectName: projects.name,
          type: procurements.type,
          number: procurements.number,
          title: procurements.title,
          status: procurements.status,
          clientName: organizations.name,
          totalValueNet: procurements.totalValueNet,
          totalValueGross: procurements.totalValueGross,
          validUntil: procurements.validUntil,
          createdAt: procurements.createdAt,
          avaParams: procurements.avaParams,
        })
        .from(procurements)
        .innerJoin(projects, eq(procurements.projectId, projects.id))
        .leftJoin(organizations, eq(procurements.clientId, organizations.id))
        .where(whereClause)
        .orderBy(orderDir(orderField))
        .limit(input.pageSize)
        .offset(offset);

      // Get position counts and bid counts per procurement
      const procIds = items.map((i) => i.id);
      let positionCounts: Record<number, number> = {};
      let bidCounts: Record<number, number> = {};

      if (procIds.length > 0) {
        const posCounts = await ctx.db
          .select({
            procurementId: procurementPositions.procurementId,
            cnt: count(),
          })
          .from(procurementPositions)
          .where(sql`${procurementPositions.procurementId} IN (${sql.join(procIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(procurementPositions.procurementId);

        for (const row of posCounts) {
          positionCounts[row.procurementId] = row.cnt;
        }

        const bCounts = await ctx.db
          .select({
            procurementId: bids.procurementId,
            cnt: count(),
          })
          .from(bids)
          .where(sql`${bids.procurementId} IN (${sql.join(procIds.map(id => sql`${id}`), sql`, `)})`)
          .groupBy(bids.procurementId);

        for (const row of bCounts) {
          bidCounts[row.procurementId] = row.cnt;
        }
      }

      return {
        items: items.map((item) => ({
          id: item.id,
          projectId: item.projectId,
          projectName: item.projectName,
          type: item.type,
          number: item.number,
          title: item.title,
          status: item.status,
          clientName: item.clientName,
          totalValueNet: item.totalValueNet,
          totalValueGross: item.totalValueGross,
          positionCount: positionCounts[item.id] ?? 0,
          bidCount: bidCounts[item.id] ?? 0,
          validUntil: item.validUntil,
          createdAt: item.createdAt,
          avaParams: item.avaParams,
        })),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /**
   * Get a procurement with its groups and positions.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      // Fetch procurement with company verification
      const [procurement] = await ctx.db
        .select({
          id: procurements.id,
          projectId: procurements.projectId,
          projectName: projects.name,
          companyId: procurements.companyId,
          type: procurements.type,
          number: procurements.number,
          parentId: procurements.parentId,
          version: procurements.version,
          title: procurements.title,
          description: procurements.description,
          status: procurements.status,
          clientId: procurements.clientId,
          clientName: organizations.name,
          clientContactId: procurements.clientContactId,
          costEstimationId: procurements.costEstimationId,
          totalValueNet: procurements.totalValueNet,
          vatRate: procurements.vatRate,
          totalValueGross: procurements.totalValueGross,
          currency: procurements.currency,
          nebenkostenPercent: procurements.nebenkostenPercent,
          hoaiParams: procurements.hoaiParams,
          avaParams: procurements.avaParams,
          validUntil: procurements.validUntil,
          sentAt: procurements.sentAt,
          acceptedAt: procurements.acceptedAt,
          rejectedAt: procurements.rejectedAt,
          rejectionReason: procurements.rejectionReason,
          notes: procurements.notes,
          internalNotes: procurements.internalNotes,
          termsConditions: procurements.termsConditions,
          paymentTerms: procurements.paymentTerms,
          isLocked: procurements.isLocked,
          createdAt: procurements.createdAt,
          updatedAt: procurements.updatedAt,
        })
        .from(procurements)
        .innerJoin(projects, eq(procurements.projectId, projects.id))
        .leftJoin(organizations, eq(procurements.clientId, organizations.id))
        .where(
          and(
            eq(procurements.id, input.id),
            eq(procurements.companyId, ctx.companyId),
            isNull(procurements.deletedAt),
          ),
        )
        .limit(1);

      if (!procurement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Vergabe nicht gefunden',
        });
      }

      // Fetch groups
      const groups = await ctx.db
        .select()
        .from(procurementGroups)
        .where(eq(procurementGroups.procurementId, input.id))
        .orderBy(asc(procurementGroups.sortOrder));

      // Fetch positions
      const positions = await ctx.db
        .select()
        .from(procurementPositions)
        .where(eq(procurementPositions.procurementId, input.id))
        .orderBy(asc(procurementPositions.sortOrder));

      // Fetch bids with bidder info
      const bidList = await ctx.db
        .select({
          id: bids.id,
          bidderId: bids.bidderId,
          bidderName: organizations.name,
          submissionDate: bids.submissionDate,
          totalNet: bids.totalNet,
          totalGross: bids.totalGross,
          status: bids.status,
          decision: bids.decision,
          evaluation: bids.evaluation,
          createdAt: bids.createdAt,
        })
        .from(bids)
        .innerJoin(organizations, eq(bids.bidderId, organizations.id))
        .where(eq(bids.procurementId, input.id))
        .orderBy(asc(bids.createdAt));

      return {
        ...procurement,
        groups,
        positions,
        bids: bidList,
      };
    }),

  /**
   * Create a new procurement (HOAI offer or AVA tender).
   */
  create: companyProcedure
    .input(createProcurementSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify project belongs to company
      await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

      // Calculate gross values
      const netValue = input.totalValueNet
        ? String(input.totalValueNet)
        : null;
      const grossValue =
        input.totalValueNet != null
          ? String(
              Math.round(
                input.totalValueNet * (1 + input.vatRate / 100) * 100,
              ) / 100,
            )
          : null;

      // Generate procurement number if not provided
      const number =
        input.number ??
        `${input.type === 'hoai_offer' ? 'HOA' : input.type === 'ava_tender' ? 'AVA' : 'DA'}-${Date.now().toString(36).toUpperCase()}`;

      const [created] = await ctx.db
        .insert(procurements)
        .values({
          projectId: input.projectId,
          companyId: ctx.companyId,
          type: input.type,
          number,
          title: input.title,
          description: input.description,
          status: 'draft',
          clientId: input.clientId,
          clientContactId: input.clientContactId,
          costEstimationId: input.costEstimationId,
          totalValueNet: netValue,
          vatRate: String(input.vatRate),
          totalValueGross: grossValue,
          currency: input.currency,
          nebenkostenPercent: input.nebenkostenPercent != null
            ? String(input.nebenkostenPercent)
            : null,
          hoaiParams: input.hoaiParams ?? {},
          avaParams: input.avaParams ?? {},
          validUntil: input.validUntil
            ? input.validUntil.toISOString().split('T')[0]
            : null,
          notes: input.notes,
          internalNotes: input.internalNotes,
          termsConditions: input.termsConditions,
          paymentTerms: input.paymentTerms,
          createdBy: ctx.session.user.id,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Vergabe konnte nicht erstellt werden',
        });
      }

      // If HOAI, create default phase groups
      if (input.type === 'hoai_offer') {
        const phaseGroups = HOAI_PHASES.map((phase) => ({
          procurementId: created.id,
          name: `LP ${phase.number} - ${phase.name}`,
          code: `LP${phase.number}`,
          groupType: 'hoai_phase' as const,
          sortOrder: phase.number,
          phaseNumber: phase.number,
          percentageBasic: phase.percentageBasic,
          isIncluded: true,
          isOptional: false,
        }));

        await ctx.db.insert(procurementGroups).values(phaseGroups);
      }

      return created;
    }),

  /**
   * Update a procurement.
   */
  update: companyProcedure
    .input(updateProcurementSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;

      // Verify procurement belongs to company and not locked
      const existing = await verifyProcurementCompany(ctx.db, id, ctx.companyId);

      if (existing.isLocked) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vergabe ist gesperrt und kann nicht bearbeitet werden',
        });
      }

      // Build update data
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (fields.title !== undefined) updateData.title = fields.title;
      if (fields.description !== undefined) updateData.description = fields.description;
      if (fields.clientId !== undefined) updateData.clientId = fields.clientId;
      if (fields.clientContactId !== undefined) updateData.clientContactId = fields.clientContactId;
      if (fields.costEstimationId !== undefined) updateData.costEstimationId = fields.costEstimationId;
      if (fields.number !== undefined) updateData.number = fields.number;
      if (fields.currency !== undefined) updateData.currency = fields.currency;
      if (fields.notes !== undefined) updateData.notes = fields.notes;
      if (fields.internalNotes !== undefined) updateData.internalNotes = fields.internalNotes;
      if (fields.termsConditions !== undefined) updateData.termsConditions = fields.termsConditions;
      if (fields.paymentTerms !== undefined) updateData.paymentTerms = fields.paymentTerms;
      if (fields.hoaiParams !== undefined) updateData.hoaiParams = fields.hoaiParams;
      if (fields.avaParams !== undefined) updateData.avaParams = fields.avaParams;
      if (fields.type !== undefined) updateData.type = fields.type;
      if (fields.projectId !== undefined) updateData.projectId = fields.projectId;

      if (fields.nebenkostenPercent !== undefined) {
        updateData.nebenkostenPercent = fields.nebenkostenPercent != null
          ? String(fields.nebenkostenPercent)
          : null;
      }

      if (fields.validUntil !== undefined) {
        updateData.validUntil = fields.validUntil
          ? fields.validUntil.toISOString().split('T')[0]
          : null;
      }

      // Recalculate totals if financial fields changed
      const vatRate = fields.vatRate ?? Number(existing.status); // fallback
      if (fields.totalValueNet !== undefined || fields.vatRate !== undefined) {
        // Need to get current vatRate for recalculation
        const [current] = await ctx.db
          .select({ vatRate: procurements.vatRate, totalValueNet: procurements.totalValueNet })
          .from(procurements)
          .where(eq(procurements.id, id))
          .limit(1);

        const newVatRate = fields.vatRate ?? Number(current?.vatRate ?? 19);
        const newNetValue = fields.totalValueNet ?? Number(current?.totalValueNet ?? 0);

        updateData.vatRate = String(newVatRate);
        updateData.totalValueNet = String(newNetValue);
        updateData.totalValueGross = String(
          Math.round(newNetValue * (1 + newVatRate / 100) * 100) / 100,
        );
      }

      const [updated] = await ctx.db
        .update(procurements)
        .set(updateData)
        .where(eq(procurements.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Vergabe nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Mark a procurement as sent.
   */
  send: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await verifyProcurementCompany(ctx.db, input.id, ctx.companyId);

      if (existing.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nur Entwuerfe koennen versendet werden',
        });
      }

      await ctx.db
        .update(procurements)
        .set({
          status: 'sent',
          sentAt: new Date(),
          isLocked: true,
          updatedAt: new Date(),
        })
        .where(eq(procurements.id, input.id));

      return { success: true };
    }),

  /**
   * Mark a procurement as accepted.
   */
  accept: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await verifyProcurementCompany(ctx.db, input.id, ctx.companyId);

      if (existing.status !== 'sent') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Nur versendete Vergaben koennen angenommen werden',
        });
      }

      await ctx.db
        .update(procurements)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(procurements.id, input.id));

      return { success: true };
    }),

  positions: createTRPCRouter({
    /**
     * Add a position to a procurement.
     */
    create: companyProcedure
      .input(createPositionSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify procurement belongs to company and not locked
        const procurement = await verifyProcurementCompany(
          ctx.db,
          input.procurementId,
          ctx.companyId,
        );

        if (procurement.isLocked) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vergabe ist gesperrt',
          });
        }

        // Calculate totals
        const quantity = input.quantity ?? 0;
        const unitPrice = input.unitPrice ?? 0;
        const totalNet = Math.round(quantity * unitPrice * 100) / 100;
        const posVatRate = input.vatRate ?? 19;
        const totalGross =
          Math.round(totalNet * (1 + posVatRate / 100) * 100) / 100;

        const [created] = await ctx.db
          .insert(procurementPositions)
          .values({
            procurementId: input.procurementId,
            groupId: input.groupId,
            parentId: input.parentId,
            costPositionId: input.costPositionId,
            positionNumber: input.positionNumber,
            shortText: input.shortText,
            longText: input.longText,
            workPackageCode: input.workPackageCode,
            workPackageName: input.workPackageName,
            costGroup: input.costGroup,
            level: input.level,
            unit: input.unit,
            quantity: quantity > 0 ? String(quantity) : null,
            unitPrice: unitPrice > 0 ? String(unitPrice) : null,
            totalNet: String(totalNet),
            vatRate: String(posVatRate),
            totalGross: String(totalGross),
            sortOrder: input.sortOrder ?? 0,
            isCustom: input.isCustom ?? false,
            isOptional: input.isOptional ?? false,
            isGroup: input.isGroup ?? false,
            color: input.color,
            typeData: input.typeData ?? {},
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Position konnte nicht erstellt werden',
          });
        }

        // Recalculate procurement totals
        await recalcProcurementTotals(ctx.db, input.procurementId);

        return created;
      }),

    /**
     * Update a procurement position.
     */
    update: companyProcedure
      .input(updatePositionSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...fields } = input;

        // Fetch position to get procurementId
        const [position] = await ctx.db
          .select({
            id: procurementPositions.id,
            procurementId: procurementPositions.procurementId,
          })
          .from(procurementPositions)
          .where(eq(procurementPositions.id, id))
          .limit(1);

        if (!position) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Position nicht gefunden',
          });
        }

        // Verify procurement belongs to company and not locked
        const procurement = await verifyProcurementCompany(
          ctx.db,
          position.procurementId,
          ctx.companyId,
        );

        if (procurement.isLocked) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vergabe ist gesperrt',
          });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (fields.groupId !== undefined) updateData.groupId = fields.groupId;
        if (fields.parentId !== undefined) updateData.parentId = fields.parentId;
        if (fields.costPositionId !== undefined) updateData.costPositionId = fields.costPositionId;
        if (fields.positionNumber !== undefined) updateData.positionNumber = fields.positionNumber;
        if (fields.shortText !== undefined) updateData.shortText = fields.shortText;
        if (fields.longText !== undefined) updateData.longText = fields.longText;
        if (fields.workPackageCode !== undefined) updateData.workPackageCode = fields.workPackageCode;
        if (fields.workPackageName !== undefined) updateData.workPackageName = fields.workPackageName;
        if (fields.costGroup !== undefined) updateData.costGroup = fields.costGroup;
        if (fields.level !== undefined) updateData.level = fields.level;
        if (fields.unit !== undefined) updateData.unit = fields.unit;
        if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;
        if (fields.isCustom !== undefined) updateData.isCustom = fields.isCustom;
        if (fields.isOptional !== undefined) updateData.isOptional = fields.isOptional;
        if (fields.isGroup !== undefined) updateData.isGroup = fields.isGroup;
        if (fields.color !== undefined) updateData.color = fields.color;
        if (fields.typeData !== undefined) updateData.typeData = fields.typeData;

        // Recalculate line totals if quantity/unitPrice/vatRate changed
        if (
          fields.quantity !== undefined ||
          fields.unitPrice !== undefined ||
          fields.vatRate !== undefined
        ) {
          // Need current values
          const [current] = await ctx.db
            .select({
              quantity: procurementPositions.quantity,
              unitPrice: procurementPositions.unitPrice,
              vatRate: procurementPositions.vatRate,
            })
            .from(procurementPositions)
            .where(eq(procurementPositions.id, id))
            .limit(1);

          const qty = fields.quantity ?? Number(current?.quantity ?? 0);
          const price = fields.unitPrice ?? Number(current?.unitPrice ?? 0);
          const vat = fields.vatRate ?? Number(current?.vatRate ?? 19);

          const totalNet = Math.round(qty * price * 100) / 100;
          const totalGross = Math.round(totalNet * (1 + vat / 100) * 100) / 100;

          updateData.quantity = String(qty);
          updateData.unitPrice = String(price);
          updateData.vatRate = String(vat);
          updateData.totalNet = String(totalNet);
          updateData.totalGross = String(totalGross);
        }

        const [updated] = await ctx.db
          .update(procurementPositions)
          .set(updateData)
          .where(eq(procurementPositions.id, id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Position nicht gefunden',
          });
        }

        // Recalculate procurement totals
        await recalcProcurementTotals(ctx.db, position.procurementId);

        return updated;
      }),

    /**
     * Delete a procurement position.
     */
    delete: companyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        // Fetch position to get procurementId
        const [position] = await ctx.db
          .select({
            id: procurementPositions.id,
            procurementId: procurementPositions.procurementId,
          })
          .from(procurementPositions)
          .where(eq(procurementPositions.id, input.id))
          .limit(1);

        if (!position) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Position nicht gefunden',
          });
        }

        // Verify procurement belongs to company and not locked
        const procurement = await verifyProcurementCompany(
          ctx.db,
          position.procurementId,
          ctx.companyId,
        );

        if (procurement.isLocked) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vergabe ist gesperrt',
          });
        }

        // Delete the position
        await ctx.db
          .delete(procurementPositions)
          .where(eq(procurementPositions.id, input.id));

        // Recalculate procurement totals
        await recalcProcurementTotals(ctx.db, position.procurementId);

        return { success: true };
      }),
  }),

  groups: createTRPCRouter({
    /**
     * Add a group/phase to a procurement.
     */
    create: companyProcedure
      .input(createGroupSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify procurement belongs to company and not locked
        const procurement = await verifyProcurementCompany(
          ctx.db,
          input.procurementId,
          ctx.companyId,
        );

        if (procurement.isLocked) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vergabe ist gesperrt',
          });
        }

        const [created] = await ctx.db
          .insert(procurementGroups)
          .values({
            procurementId: input.procurementId,
            parentGroupId: input.parentGroupId,
            name: input.name,
            code: input.code,
            groupType: input.groupType,
            sortOrder: input.sortOrder ?? 0,
            description: input.description,
            phaseNumber: input.phaseNumber,
            percentageBasic: input.percentageBasic != null ? String(input.percentageBasic) : null,
            percentageSpecial: input.percentageSpecial != null ? String(input.percentageSpecial) : null,
            percentageActual: input.percentageActual != null ? String(input.percentageActual) : null,
            feeBasic: input.feeBasic != null ? String(input.feeBasic) : null,
            feeSpecial: input.feeSpecial != null ? String(input.feeSpecial) : null,
            feeTotal: input.feeTotal != null ? String(input.feeTotal) : null,
            isIncluded: input.isIncluded ?? true,
            isOptional: input.isOptional ?? false,
            estimatedDurationWeeks: input.estimatedDurationWeeks,
            plannedStartDate: input.plannedStartDate
              ? input.plannedStartDate.toISOString().split('T')[0]
              : null,
            plannedEndDate: input.plannedEndDate
              ? input.plannedEndDate.toISOString().split('T')[0]
              : null,
            includedServices: input.includedServices ?? [],
            specialServices: input.specialServices ?? [],
            excludedServices: input.excludedServices ?? [],
            deliverables: input.deliverables ?? [],
            notes: input.notes,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Gruppe konnte nicht erstellt werden',
          });
        }

        return created;
      }),

    /**
     * Update a procurement group.
     */
    update: companyProcedure
      .input(updateGroupSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...fields } = input;

        // Fetch group to get procurementId
        const [group] = await ctx.db
          .select({
            id: procurementGroups.id,
            procurementId: procurementGroups.procurementId,
          })
          .from(procurementGroups)
          .where(eq(procurementGroups.id, id))
          .limit(1);

        if (!group) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Gruppe nicht gefunden',
          });
        }

        // Verify procurement belongs to company and not locked
        const procurement = await verifyProcurementCompany(
          ctx.db,
          group.procurementId,
          ctx.companyId,
        );

        if (procurement.isLocked) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vergabe ist gesperrt',
          });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (fields.name !== undefined) updateData.name = fields.name;
        if (fields.code !== undefined) updateData.code = fields.code;
        if (fields.groupType !== undefined) updateData.groupType = fields.groupType;
        if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.phaseNumber !== undefined) updateData.phaseNumber = fields.phaseNumber;
        if (fields.parentGroupId !== undefined) updateData.parentGroupId = fields.parentGroupId;
        if (fields.isIncluded !== undefined) updateData.isIncluded = fields.isIncluded;
        if (fields.isOptional !== undefined) updateData.isOptional = fields.isOptional;
        if (fields.estimatedDurationWeeks !== undefined) updateData.estimatedDurationWeeks = fields.estimatedDurationWeeks;
        if (fields.notes !== undefined) updateData.notes = fields.notes;

        if (fields.percentageBasic !== undefined) {
          updateData.percentageBasic = fields.percentageBasic != null ? String(fields.percentageBasic) : null;
        }
        if (fields.percentageSpecial !== undefined) {
          updateData.percentageSpecial = fields.percentageSpecial != null ? String(fields.percentageSpecial) : null;
        }
        if (fields.percentageActual !== undefined) {
          updateData.percentageActual = fields.percentageActual != null ? String(fields.percentageActual) : null;
        }
        if (fields.feeBasic !== undefined) {
          updateData.feeBasic = fields.feeBasic != null ? String(fields.feeBasic) : null;
        }
        if (fields.feeSpecial !== undefined) {
          updateData.feeSpecial = fields.feeSpecial != null ? String(fields.feeSpecial) : null;
        }
        if (fields.feeTotal !== undefined) {
          updateData.feeTotal = fields.feeTotal != null ? String(fields.feeTotal) : null;
        }

        if (fields.plannedStartDate !== undefined) {
          updateData.plannedStartDate = fields.plannedStartDate
            ? fields.plannedStartDate.toISOString().split('T')[0]
            : null;
        }
        if (fields.plannedEndDate !== undefined) {
          updateData.plannedEndDate = fields.plannedEndDate
            ? fields.plannedEndDate.toISOString().split('T')[0]
            : null;
        }

        if (fields.includedServices !== undefined) updateData.includedServices = fields.includedServices;
        if (fields.specialServices !== undefined) updateData.specialServices = fields.specialServices;
        if (fields.excludedServices !== undefined) updateData.excludedServices = fields.excludedServices;
        if (fields.deliverables !== undefined) updateData.deliverables = fields.deliverables;

        const [updated] = await ctx.db
          .update(procurementGroups)
          .set(updateData)
          .where(eq(procurementGroups.id, id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Gruppe nicht gefunden',
          });
        }

        return updated;
      }),
  }),

  bids: createTRPCRouter({
    /**
     * List bids for a procurement.
     */
    list: companyProcedure
      .input(bidFilterSchema)
      .query(async ({ ctx, input }) => {
        // Verify procurement belongs to company
        await verifyProcurementCompany(ctx.db, input.procurementId, ctx.companyId);

        const bidList = await ctx.db
          .select({
            id: bids.id,
            bidderName: organizations.name,
            submissionDate: bids.submissionDate,
            totalNet: bids.totalNet,
            totalGross: bids.totalGross,
            status: bids.status,
            decision: bids.decision,
            evaluation: bids.evaluation,
            createdAt: bids.createdAt,
          })
          .from(bids)
          .innerJoin(organizations, eq(bids.bidderId, organizations.id))
          .where(eq(bids.procurementId, input.procurementId))
          .orderBy(asc(bids.createdAt));

        return bidList.map((b) => {
          // Calculate evaluation score from criteria if present
          const eval_ = b.evaluation as any;
          let evaluationScore: number | null = null;
          if (eval_?.criteria && Array.isArray(eval_.criteria) && eval_.criteria.length > 0) {
            const totalWeight = eval_.criteria.reduce(
              (sum: number, c: any) => sum + (c.weight ?? 0),
              0,
            );
            if (totalWeight > 0) {
              evaluationScore = Math.round(
                eval_.criteria.reduce(
                  (sum: number, c: any) =>
                    sum + ((c.score ?? 0) * (c.weight ?? 0)) / totalWeight,
                  0,
                ) * 100,
              ) / 100;
            }
          }

          return {
            id: b.id,
            bidderName: b.bidderName,
            submissionDate: b.submissionDate,
            totalNet: b.totalNet,
            totalGross: b.totalGross,
            status: b.status ?? 'submitted',
            decision: b.decision,
            evaluationScore,
            createdAt: b.createdAt,
          };
        });
      }),

    /**
     * Enter a new bid for a procurement.
     */
    create: companyProcedure
      .input(createBidSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify procurement belongs to company
        const procurement = await verifyProcurementCompany(
          ctx.db,
          input.procurementId,
          ctx.companyId,
        );

        // Verify procurement is in an appropriate status for bidding
        const biddingStatuses = ['published', 'bidding', 'sent'];
        if (!biddingStatuses.includes(procurement.status)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Vergabe ist nicht im Angebotsstatus',
          });
        }

        const [created] = await ctx.db
          .insert(bids)
          .values({
            procurementId: input.procurementId,
            bidderId: input.bidderId,
            argePartners: input.argePartners ?? [],
            submissionDate: input.submissionDate ?? new Date(),
            totalNet: input.totalNet != null ? String(input.totalNet) : null,
            totalGross: input.totalGross != null ? String(input.totalGross) : null,
            status: 'submitted',
            notes: input.notes,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Angebot konnte nicht erstellt werden',
          });
        }

        return created;
      }),

    /**
     * Score/evaluate a bid.
     */
    evaluate: companyProcedure
      .input(evaluateBidSchema)
      .mutation(async ({ ctx, input }) => {
        // Fetch bid to get procurementId
        const [bid] = await ctx.db
          .select({
            id: bids.id,
            procurementId: bids.procurementId,
          })
          .from(bids)
          .where(eq(bids.id, input.id))
          .limit(1);

        if (!bid) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Angebot nicht gefunden',
          });
        }

        // Verify procurement belongs to company
        await verifyProcurementCompany(ctx.db, bid.procurementId, ctx.companyId);

        const [updated] = await ctx.db
          .update(bids)
          .set({
            evaluation: input.evaluation,
            updatedAt: new Date(),
          })
          .where(eq(bids.id, input.id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Angebot nicht gefunden',
          });
        }

        return updated;
      }),

    /**
     * Award or reject a bid.
     */
    award: companyProcedure
      .input(awardBidSchema)
      .mutation(async ({ ctx, input }) => {
        // Fetch bid to get procurementId
        const [bid] = await ctx.db
          .select({
            id: bids.id,
            procurementId: bids.procurementId,
          })
          .from(bids)
          .where(eq(bids.id, input.id))
          .limit(1);

        if (!bid) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Angebot nicht gefunden',
          });
        }

        // Verify procurement belongs to company
        await verifyProcurementCompany(ctx.db, bid.procurementId, ctx.companyId);

        // Update bid with decision
        const [updated] = await ctx.db
          .update(bids)
          .set({
            decision: input.decision,
            decisionReason: input.decisionReason,
            decidedAt: new Date(),
            decidedBy: ctx.session.user.id,
            updatedAt: new Date(),
          })
          .where(eq(bids.id, input.id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Angebot nicht gefunden',
          });
        }

        // If awarded, update procurement status to 'awarded'
        if (input.decision === 'awarded') {
          await ctx.db
            .update(procurements)
            .set({
              status: 'awarded',
              updatedAt: new Date(),
            })
            .where(eq(procurements.id, bid.procurementId));
        }

        return updated;
      }),
  }),
});
