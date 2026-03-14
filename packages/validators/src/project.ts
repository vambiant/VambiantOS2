import { z } from 'zod';
import { addressSchema, paginationSchema } from './common';

// ---------------------------------------------------------------------------
// Status & type enums
// ---------------------------------------------------------------------------
export const projectStatusEnum = z.enum([
  'draft',
  'active',
  'on_hold',
  'completed',
  'archived',
  'cancelled',
]);

export const projectTypeEnum = z.enum([
  'residential',
  'commercial',
  'industrial',
  'infrastructure',
  'public',
  'mixed_use',
  'renovation',
  'interior',
  'landscape',
  'urban_planning',
  'other',
]);

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------
export const createProjectSchema = z.object({
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
  hoaiZone: z
    .number()
    .int()
    .min(1, 'HOAI-Zone muss zwischen 1 und 5 liegen')
    .max(5, 'HOAI-Zone muss zwischen 1 und 5 liegen')
    .optional(),
  useBim: z.boolean().optional(),
  bimStandard: z.string().max(50).optional(),
  timeTrackingEnabled: z.boolean().optional(),
  address: addressSchema.optional(),
  buildingType: z.string().max(100).optional(),
  buildingTypeL2: z.string().max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  budgetNet: z
    .number()
    .min(0, 'Budget darf nicht negativ sein')
    .optional(),
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

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Projektname ist erforderlich').max(255).optional(),
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

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
export const projectFilterSchema = z
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

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectFilterInput = z.infer<typeof projectFilterSchema>;
