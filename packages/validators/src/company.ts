import { z } from 'zod';
import { addressSchema, contactInfoSchema } from './common';

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Firmenname ist erforderlich').max(255),
  legalForm: z.string().max(50).optional(),
  domain: z
    .string()
    .max(255)
    .optional()
    .or(z.literal('')),
  taxId: z.string().max(50).optional(),
  vatId: z.string().max(50).optional(),
  address: addressSchema.optional(),
  contact: contactInfoSchema.optional(),
  logoPath: z.string().max(500).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

// ---------------------------------------------------------------------------
// Company Settings
// ---------------------------------------------------------------------------
export const companySettingsSchema = z.object({
  billingConfig: z
    .object({
      defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
      defaultVatRate: z.number().min(0).max(100).optional(),
      currency: z.string().length(3).optional(),
      bankName: z.string().max(255).optional(),
      iban: z.string().max(34).optional(),
      bic: z.string().max(11).optional(),
    })
    .optional(),
  offerNumberPattern: z
    .string()
    .max(100, 'Muster darf maximal 100 Zeichen lang sein')
    .optional(),
  settings: z
    .object({
      locale: z.string().max(10).optional(),
      timezone: z.string().max(50).optional(),
      dateFormat: z.string().max(20).optional(),
      fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
