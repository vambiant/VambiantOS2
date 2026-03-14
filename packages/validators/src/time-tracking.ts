import { z } from 'zod';
import { paginationSchema } from './common';

// ---------------------------------------------------------------------------
// Status enums
// ---------------------------------------------------------------------------
export const timeEntryStatusEnum = z.enum([
  'draft',
  'submitted',
  'approved',
  'rejected',
]);

// ---------------------------------------------------------------------------
// Create / Update Time Entry
// ---------------------------------------------------------------------------
export const createTimeEntrySchema = z.object({
  date: z.coerce.date({ required_error: 'Datum ist erforderlich' }),
  hours: z
    .number()
    .min(0.25, 'Mindestens 0,25 Stunden')
    .max(24, 'Maximal 24 Stunden pro Eintrag'),
  projectId: z.number().int().positive('Projekt ist erforderlich'),
  moduleId: z.number().int().positive().optional(),
  taskId: z.number().int().positive().optional(),
  description: z.string().max(2000).optional(),
  billable: z.boolean().default(true),
  workType: z.string().max(50).optional(),
  status: timeEntryStatusEnum.default('draft'),
});

export const updateTimeEntrySchema = z.object({
  date: z.coerce.date().optional(),
  hours: z.number().min(0.25).max(24).optional(),
  projectId: z.number().int().positive().optional(),
  moduleId: z.number().int().positive().nullable().optional(),
  taskId: z.number().int().positive().nullable().optional(),
  description: z.string().max(2000).optional(),
  billable: z.boolean().optional(),
  workType: z.string().max(50).optional(),
  status: timeEntryStatusEnum.optional(),
});

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------
export const bulkApproveTimeEntriesSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Mindestens ein Eintrag erforderlich'),
});

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
export const timeEntryFilterSchema = z
  .object({
    userId: z.number().int().positive().optional(),
    projectId: z.number().int().positive().optional(),
    moduleId: z.number().int().positive().optional(),
    taskId: z.number().int().positive().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    billable: z.boolean().optional(),
    status: timeEntryStatusEnum.optional(),
  })
  .merge(paginationSchema)
  .refine(
    (data) => {
      if (data.dateFrom && data.dateTo) return data.dateFrom <= data.dateTo;
      return true;
    },
    { message: 'Startdatum muss vor dem Enddatum liegen', path: ['dateFrom'] },
  );

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type BulkApproveTimeEntriesInput = z.infer<typeof bulkApproveTimeEntriesSchema>;
export type TimeEntryFilterInput = z.infer<typeof timeEntryFilterSchema>;
