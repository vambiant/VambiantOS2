import { z } from 'zod';
import { addressSchema, contactInfoSchema, paginationSchema } from './common';

// ---------------------------------------------------------------------------
// Organization type enum
// ---------------------------------------------------------------------------
export const organizationTypeEnum = z.enum(['client', 'contractor', 'partner']);

export const organizationStatusEnum = z.enum([
  'active',
  'inactive',
  'prospect',
  'blocked',
]);

// ---------------------------------------------------------------------------
// Create / Update Organization
// ---------------------------------------------------------------------------
export const createOrganizationSchema = z.object({
  type: organizationTypeEnum,
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  legalForm: z.string().max(50).optional(),
  taxId: z.string().max(50).optional(),
  vatId: z.string().max(50).optional(),
  address: addressSchema.optional(),
  contact: contactInfoSchema.optional(),
  classification: z
    .object({
      industry: z.string().max(100).optional(),
      size: z.string().max(50).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      segment: z.string().max(100).optional(),
      tags: z.array(z.string().max(50)).max(20).optional(),
    })
    .optional(),
  financial: z
    .object({
      creditRating: z.string().max(50).optional(),
      paymentTerms: z.number().int().min(0).max(365).optional(),
      defaultCurrency: z.string().length(3).optional(),
      taxExempt: z.boolean().optional(),
      discountPercentage: z.number().min(0).max(100).optional(),
      iban: z.string().max(34).optional(),
      bic: z.string().max(11).optional(),
      bankName: z.string().max(255).optional(),
    })
    .optional(),
  notes: z.string().optional(),
  status: organizationStatusEnum.default('active'),
  clientNumber: z.string().max(50).optional(),
  creditorNumber: z.string().max(50).optional(),
  debitorId: z.string().max(50).optional(),
  responsibleUserId: z.number().int().positive().optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

// ---------------------------------------------------------------------------
// Create / Update Contact
// ---------------------------------------------------------------------------
export const createContactSchema = z.object({
  organizationId: z.number().int().positive().optional(),
  salutation: z.string().max(20).optional(),
  title: z.string().max(50).optional(),
  firstName: z.string().min(1, 'Vorname ist erforderlich').max(100),
  lastName: z.string().min(1, 'Nachname ist erforderlich').max(100),
  email: z
    .string()
    .email('Ungültige E-Mail-Adresse')
    .max(255)
    .optional()
    .or(z.literal('')),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
  useOrgAddress: z.boolean().optional(),
  address: addressSchema.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updateContactSchema = createContactSchema.partial();

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
export const organizationFilterSchema = z
  .object({
    type: organizationTypeEnum.optional(),
    status: organizationStatusEnum.optional(),
    search: z.string().max(200).optional(),
    industry: z.string().max(100).optional(),
    responsibleUserId: z.number().int().positive().optional(),
  })
  .merge(paginationSchema);

export const contactFilterSchema = z
  .object({
    organizationId: z.number().int().positive().optional(),
    search: z.string().max(200).optional(),
    isActive: z.boolean().optional(),
  })
  .merge(paginationSchema);

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type OrganizationFilterInput = z.infer<typeof organizationFilterSchema>;
export type ContactFilterInput = z.infer<typeof contactFilterSchema>;
