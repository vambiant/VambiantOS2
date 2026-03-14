import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const contractTypeEnum = z.enum([
  'service',
  'construction',
  'consulting',
]);

export const contractStatusEnum = z.enum([
  'draft',
  'active',
  'completed',
  'terminated',
  'suspended',
]);

export const invoiceDirectionEnum = z.enum(['outbound', 'inbound']);

export const invoiceTypeEnum = z.enum([
  'standard',
  'partial',
  'final',
  'credit_note',
  'advance',
]);

export const invoiceStatusEnum = z.enum([
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
  'partially_paid',
]);

export const estimationTypeEnum = z.enum([
  'kostenschaetzung',
  'kostenberechnung',
  'kostenanschlag',
  'kostenfeststellung',
]);

// ---------------------------------------------------------------------------
// Line item sub-schema
// ---------------------------------------------------------------------------
export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Beschreibung ist erforderlich').max(500),
  quantity: z.number().min(0, 'Menge darf nicht negativ sein').default(1),
  unit: z.string().max(30).optional(),
  unitPrice: z.number().min(0, 'Einzelpreis darf nicht negativ sein'),
  taxRate: z.number().min(0).max(100).optional(),
  total: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Create / Update Contract
// ---------------------------------------------------------------------------
export const createContractSchema = z.object({
  projectId: z.number().int().positive('Projekt ist erforderlich'),
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
  totalFeeNet: z.number().min(0, 'Honorar darf nicht negativ sein').optional(),
  vatRate: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).default('EUR'),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  paymentTerms: z.string().optional(),
  performanceBondRequired: z.boolean().optional(),
  performanceBondAmount: z.number().min(0).optional(),
  terms: z
    .object({
      paymentTerms: z.string().optional(),
      retentionPercentage: z.number().min(0).max(100).optional(),
      penalties: z.string().optional(),
      warranties: z.string().optional(),
    })
    .optional(),
});

export const updateContractSchema = createContractSchema.partial().omit({
  projectId: true,
});

// ---------------------------------------------------------------------------
// Create / Update Invoice
// ---------------------------------------------------------------------------
export const createInvoiceSchema = z.object({
  projectId: z.number().int().positive().optional(),
  contractId: z.number().int().positive().optional(),
  organizationId: z.number().int().positive().optional(),
  direction: invoiceDirectionEnum,
  invoiceNumber: z.string().min(1, 'Rechnungsnummer ist erforderlich').max(50),
  type: invoiceTypeEnum.default('standard'),
  invoiceDate: z.coerce.date({ required_error: 'Rechnungsdatum ist erforderlich' }),
  dueDate: z.coerce.date().optional(),
  currency: z.string().length(3).default('EUR'),
  lineItems: z
    .array(invoiceLineItemSchema)
    .min(1, 'Mindestens eine Position erforderlich'),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  direction: invoiceDirectionEnum.optional(),
  invoiceNumber: z.string().min(1).max(50).optional(),
  type: invoiceTypeEnum.optional(),
  status: invoiceStatusEnum.optional(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  paidAt: z.coerce.date().nullable().optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1).optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Cost Estimation
// ---------------------------------------------------------------------------
export const createCostEstimationSchema = z.object({
  projectId: z.number().int().positive('Projekt ist erforderlich'),
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  estimationType: estimationTypeEnum,
  din276Level: z
    .number()
    .int()
    .min(1, 'DIN-276-Ebene muss zwischen 1 und 4 liegen')
    .max(4, 'DIN-276-Ebene muss zwischen 1 und 4 liegen')
    .default(2),
  status: z.string().max(30).default('draft'),
  baseDate: z.coerce.date().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export const updateCostEstimationSchema = createCostEstimationSchema
  .partial()
  .omit({ projectId: true });

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
export type CreateCostEstimationInput = z.infer<typeof createCostEstimationSchema>;
export type UpdateCostEstimationInput = z.infer<typeof updateCostEstimationSchema>;
