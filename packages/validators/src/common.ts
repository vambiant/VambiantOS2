import { z } from 'zod';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Seite muss mindestens 1 sein').default(1),
  pageSize: z
    .number()
    .int()
    .min(1, 'Seitengröße muss mindestens 1 sein')
    .max(100, 'Seitengröße darf maximal 100 sein')
    .default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// ---------------------------------------------------------------------------
// Date range
// ---------------------------------------------------------------------------
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.from && data.to) return data.from <= data.to;
    return true;
  },
  { message: 'Startdatum muss vor dem Enddatum liegen', path: ['from'] },
);

// ---------------------------------------------------------------------------
// ID
// ---------------------------------------------------------------------------
export const idSchema = z.object({
  id: z.number().int().positive('ID muss eine positive Zahl sein'),
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Suchbegriff ist erforderlich')
    .max(200, 'Suchbegriff darf maximal 200 Zeichen lang sein'),
});

// ---------------------------------------------------------------------------
// Reusable sub-schemas
// ---------------------------------------------------------------------------
export const addressSchema = z.object({
  street: z.string().max(255).optional(),
  streetNumber: z.string().max(20).optional(),
  zip: z.string().max(20).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  bundesland: z.string().max(100).optional(),
});

export const contactInfoSchema = z.object({
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  website: z.string().url('Ungültige URL').optional().or(z.literal('')),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type IdInput = z.infer<typeof idSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ContactInfoInput = z.infer<typeof contactInfoSchema>;
