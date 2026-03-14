import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, like, desc, asc, sql, count, isNull } from 'drizzle-orm';
import {
  contracts,
  invoices,
  projects,
  organizations,
  costEstimations,
  costPositions,
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

const idSchema = z.object({
  id: z.number().int().positive(),
});

// -- Contracts

const contractStatusEnum = z.enum([
  'draft',
  'active',
  'completed',
  'terminated',
  'suspended',
]);

const contractTypeEnum = z.enum(['service', 'construction', 'consulting']);

const contractsListSchema = z
  .object({
    projectId: z.number().int().positive().optional(),
    status: contractStatusEnum.optional(),
    organizationId: z.number().int().positive().optional(),
  })
  .merge(paginationSchema);

const createContractSchema = z.object({
  projectId: z.number().int().positive(),
  procurementId: z.number().int().positive().optional(),
  organizationId: z.number().int().positive().optional(),
  contractType: contractTypeEnum,
  number: z.string().max(50).optional(),
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  description: z.string().optional(),
  status: contractStatusEnum.default('draft'),
  contractDate: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
  totalFeeNet: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).default(19),
  currency: z.string().length(3).default('EUR'),
  items: z
    .array(
      z.object({
        description: z.string(),
        unit: z.string().optional(),
        qty: z.number().optional(),
        unitPrice: z.number().optional(),
        total: z.number().optional(),
        hoaiPhase: z.number().int().min(1).max(9).optional(),
        percentage: z.number().min(0).max(100).optional(),
      }),
    )
    .optional(),
  terms: z
    .object({
      paymentTerms: z.number().int().min(0).max(365).optional(),
      retentionPercentage: z.number().min(0).max(100).optional(),
      penalties: z.string().optional(),
      warranties: z.string().optional(),
    })
    .optional(),
  performanceBondRequired: z.boolean().optional(),
  performanceBondAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

const updateContractSchema = createContractSchema.partial().extend({
  id: z.number().int().positive(),
  signedAt: z.coerce.date().optional(),
  actualEndDate: z.coerce.date().optional(),
  terminationReason: z.string().optional(),
});

// -- Invoices

const invoiceStatusEnum = z.enum([
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
  'partially_paid',
]);

const invoiceTypeEnum = z.enum([
  'standard',
  'partial',
  'final',
  'credit_note',
  'advance',
]);

const invoiceDirectionEnum = z.enum(['outbound', 'inbound']);

const invoicesListSchema = z
  .object({
    contractId: z.number().int().positive().optional(),
    projectId: z.number().int().positive().optional(),
    status: invoiceStatusEnum.optional(),
    direction: invoiceDirectionEnum.optional(),
    dateRange: z
      .object({
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
      .optional(),
  })
  .merge(paginationSchema);

const createInvoiceSchema = z.object({
  projectId: z.number().int().positive().optional(),
  contractId: z.number().int().positive().optional(),
  organizationId: z.number().int().positive().optional(),
  direction: invoiceDirectionEnum,
  invoiceNumber: z.string().max(50),
  type: invoiceTypeEnum.default('standard'),
  status: invoiceStatusEnum.default('draft'),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  currency: z.string().length(3).default('EUR'),
  amountNet: z.number().min(0).optional(),
  amountVat: z.number().min(0).optional(),
  amountGross: z.number().min(0).optional(),
  modules: z
    .array(
      z.object({
        moduleId: z.number().int().positive(),
        description: z.string(),
        amount: z.number(),
        phase: z.number().int().min(1).max(9).optional(),
      }),
    )
    .optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        qty: z.number().optional(),
        unitPrice: z.number().optional(),
        taxRate: z.number().min(0).max(100).optional(),
        total: z.number().optional(),
      }),
    )
    .optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  id: z.number().int().positive(),
});

const markPaidSchema = z.object({
  id: z.number().int().positive(),
  paidAmount: z.number().min(0),
  paidAt: z.coerce.date(),
  paymentInfo: z
    .object({
      method: z.string().optional(),
      reference: z.string().optional(),
      bankAccount: z.string().optional(),
    })
    .optional(),
});

// -- Cost Estimations

const estimationTypeEnum = z.enum([
  'kostenschaetzung',
  'kostenberechnung',
  'kostenanschlag',
  'kostenfeststellung',
]);

const costEstimationsListSchema = z.object({
  projectId: z.number().int().positive(),
});

const createCostEstimationSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  estimationType: estimationTypeEnum,
  din276Level: z.number().int().min(1).max(4).default(2),
  status: z.enum(['draft', 'active', 'approved', 'archived']).default('draft'),
  baseDate: z.coerce.date().optional(),
  vatRate: z.number().min(0).max(100).default(19),
  notes: z.string().optional(),
});

const createCostPositionSchema = z.object({
  estimationId: z.number().int().positive(),
  parentId: z.number().int().positive().optional(),
  costGroupCode: z.string().min(1).max(10),
  level: z.number().int().min(1).max(4),
  shortText: z.string().max(500).optional(),
  longText: z.string().optional(),
  workPackageCode: z.string().max(20).optional(),
  workPackageName: z.string().max(255).optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().max(30).optional(),
  unitPrice: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isCustom: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  isGroup: z.boolean().optional(),
  color: z.string().max(20).optional(),
});

const updateCostPositionSchema = createCostPositionSchema.partial().extend({
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

async function verifyContractCompany(
  db: any,
  contractId: number,
  companyId: number,
) {
  const [contract] = await db
    .select({
      id: contracts.id,
      projectId: contracts.projectId,
      status: contracts.status,
    })
    .from(contracts)
    .innerJoin(projects, eq(contracts.projectId, projects.id))
    .where(
      and(
        eq(contracts.id, contractId),
        eq(projects.companyId, companyId),
        isNull(contracts.deletedAt),
      ),
    )
    .limit(1);

  if (!contract) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Vertrag nicht gefunden',
    });
  }
  return contract;
}

async function verifyInvoiceCompany(
  db: any,
  invoiceId: number,
  companyId: number,
) {
  const [invoice] = await db
    .select({
      id: invoices.id,
      status: invoices.status,
      contractId: invoices.contractId,
      amountGross: invoices.amountGross,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.companyId, companyId),
        isNull(invoices.deletedAt),
      ),
    )
    .limit(1);

  if (!invoice) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Rechnung nicht gefunden',
    });
  }
  return invoice;
}

async function verifyEstimationCompany(
  db: any,
  estimationId: number,
  companyId: number,
) {
  const [estimation] = await db
    .select({
      id: costEstimations.id,
      projectId: costEstimations.projectId,
      vatRate: costEstimations.vatRate,
    })
    .from(costEstimations)
    .innerJoin(projects, eq(costEstimations.projectId, projects.id))
    .where(
      and(
        eq(costEstimations.id, estimationId),
        eq(projects.companyId, companyId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);

  if (!estimation) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Kostenschaetzung nicht gefunden',
    });
  }
  return estimation;
}

/** Recalculate estimation totalNet/totalGross from its positions (leaf-level only) */
async function recalcEstimationTotals(db: any, estimationId: number) {
  const [sums] = await db
    .select({
      totalNet: sql<string>`COALESCE(SUM(${costPositions.totalNet}), 0)`,
      totalGross: sql<string>`COALESCE(SUM(${costPositions.totalGross}), 0)`,
    })
    .from(costPositions)
    .where(
      and(
        eq(costPositions.estimationId, estimationId),
        sql`${costPositions.isGroup} = false`,
      ),
    );

  await db
    .update(costEstimations)
    .set({
      totalNet: sums.totalNet,
      totalGross: sums.totalGross,
      updatedAt: new Date(),
    })
    .where(eq(costEstimations.id, estimationId));
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const financeRouter = createTRPCRouter({
  contracts: createTRPCRouter({
    /**
     * List contracts with filtering.
     */
    list: companyProcedure
      .input(contractsListSchema)
      .query(async ({ ctx, input }) => {
        const conditions: any[] = [
          eq(projects.companyId, ctx.companyId),
          isNull(contracts.deletedAt),
        ];

        if (input.projectId) {
          conditions.push(eq(contracts.projectId, input.projectId));
        }
        if (input.status) {
          conditions.push(eq(contracts.status, input.status));
        }
        if (input.organizationId) {
          conditions.push(eq(contracts.organizationId, input.organizationId));
        }

        const whereClause = and(...conditions);

        // Get total count
        const totalResult = await ctx.db
          .select({ total: count() })
          .from(contracts)
          .innerJoin(projects, eq(contracts.projectId, projects.id))
          .where(whereClause);
        const total = totalResult[0]?.total ?? 0;

        // Get items
        const orderDir = input.sortOrder === 'desc' ? desc : asc;
        const orderField =
          input.sortBy === 'title' ? contracts.title :
          input.sortBy === 'status' ? contracts.status :
          input.sortBy === 'totalFeeNet' ? contracts.totalFeeNet :
          input.sortBy === 'startDate' ? contracts.startDate :
          contracts.createdAt;

        const offset = (input.page - 1) * input.pageSize;

        const items = await ctx.db
          .select({
            id: contracts.id,
            projectId: contracts.projectId,
            projectName: projects.name,
            contractType: contracts.contractType,
            number: contracts.number,
            title: contracts.title,
            status: contracts.status,
            organizationName: organizations.name,
            totalFeeNet: contracts.totalFeeNet,
            invoicedNet: contracts.invoicedNet,
            paidNet: contracts.paidNet,
            startDate: contracts.startDate,
            plannedEndDate: contracts.plannedEndDate,
            createdAt: contracts.createdAt,
          })
          .from(contracts)
          .innerJoin(projects, eq(contracts.projectId, projects.id))
          .leftJoin(organizations, eq(contracts.organizationId, organizations.id))
          .where(whereClause)
          .orderBy(orderDir(orderField))
          .limit(input.pageSize)
          .offset(offset);

        return {
          items: items.map((item) => ({
            id: item.id,
            projectId: item.projectId,
            projectName: item.projectName,
            contractType: item.contractType,
            number: item.number,
            title: item.title,
            status: item.status,
            organizationName: item.organizationName,
            totalFeeNet: item.totalFeeNet,
            invoicedNet: item.invoicedNet,
            paidNet: item.paidNet,
            startDate: item.startDate,
            plannedEndDate: item.plannedEndDate,
            createdAt: item.createdAt,
          })),
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Get a contract with its items and financial details.
     */
    getById: companyProcedure
      .input(idSchema)
      .query(async ({ ctx, input }) => {
        // Fetch contract with project verification
        const [contract] = await ctx.db
          .select({
            id: contracts.id,
            projectId: contracts.projectId,
            projectName: projects.name,
            procurementId: contracts.procurementId,
            organizationId: contracts.organizationId,
            organizationName: organizations.name,
            contractType: contracts.contractType,
            number: contracts.number,
            title: contracts.title,
            description: contracts.description,
            status: contracts.status,
            contractDate: contracts.contractDate,
            signedAt: contracts.signedAt,
            startDate: contracts.startDate,
            plannedEndDate: contracts.plannedEndDate,
            actualEndDate: contracts.actualEndDate,
            totalFeeNet: contracts.totalFeeNet,
            vatRate: contracts.vatRate,
            totalFeeGross: contracts.totalFeeGross,
            invoicedNet: contracts.invoicedNet,
            paidNet: contracts.paidNet,
            currency: contracts.currency,
            items: contracts.items,
            terms: contracts.terms,
            performanceBondRequired: contracts.performanceBondRequired,
            performanceBondAmount: contracts.performanceBondAmount,
            notes: contracts.notes,
            internalNotes: contracts.internalNotes,
            terminationReason: contracts.terminationReason,
            createdAt: contracts.createdAt,
            updatedAt: contracts.updatedAt,
          })
          .from(contracts)
          .innerJoin(projects, eq(contracts.projectId, projects.id))
          .leftJoin(organizations, eq(contracts.organizationId, organizations.id))
          .where(
            and(
              eq(contracts.id, input.id),
              eq(projects.companyId, ctx.companyId),
              isNull(contracts.deletedAt),
            ),
          )
          .limit(1);

        if (!contract) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vertrag nicht gefunden',
          });
        }

        // Fetch linked invoices
        const contractInvoices = await ctx.db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            type: invoices.type,
            direction: invoices.direction,
            status: invoices.status,
            invoiceDate: invoices.invoiceDate,
            amountNet: invoices.amountNet,
            amountGross: invoices.amountGross,
            paidAmount: invoices.paidAmount,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.contractId, input.id),
              isNull(invoices.deletedAt),
            ),
          )
          .orderBy(desc(invoices.invoiceDate));

        // Financial summary
        const totalInvoicedNet = contractInvoices.reduce(
          (sum, inv) => sum + Number(inv.amountNet ?? 0),
          0,
        );
        const totalPaidAmount = contractInvoices.reduce(
          (sum, inv) => sum + Number(inv.paidAmount ?? 0),
          0,
        );

        return {
          ...contract,
          invoices: contractInvoices,
          financialSummary: {
            totalFeeNet: contract.totalFeeNet,
            totalFeeGross: contract.totalFeeGross,
            invoicedNet: String(totalInvoicedNet),
            paidNet: String(totalPaidAmount),
            remainingNet: String(
              Number(contract.totalFeeNet ?? 0) - totalInvoicedNet,
            ),
          },
        };
      }),

    /**
     * Create a contract (optionally from a procurement).
     */
    create: companyProcedure
      .input(createContractSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify project belongs to company
        await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

        // Calculate gross from net + vat
        const netValue = input.totalFeeNet ?? 0;
        const grossValue =
          Math.round(netValue * (1 + input.vatRate / 100) * 100) / 100;

        // Generate contract number if not provided
        const number =
          input.number ?? `V-${Date.now().toString(36).toUpperCase()}`;

        const [created] = await ctx.db
          .insert(contracts)
          .values({
            projectId: input.projectId,
            procurementId: input.procurementId,
            organizationId: input.organizationId,
            contractType: input.contractType,
            number,
            title: input.title,
            description: input.description,
            status: input.status ?? 'draft',
            contractDate: input.contractDate
              ? input.contractDate.toISOString().split('T')[0]
              : null,
            startDate: input.startDate
              ? input.startDate.toISOString().split('T')[0]
              : null,
            plannedEndDate: input.plannedEndDate
              ? input.plannedEndDate.toISOString().split('T')[0]
              : null,
            totalFeeNet: netValue > 0 ? String(netValue) : null,
            vatRate: String(input.vatRate),
            totalFeeGross: grossValue > 0 ? String(grossValue) : null,
            currency: input.currency,
            items: input.items ?? [],
            terms: input.terms ?? {},
            performanceBondRequired: input.performanceBondRequired ?? false,
            performanceBondAmount: input.performanceBondAmount != null
              ? String(input.performanceBondAmount)
              : null,
            notes: input.notes,
            internalNotes: input.internalNotes,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Vertrag konnte nicht erstellt werden',
          });
        }

        return created;
      }),

    /**
     * Update a contract.
     */
    update: companyProcedure
      .input(updateContractSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...fields } = input;

        // Verify contract's project belongs to company
        await verifyContractCompany(ctx.db, id, ctx.companyId);

        // Build update data
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (fields.title !== undefined) updateData.title = fields.title;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.contractType !== undefined) updateData.contractType = fields.contractType;
        if (fields.number !== undefined) updateData.number = fields.number;
        if (fields.status !== undefined) updateData.status = fields.status;
        if (fields.organizationId !== undefined) updateData.organizationId = fields.organizationId;
        if (fields.procurementId !== undefined) updateData.procurementId = fields.procurementId;
        if (fields.projectId !== undefined) updateData.projectId = fields.projectId;
        if (fields.currency !== undefined) updateData.currency = fields.currency;
        if (fields.items !== undefined) updateData.items = fields.items;
        if (fields.terms !== undefined) updateData.terms = fields.terms;
        if (fields.performanceBondRequired !== undefined) updateData.performanceBondRequired = fields.performanceBondRequired;
        if (fields.notes !== undefined) updateData.notes = fields.notes;
        if (fields.internalNotes !== undefined) updateData.internalNotes = fields.internalNotes;
        if (fields.terminationReason !== undefined) updateData.terminationReason = fields.terminationReason;

        if (fields.performanceBondAmount !== undefined) {
          updateData.performanceBondAmount = fields.performanceBondAmount != null
            ? String(fields.performanceBondAmount)
            : null;
        }

        if (fields.contractDate !== undefined) {
          updateData.contractDate = fields.contractDate
            ? fields.contractDate.toISOString().split('T')[0]
            : null;
        }
        if (fields.signedAt !== undefined) {
          updateData.signedAt = fields.signedAt
            ? fields.signedAt.toISOString().split('T')[0]
            : null;
        }
        if (fields.startDate !== undefined) {
          updateData.startDate = fields.startDate
            ? fields.startDate.toISOString().split('T')[0]
            : null;
        }
        if (fields.plannedEndDate !== undefined) {
          updateData.plannedEndDate = fields.plannedEndDate
            ? fields.plannedEndDate.toISOString().split('T')[0]
            : null;
        }
        if (fields.actualEndDate !== undefined) {
          updateData.actualEndDate = fields.actualEndDate
            ? fields.actualEndDate.toISOString().split('T')[0]
            : null;
        }

        // Recalculate gross if net or vatRate changed
        if (fields.totalFeeNet !== undefined || fields.vatRate !== undefined) {
          const [current] = await ctx.db
            .select({
              vatRate: contracts.vatRate,
              totalFeeNet: contracts.totalFeeNet,
            })
            .from(contracts)
            .where(eq(contracts.id, id))
            .limit(1);

          const newVatRate = fields.vatRate ?? Number(current?.vatRate ?? 19);
          const newNetValue = fields.totalFeeNet ?? Number(current?.totalFeeNet ?? 0);
          const newGrossValue =
            Math.round(newNetValue * (1 + newVatRate / 100) * 100) / 100;

          updateData.vatRate = String(newVatRate);
          updateData.totalFeeNet = String(newNetValue);
          updateData.totalFeeGross = String(newGrossValue);
        }

        const [updated] = await ctx.db
          .update(contracts)
          .set(updateData)
          .where(eq(contracts.id, id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vertrag nicht gefunden',
          });
        }

        return updated;
      }),

    /**
     * Soft-delete a contract.
     */
    delete: companyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        await verifyContractCompany(ctx.db, input.id, ctx.companyId);

        await ctx.db
          .update(contracts)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(contracts.id, input.id));

        return { success: true };
      }),
  }),

  invoices: createTRPCRouter({
    /**
     * List invoices with filtering.
     */
    list: companyProcedure
      .input(invoicesListSchema)
      .query(async ({ ctx, input }) => {
        const conditions: any[] = [
          eq(invoices.companyId, ctx.companyId),
          isNull(invoices.deletedAt),
        ];

        if (input.contractId) {
          conditions.push(eq(invoices.contractId, input.contractId));
        }
        if (input.projectId) {
          conditions.push(eq(invoices.projectId, input.projectId));
        }
        if (input.status) {
          conditions.push(eq(invoices.status, input.status));
        }
        if (input.direction) {
          conditions.push(eq(invoices.direction, input.direction));
        }
        if (input.dateRange?.from) {
          conditions.push(
            sql`${invoices.invoiceDate} >= ${input.dateRange.from.toISOString().split('T')[0]}`,
          );
        }
        if (input.dateRange?.to) {
          conditions.push(
            sql`${invoices.invoiceDate} <= ${input.dateRange.to.toISOString().split('T')[0]}`,
          );
        }

        const whereClause = and(...conditions);

        // Get total count
        const totalResult = await ctx.db
          .select({ total: count() })
          .from(invoices)
          .where(whereClause);
        const total = totalResult[0]?.total ?? 0;

        // Get items
        const orderDir = input.sortOrder === 'desc' ? desc : asc;
        const orderField =
          input.sortBy === 'invoiceNumber' ? invoices.invoiceNumber :
          input.sortBy === 'status' ? invoices.status :
          input.sortBy === 'invoiceDate' ? invoices.invoiceDate :
          input.sortBy === 'amountNet' ? invoices.amountNet :
          input.sortBy === 'dueDate' ? invoices.dueDate :
          invoices.createdAt;

        const offset = (input.page - 1) * input.pageSize;

        const items = await ctx.db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            type: invoices.type,
            direction: invoices.direction,
            status: invoices.status,
            organizationName: organizations.name,
            projectName: projects.name,
            invoiceDate: invoices.invoiceDate,
            dueDate: invoices.dueDate,
            amountNet: invoices.amountNet,
            amountGross: invoices.amountGross,
            paidAmount: invoices.paidAmount,
            createdAt: invoices.createdAt,
          })
          .from(invoices)
          .leftJoin(organizations, eq(invoices.organizationId, organizations.id))
          .leftJoin(projects, eq(invoices.projectId, projects.id))
          .where(whereClause)
          .orderBy(orderDir(orderField))
          .limit(input.pageSize)
          .offset(offset);

        return {
          items: items.map((item) => ({
            id: item.id,
            invoiceNumber: item.invoiceNumber,
            type: item.type,
            direction: item.direction,
            status: item.status,
            organizationName: item.organizationName,
            projectName: item.projectName,
            invoiceDate: item.invoiceDate,
            dueDate: item.dueDate,
            amountNet: item.amountNet,
            amountGross: item.amountGross,
            paidAmount: item.paidAmount ?? '0',
            createdAt: item.createdAt,
          })),
          total,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(total / input.pageSize),
        };
      }),

    /**
     * Get an invoice by ID.
     */
    getById: companyProcedure
      .input(idSchema)
      .query(async ({ ctx, input }) => {
        const [invoice] = await ctx.db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            type: invoices.type,
            direction: invoices.direction,
            status: invoices.status,
            version: invoices.version,
            projectId: invoices.projectId,
            projectName: projects.name,
            contractId: invoices.contractId,
            organizationId: invoices.organizationId,
            organizationName: organizations.name,
            invoiceDate: invoices.invoiceDate,
            dueDate: invoices.dueDate,
            paidAt: invoices.paidAt,
            currency: invoices.currency,
            amountNet: invoices.amountNet,
            amountVat: invoices.amountVat,
            amountGross: invoices.amountGross,
            paidAmount: invoices.paidAmount,
            modules: invoices.modules,
            lineItems: invoices.lineItems,
            paymentInfo: invoices.paymentInfo,
            paymentTerms: invoices.paymentTerms,
            notes: invoices.notes,
            createdAt: invoices.createdAt,
            updatedAt: invoices.updatedAt,
          })
          .from(invoices)
          .leftJoin(projects, eq(invoices.projectId, projects.id))
          .leftJoin(organizations, eq(invoices.organizationId, organizations.id))
          .where(
            and(
              eq(invoices.id, input.id),
              eq(invoices.companyId, ctx.companyId),
              isNull(invoices.deletedAt),
            ),
          )
          .limit(1);

        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Rechnung nicht gefunden',
          });
        }

        // Get contract number if linked
        let contractNumber: string | null = null;
        if (invoice.contractId) {
          const [contract] = await ctx.db
            .select({ number: contracts.number, title: contracts.title })
            .from(contracts)
            .where(eq(contracts.id, invoice.contractId))
            .limit(1);
          contractNumber = contract?.number ?? contract?.title ?? null;
        }

        return {
          ...invoice,
          contractNumber,
        };
      }),

    /**
     * Create a new invoice.
     */
    create: companyProcedure
      .input(createInvoiceSchema)
      .mutation(async ({ ctx, input }) => {
        // If contractId, verify contract's project belongs to company
        if (input.contractId) {
          await verifyContractCompany(ctx.db, input.contractId, ctx.companyId);
        }

        // If projectId specified directly, verify project
        if (input.projectId && !input.contractId) {
          await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);
        }

        // Calculate gross amounts if not provided
        const amountNet = input.amountNet ?? 0;
        const amountVat = input.amountVat ?? Math.round(amountNet * 0.19 * 100) / 100;
        const amountGross = input.amountGross ?? Math.round((amountNet + amountVat) * 100) / 100;

        const insertData: Record<string, unknown> = {
          companyId: ctx.companyId,
          direction: input.direction,
          invoiceNumber: input.invoiceNumber,
          type: input.type ?? 'standard',
          status: input.status ?? 'draft',
          invoiceDate: input.invoiceDate.toISOString().split('T')[0],
          currency: input.currency,
          amountNet: amountNet > 0 ? String(amountNet) : null,
          amountVat: amountVat > 0 ? String(amountVat) : null,
          amountGross: amountGross > 0 ? String(amountGross) : null,
          modules: input.modules ?? [],
          lineItems: input.lineItems ?? [],
        };

        if (input.projectId != null) insertData.projectId = input.projectId;
        if (input.contractId != null) insertData.contractId = input.contractId;
        if (input.organizationId != null) insertData.organizationId = input.organizationId;
        if (input.dueDate != null) insertData.dueDate = input.dueDate.toISOString().split('T')[0];
        if (input.paymentTerms != null) insertData.paymentTerms = input.paymentTerms;
        if (input.notes != null) insertData.notes = input.notes;

        const [created] = await ctx.db
          .insert(invoices)
          .values(insertData as any)
          .returning();

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Rechnung konnte nicht erstellt werden',
          });
        }

        // Update contract's invoicedNet if linked
        if (input.contractId && amountNet > 0) {
          await ctx.db
            .update(contracts)
            .set({
              invoicedNet: sql`COALESCE(${contracts.invoicedNet}, '0')::numeric + ${String(amountNet)}::numeric`,
              updatedAt: new Date(),
            })
            .where(eq(contracts.id, input.contractId));
        }

        return created;
      }),

    /**
     * Update an invoice.
     */
    update: companyProcedure
      .input(updateInvoiceSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...fields } = input;

        // Verify invoice belongs to company
        const existing = await verifyInvoiceCompany(ctx.db, id, ctx.companyId);

        // Verify status allows editing
        const editableStatuses = ['draft', 'cancelled'];
        if (!editableStatuses.includes(existing.status ?? 'draft')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Rechnung kann in diesem Status nicht bearbeitet werden',
          });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (fields.invoiceNumber !== undefined) updateData.invoiceNumber = fields.invoiceNumber;
        if (fields.type !== undefined) updateData.type = fields.type;
        if (fields.status !== undefined) updateData.status = fields.status;
        if (fields.direction !== undefined) updateData.direction = fields.direction;
        if (fields.currency !== undefined) updateData.currency = fields.currency;
        if (fields.organizationId !== undefined) updateData.organizationId = fields.organizationId;
        if (fields.projectId !== undefined) updateData.projectId = fields.projectId;
        if (fields.contractId !== undefined) updateData.contractId = fields.contractId;
        if (fields.modules !== undefined) updateData.modules = fields.modules;
        if (fields.lineItems !== undefined) updateData.lineItems = fields.lineItems;
        if (fields.paymentTerms !== undefined) updateData.paymentTerms = fields.paymentTerms;
        if (fields.notes !== undefined) updateData.notes = fields.notes;

        if (fields.invoiceDate !== undefined) {
          updateData.invoiceDate = fields.invoiceDate.toISOString().split('T')[0];
        }
        if (fields.dueDate !== undefined) {
          updateData.dueDate = fields.dueDate
            ? fields.dueDate.toISOString().split('T')[0]
            : null;
        }

        if (fields.amountNet !== undefined) {
          updateData.amountNet = fields.amountNet != null ? String(fields.amountNet) : null;
        }
        if (fields.amountVat !== undefined) {
          updateData.amountVat = fields.amountVat != null ? String(fields.amountVat) : null;
        }
        if (fields.amountGross !== undefined) {
          updateData.amountGross = fields.amountGross != null ? String(fields.amountGross) : null;
        }

        const [updated] = await ctx.db
          .update(invoices)
          .set(updateData)
          .where(eq(invoices.id, id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Rechnung nicht gefunden',
          });
        }

        return updated;
      }),

    /**
     * Mark an invoice as sent.
     */
    send: companyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        const existing = await verifyInvoiceCompany(ctx.db, input.id, ctx.companyId);

        if (existing.status !== 'draft') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nur Entwuerfe koennen versendet werden',
          });
        }

        await ctx.db
          .update(invoices)
          .set({
            status: 'sent',
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, input.id));

        return { success: true };
      }),

    /**
     * Record a payment for an invoice.
     */
    markPaid: companyProcedure
      .input(markPaidSchema)
      .mutation(async ({ ctx, input }) => {
        const existing = await verifyInvoiceCompany(ctx.db, input.id, ctx.companyId);

        const grossAmount = Number(existing.amountGross ?? 0);
        const newStatus =
          input.paidAmount >= grossAmount ? 'paid' : 'partially_paid';

        await ctx.db
          .update(invoices)
          .set({
            paidAmount: String(input.paidAmount),
            paidAt: input.paidAt.toISOString().split('T')[0],
            paymentInfo: input.paymentInfo ?? {},
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, input.id));

        // Update contract's paidNet if linked
        if (existing.contractId) {
          // Recalculate total paid from all invoices for this contract
          const [paidSums] = await ctx.db
            .select({
              totalPaid: sql<string>`COALESCE(SUM(${invoices.paidAmount}), 0)`,
            })
            .from(invoices)
            .where(
              and(
                eq(invoices.contractId, existing.contractId),
                isNull(invoices.deletedAt),
              ),
            );

          await ctx.db
            .update(contracts)
            .set({
              paidNet: paidSums?.totalPaid ?? '0',
              updatedAt: new Date(),
            })
            .where(eq(contracts.id, existing.contractId));
        }

        return { success: true };
      }),

    /**
     * Soft-delete an invoice.
     */
    delete: companyProcedure
      .input(idSchema)
      .mutation(async ({ ctx, input }) => {
        const existing = await verifyInvoiceCompany(ctx.db, input.id, ctx.companyId);

        await ctx.db
          .update(invoices)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(invoices.id, input.id));

        // Recalculate contract invoicedNet if linked
        if (existing.contractId) {
          const [sums] = await ctx.db
            .select({
              totalNet: sql<string>`COALESCE(SUM(${invoices.amountNet}), 0)`,
            })
            .from(invoices)
            .where(
              and(
                eq(invoices.contractId, existing.contractId),
                isNull(invoices.deletedAt),
              ),
            );

          await ctx.db
            .update(contracts)
            .set({
              invoicedNet: sums?.totalNet ?? '0',
              updatedAt: new Date(),
            })
            .where(eq(contracts.id, existing.contractId));
        }

        return { success: true };
      }),
  }),

  costEstimations: createTRPCRouter({
    /**
     * List cost estimations for a project.
     */
    list: companyProcedure
      .input(costEstimationsListSchema)
      .query(async ({ ctx, input }) => {
        // Verify project belongs to company
        await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

        // Fetch cost estimations
        const estimations = await ctx.db
          .select({
            id: costEstimations.id,
            name: costEstimations.name,
            estimationType: costEstimations.estimationType,
            din276Level: costEstimations.din276Level,
            status: costEstimations.status,
            baseDate: costEstimations.baseDate,
            totalNet: costEstimations.totalNet,
            totalGross: costEstimations.totalGross,
            createdAt: costEstimations.createdAt,
          })
          .from(costEstimations)
          .where(eq(costEstimations.projectId, input.projectId))
          .orderBy(desc(costEstimations.createdAt));

        // Get position counts
        const estIds = estimations.map((e) => e.id);
        let positionCounts: Record<number, number> = {};

        if (estIds.length > 0) {
          const posCounts = await ctx.db
            .select({
              estimationId: costPositions.estimationId,
              cnt: count(),
            })
            .from(costPositions)
            .where(
              sql`${costPositions.estimationId} IN (${sql.join(estIds.map(id => sql`${id}`), sql`, `)})`,
            )
            .groupBy(costPositions.estimationId);

          for (const row of posCounts) {
            positionCounts[row.estimationId] = row.cnt;
          }
        }

        return estimations.map((est) => ({
          id: est.id,
          name: est.name,
          estimationType: est.estimationType,
          din276Level: est.din276Level ?? 2,
          status: est.status ?? 'draft',
          baseDate: est.baseDate,
          totalNet: est.totalNet,
          totalGross: est.totalGross,
          positionCount: positionCounts[est.id] ?? 0,
          createdAt: est.createdAt,
        }));
      }),

    /**
     * Create a new cost estimation.
     */
    create: companyProcedure
      .input(createCostEstimationSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify project belongs to company
        await verifyProjectCompany(ctx.db, input.projectId, ctx.companyId);

        const [created] = await ctx.db
          .insert(costEstimations)
          .values({
            projectId: input.projectId,
            name: input.name,
            estimationType: input.estimationType,
            din276Level: input.din276Level ?? 2,
            status: input.status ?? 'draft',
            baseDate: input.baseDate
              ? input.baseDate.toISOString().split('T')[0]
              : null,
            vatRate: String(input.vatRate ?? 19),
            notes: input.notes,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Kostenschaetzung konnte nicht erstellt werden',
          });
        }

        return created;
      }),

    /**
     * Get a cost estimation with its hierarchical positions.
     */
    getById: companyProcedure
      .input(idSchema)
      .query(async ({ ctx, input }) => {
        // Fetch estimation with project verification
        const [estimation] = await ctx.db
          .select({
            id: costEstimations.id,
            projectId: costEstimations.projectId,
            projectName: projects.name,
            name: costEstimations.name,
            estimationType: costEstimations.estimationType,
            din276Level: costEstimations.din276Level,
            status: costEstimations.status,
            baseDate: costEstimations.baseDate,
            totalNet: costEstimations.totalNet,
            totalGross: costEstimations.totalGross,
            vatRate: costEstimations.vatRate,
            notes: costEstimations.notes,
            createdAt: costEstimations.createdAt,
            updatedAt: costEstimations.updatedAt,
          })
          .from(costEstimations)
          .innerJoin(projects, eq(costEstimations.projectId, projects.id))
          .where(
            and(
              eq(costEstimations.id, input.id),
              eq(projects.companyId, ctx.companyId),
              isNull(projects.deletedAt),
            ),
          )
          .limit(1);

        if (!estimation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Kostenschaetzung nicht gefunden',
          });
        }

        // Fetch hierarchical cost positions
        const positions = await ctx.db
          .select()
          .from(costPositions)
          .where(eq(costPositions.estimationId, input.id))
          .orderBy(asc(costPositions.sortOrder), asc(costPositions.costGroupCode));

        // Calculate subtotals per top-level cost group
        const costGroupTotals: Record<string, { net: number; gross: number }> = {};
        for (const pos of positions) {
          if (pos.isGroup) continue;
          // Use first digit(s) as the top-level group
          const topGroup = pos.costGroupCode.substring(0, 1);
          if (!costGroupTotals[topGroup]) {
            costGroupTotals[topGroup] = { net: 0, gross: 0 };
          }
          costGroupTotals[topGroup].net += Number(pos.totalNet ?? 0);
          costGroupTotals[topGroup].gross += Number(pos.totalGross ?? 0);
        }

        return {
          ...estimation,
          positions,
          costGroupTotals,
        };
      }),
  }),

  costPositions: createTRPCRouter({
    /**
     * Add a cost position to an estimation.
     */
    create: companyProcedure
      .input(createCostPositionSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify estimation's project belongs to company
        const estimation = await verifyEstimationCompany(
          ctx.db,
          input.estimationId,
          ctx.companyId,
        );

        // Calculate totals
        const quantity = input.quantity ?? 0;
        const unitPrice = input.unitPrice ?? 0;
        const totalNet = Math.round(quantity * unitPrice * 100) / 100;
        const posVatRate = input.vatRate ?? Number(estimation.vatRate ?? 19);
        const totalGross =
          Math.round(totalNet * (1 + posVatRate / 100) * 100) / 100;

        const [created] = await ctx.db
          .insert(costPositions)
          .values({
            estimationId: input.estimationId,
            parentId: input.parentId,
            costGroupCode: input.costGroupCode,
            level: input.level,
            shortText: input.shortText,
            longText: input.longText,
            workPackageCode: input.workPackageCode,
            workPackageName: input.workPackageName,
            quantity: quantity > 0 ? String(quantity) : null,
            unit: input.unit,
            unitPrice: unitPrice > 0 ? String(unitPrice) : null,
            totalNet: String(totalNet),
            vatRate: String(posVatRate),
            totalGross: String(totalGross),
            sortOrder: input.sortOrder ?? 0,
            isCustom: input.isCustom ?? false,
            isOptional: input.isOptional ?? false,
            isGroup: input.isGroup ?? false,
            color: input.color,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Kostenposition konnte nicht erstellt werden',
          });
        }

        // Recalculate estimation totals
        await recalcEstimationTotals(ctx.db, input.estimationId);

        return created;
      }),

    /**
     * Update a cost position.
     */
    update: companyProcedure
      .input(updateCostPositionSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...fields } = input;

        // Fetch position to get estimationId
        const [position] = await ctx.db
          .select({
            id: costPositions.id,
            estimationId: costPositions.estimationId,
          })
          .from(costPositions)
          .where(eq(costPositions.id, id))
          .limit(1);

        if (!position) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Kostenposition nicht gefunden',
          });
        }

        // Verify estimation's project belongs to company
        await verifyEstimationCompany(ctx.db, position.estimationId, ctx.companyId);

        // Build update data
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (fields.parentId !== undefined) updateData.parentId = fields.parentId;
        if (fields.costGroupCode !== undefined) updateData.costGroupCode = fields.costGroupCode;
        if (fields.level !== undefined) updateData.level = fields.level;
        if (fields.shortText !== undefined) updateData.shortText = fields.shortText;
        if (fields.longText !== undefined) updateData.longText = fields.longText;
        if (fields.workPackageCode !== undefined) updateData.workPackageCode = fields.workPackageCode;
        if (fields.workPackageName !== undefined) updateData.workPackageName = fields.workPackageName;
        if (fields.unit !== undefined) updateData.unit = fields.unit;
        if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;
        if (fields.isCustom !== undefined) updateData.isCustom = fields.isCustom;
        if (fields.isOptional !== undefined) updateData.isOptional = fields.isOptional;
        if (fields.isGroup !== undefined) updateData.isGroup = fields.isGroup;
        if (fields.color !== undefined) updateData.color = fields.color;

        // Recalculate line totals if quantity/unitPrice/vatRate changed
        if (
          fields.quantity !== undefined ||
          fields.unitPrice !== undefined ||
          fields.vatRate !== undefined
        ) {
          const [current] = await ctx.db
            .select({
              quantity: costPositions.quantity,
              unitPrice: costPositions.unitPrice,
              vatRate: costPositions.vatRate,
            })
            .from(costPositions)
            .where(eq(costPositions.id, id))
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
          .update(costPositions)
          .set(updateData)
          .where(eq(costPositions.id, id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Kostenposition nicht gefunden',
          });
        }

        // Recalculate estimation totals
        await recalcEstimationTotals(ctx.db, position.estimationId);

        return updated;
      }),
  }),
});
