import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, sql, desc } from 'drizzle-orm';
import {
  tenders,
  inboundEmails,
  inboundEmailConfigs,
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

const tenderStatusEnum = z.enum([
  'discovered',
  'qualified',
  'analyzed',
  'bid_prepared',
  'submitted',
  'awarded',
  'cancelled',
]);

const listTendersSchema = z
  .object({
    status: tenderStatusEnum.optional(),
    buildingType: z.string().max(100).optional(),
    locationCity: z.string().max(100).optional(),
    locationState: z.string().max(100).optional(),
    assignedTo: z.number().int().positive().optional(),
    search: z.string().max(200).optional(),
    deadlineBefore: z.coerce.date().optional(),
  })
  .merge(paginationSchema);

const createTenderSchema = z.object({
  projectId: z.number().int().positive().optional(),
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  description: z.string().optional(),
  referenceNumber: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  spenId: z.string().max(100).optional(),
  platformUrl: z.string().max(500).optional(),
  procurementType: z.string().max(100).optional(),
  cpvCodes: z.array(z.string()).optional(),
  contractingAuthority: z.string().max(255).optional(),
  clientId: z.number().int().positive().optional(),
  locationAddress: z.string().max(255).optional(),
  locationCity: z.string().max(100).optional(),
  locationPostalCode: z.string().max(20).optional(),
  locationState: z.string().max(100).optional(),
  estimatedValueNet: z.string().optional(),
  currency: z.string().length(3).default('EUR'),
  publicationDate: z.string().optional(),
  submissionDeadline: z.coerce.date().optional(),
  bindingPeriodEnd: z.string().optional(),
  executionStart: z.string().optional(),
  executionEnd: z.string().optional(),
  hoaiPhases: z.array(z.number().int().min(1).max(9)).optional(),
  honorarzone: z.number().int().min(1).max(5).optional(),
  buildingType: z.string().max(100).optional(),
  buildingTypeL2: z.string().max(100).optional(),
  status: tenderStatusEnum.optional(),
  assignedTo: z.number().int().positive().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateTenderSchema = createTenderSchema.partial().extend({
  id: z.number().int().positive(),
  compositeScore: z.string().optional(),
  legalAssessment: z.record(z.unknown()).optional(),
  analysis: z.record(z.unknown()).optional(),
  scoring: z.record(z.unknown()).optional(),
  qaReview: z.record(z.unknown()).optional(),
  partnerMatches: z.array(z.record(z.unknown())).optional(),
});

const listEmailsSchema = z
  .object({
    tenderId: z.number().int().positive().optional(),
    configId: z.number().int().positive().optional(),
  })
  .merge(paginationSchema);

const createEmailConfigSchema = z.object({
  emailAddress: z.string().email('Ungueltige E-Mail-Adresse').max(255),
  provider: z.string().min(1, 'Provider ist erforderlich').max(50),
  credentials: z.record(z.unknown()).optional(),
  filters: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyTenderCompany(
  db: any,
  tenderId: number,
  companyId: number,
) {
  const [tender] = await db
    .select({ id: tenders.id })
    .from(tenders)
    .where(
      and(
        eq(tenders.id, tenderId),
        eq(tenders.companyId, companyId),
        sql`${tenders.deletedAt} IS NULL`,
      ),
    )
    .limit(1);

  if (!tender) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Ausschreibung nicht gefunden',
    });
  }
  return tender;
}

// ---------------------------------------------------------------------------
// Sub-routers
// ---------------------------------------------------------------------------

const emailsRouter = createTRPCRouter({
  /**
   * List inbound emails for company, optionally filtered by tender.
   */
  list: companyProcedure
    .input(listEmailsSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, tenderId, configId } = input;
      const offset = (page - 1) * pageSize;

      const conditions: any[] = [
        eq(inboundEmails.companyId, ctx.companyId),
      ];

      if (tenderId) conditions.push(eq(inboundEmails.tenderId, tenderId));
      if (configId) conditions.push(eq(inboundEmails.configId, configId));

      const where = and(...conditions);

      const [countResult] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(inboundEmails)
        .where(where);

      const total = countResult?.total ?? 0;

      const items = await ctx.db
        .select()
        .from(inboundEmails)
        .where(where)
        .orderBy(desc(inboundEmails.createdAt))
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
   * Get a single inbound email by ID.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [email] = await ctx.db
        .select()
        .from(inboundEmails)
        .where(
          and(
            eq(inboundEmails.id, input.id),
            eq(inboundEmails.companyId, ctx.companyId),
          ),
        )
        .limit(1);

      if (!email) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'E-Mail nicht gefunden',
        });
      }

      return email;
    }),
});

const configsRouter = createTRPCRouter({
  /**
   * List inbound email configs for the company.
   */
  list: companyProcedure
    .query(async ({ ctx }) => {
      const items = await ctx.db
        .select()
        .from(inboundEmailConfigs)
        .where(eq(inboundEmailConfigs.companyId, ctx.companyId))
        .orderBy(desc(inboundEmailConfigs.createdAt));

      return items;
    }),

  /**
   * Create a new inbound email config.
   */
  create: companyProcedure
    .input(createEmailConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(inboundEmailConfigs)
        .values({
          companyId: ctx.companyId,
          emailAddress: input.emailAddress,
          provider: input.provider,
          credentials: input.credentials,
          filters: input.filters ?? {},
          isActive: input.isActive,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'E-Mail-Konfiguration konnte nicht erstellt werden',
        });
      }

      return created;
    }),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const tendersRouter = createTRPCRouter({
  /**
   * List tenders for the company with filters.
   */
  list: companyProcedure
    .input(listTendersSchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, status, buildingType, locationCity, locationState, assignedTo, search, deadlineBefore } = input;
      const offset = (page - 1) * pageSize;

      const conditions: any[] = [
        eq(tenders.companyId, ctx.companyId),
        sql`${tenders.deletedAt} IS NULL`,
      ];

      if (status) conditions.push(eq(tenders.status, status));
      if (buildingType) conditions.push(eq(tenders.buildingType, buildingType));
      if (locationCity) conditions.push(eq(tenders.locationCity, locationCity));
      if (locationState) conditions.push(eq(tenders.locationState, locationState));
      if (assignedTo) conditions.push(eq(tenders.assignedTo, assignedTo));
      if (search) {
        conditions.push(
          sql`(${tenders.title} ILIKE ${'%' + search + '%'} OR ${tenders.contractingAuthority} ILIKE ${'%' + search + '%'})`,
        );
      }
      if (deadlineBefore) {
        conditions.push(sql`${tenders.submissionDeadline} <= ${deadlineBefore}`);
      }

      const where = and(...conditions);

      const [countResult] = await ctx.db
        .select({ total: sql<number>`count(*)::int` })
        .from(tenders)
        .where(where);

      const total = countResult?.total ?? 0;

      const items = await ctx.db
        .select()
        .from(tenders)
        .where(where)
        .orderBy(desc(tenders.createdAt))
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
   * Get a single tender by ID.
   */
  getById: companyProcedure
    .input(idSchema)
    .query(async ({ ctx, input }) => {
      const [tender] = await ctx.db
        .select()
        .from(tenders)
        .where(
          and(
            eq(tenders.id, input.id),
            eq(tenders.companyId, ctx.companyId),
            sql`${tenders.deletedAt} IS NULL`,
          ),
        )
        .limit(1);

      if (!tender) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ausschreibung nicht gefunden',
        });
      }

      return tender;
    }),

  /**
   * Create a new tender.
   */
  create: companyProcedure
    .input(createTenderSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(tenders)
        .values({
          companyId: ctx.companyId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          referenceNumber: input.referenceNumber,
          source: input.source ?? 'manual',
          spenId: input.spenId,
          platformUrl: input.platformUrl,
          procurementType: input.procurementType,
          cpvCodes: input.cpvCodes ?? [],
          contractingAuthority: input.contractingAuthority,
          clientId: input.clientId,
          locationAddress: input.locationAddress,
          locationCity: input.locationCity,
          locationPostalCode: input.locationPostalCode,
          locationState: input.locationState,
          estimatedValueNet: input.estimatedValueNet,
          currency: input.currency,
          publicationDate: input.publicationDate,
          submissionDeadline: input.submissionDeadline,
          bindingPeriodEnd: input.bindingPeriodEnd,
          executionStart: input.executionStart,
          executionEnd: input.executionEnd,
          hoaiPhases: input.hoaiPhases ?? [],
          honorarzone: input.honorarzone,
          buildingType: input.buildingType,
          buildingTypeL2: input.buildingTypeL2,
          status: input.status ?? 'discovered',
          assignedTo: input.assignedTo,
          notes: input.notes,
          metadata: input.metadata ?? {},
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ausschreibung konnte nicht erstellt werden',
        });
      }

      return created;
    }),

  /**
   * Update a tender.
   */
  update: companyProcedure
    .input(updateTenderSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      await verifyTenderCompany(ctx.db, id, ctx.companyId);

      const [updated] = await ctx.db
        .update(tenders)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tenders.id, id),
            eq(tenders.companyId, ctx.companyId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Ausschreibung nicht gefunden',
        });
      }

      return updated;
    }),

  /**
   * Soft delete a tender.
   */
  delete: companyProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyTenderCompany(ctx.db, input.id, ctx.companyId);

      await ctx.db
        .update(tenders)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(tenders.id, input.id),
            eq(tenders.companyId, ctx.companyId),
          ),
        );

      return { success: true };
    }),

  emails: emailsRouter,
  configs: configsRouter,
});
