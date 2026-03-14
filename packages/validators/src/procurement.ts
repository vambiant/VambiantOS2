import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const procurementTypeEnum = z.enum([
  'hoai_offer',
  'ava_tender',
  'direct_award',
]);

export const procurementStatusEnum = z.enum([
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

export const vergabeartEnum = z.enum([
  'beschraenkt',
  'oeffentlich',
  'freihaendig',
]);

export const avaContractTypeEnum = z.enum(['vob_b', 'vob_a']);

// ---------------------------------------------------------------------------
// HOAI params
// ---------------------------------------------------------------------------
export const hoaiParamsSchema = z.object({
  zone: z
    .number()
    .int()
    .min(1, 'HOAI-Zone muss zwischen 1 und 5 liegen')
    .max(5, 'HOAI-Zone muss zwischen 1 und 5 liegen'),
  eligibleCosts: z.number().min(0, 'Anrechenbare Kosten dürfen nicht negativ sein'),
  serviceType: z.string().max(100).optional(),
  objectType: z.string().max(100).optional(),
  difficultyLevel: z.string().max(50).optional(),
  phases: z
    .array(
      z.object({
        phase: z.number().int().min(1).max(9),
        percentageBasic: z.number().min(0).max(100).optional(),
        percentageSpecial: z.number().min(0).max(100).optional(),
        included: z.boolean().default(true),
      }),
    )
    .min(1, 'Mindestens eine Leistungsphase erforderlich'),
  conversionFactor: z.number().min(0).optional(),
  modernizationFactor: z.number().min(0).optional(),
  coordinationFactor: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------
// AVA params
// ---------------------------------------------------------------------------
export const avaParamsSchema = z.object({
  vergabeart: vergabeartEnum,
  contractType: avaContractTypeEnum.optional(),
  submissionDeadline: z.coerce.date().optional(),
  bindingPeriodEnd: z.coerce.date().optional(),
  executionStart: z.coerce.date().optional(),
  executionEnd: z.coerce.date().optional(),
});

// ---------------------------------------------------------------------------
// Create / Update Procurement
// ---------------------------------------------------------------------------
export const createProcurementSchema = z.object({
  type: procurementTypeEnum,
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  projectId: z.number().int().positive(),
  description: z.string().optional(),
  clientId: z.number().int().positive().optional(),
  clientContactId: z.number().int().positive().optional(),
  costEstimationId: z.number().int().positive().optional(),
  status: procurementStatusEnum.default('draft'),
  vatRate: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).default('EUR'),
  nebenkostenPercent: z.number().min(0).max(100).optional(),
  hoaiParams: hoaiParamsSchema.optional(),
  avaParams: avaParamsSchema.optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  termsConditions: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export const updateProcurementSchema = createProcurementSchema.partial().omit({
  type: true,
  projectId: true,
});

// ---------------------------------------------------------------------------
// Procurement positions
// ---------------------------------------------------------------------------
export const createProcurementPositionSchema = z.object({
  procurementId: z.number().int().positive(),
  groupId: z.number().int().positive().optional(),
  shortText: z.string().min(1, 'Kurztext ist erforderlich').max(500),
  longText: z.string().optional(),
  positionNumber: z.string().max(50).optional(),
  workPackageCode: z.string().max(20).optional(),
  workPackageName: z.string().max(255).optional(),
  costGroup: z.string().max(10).optional(),
  unit: z.string().max(30).optional(),
  quantity: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  isOptional: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});

export const updateProcurementPositionSchema =
  createProcurementPositionSchema.partial().omit({ procurementId: true });

// ---------------------------------------------------------------------------
// Procurement groups
// ---------------------------------------------------------------------------
export const createProcurementGroupSchema = z.object({
  procurementId: z.number().int().positive(),
  parentGroupId: z.number().int().positive().optional(),
  name: z.string().min(1, 'Gruppenname ist erforderlich').max(255),
  code: z.string().max(50).optional(),
  groupType: z.enum(['hoai_phase', 'hoai_service_group', 'ava_lot', 'general']).optional(),
  sortOrder: z.number().int().min(0).optional(),
  description: z.string().optional(),
  phaseNumber: z.number().int().min(1).max(9).optional(),
  isIncluded: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  estimatedDurationWeeks: z.number().int().min(0).optional(),
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type CreateProcurementInput = z.infer<typeof createProcurementSchema>;
export type UpdateProcurementInput = z.infer<typeof updateProcurementSchema>;
export type CreateProcurementPositionInput = z.infer<typeof createProcurementPositionSchema>;
export type UpdateProcurementPositionInput = z.infer<typeof updateProcurementPositionSchema>;
export type CreateProcurementGroupInput = z.infer<typeof createProcurementGroupSchema>;
export type HoaiParamsInput = z.infer<typeof hoaiParamsSchema>;
export type AvaParamsInput = z.infer<typeof avaParamsSchema>;
