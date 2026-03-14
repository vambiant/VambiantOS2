import { z } from 'zod';
import { paginationSchema } from './common';

// ---------------------------------------------------------------------------
// Status enums
// ---------------------------------------------------------------------------
export const taskStatusEnum = z.enum([
  'open',
  'in_progress',
  'review',
  'blocked',
  'done',
  'cancelled',
]);

export const taskPriorityEnum = z
  .number()
  .int()
  .min(1, 'Priorität muss zwischen 1 und 5 liegen')
  .max(5, 'Priorität muss zwischen 1 und 5 liegen');

export const moduleStatusEnum = z.enum([
  'planned',
  'active',
  'completed',
  'on_hold',
  'cancelled',
]);

export const milestoneStatusEnum = z.enum([
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'cancelled',
]);

// ---------------------------------------------------------------------------
// Create / Update Task
// ---------------------------------------------------------------------------
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(500),
  projectId: z.number().int().positive(),
  moduleId: z.number().int().positive().optional(),
  milestoneId: z.number().int().positive().optional(),
  description: z.string().optional(),
  priority: taskPriorityEnum.default(3),
  estimatedHours: z.number().min(0, 'Geschätzte Stunden dürfen nicht negativ sein').optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  assignedTo: z.number().int().positive().optional(),
  status: taskStatusEnum.default('open'),
  hoaiPhase: z.number().int().min(1).max(9).optional(),
  isHoaiBasic: z.boolean().optional(),
  isHoaiSpecial: z.boolean().optional(),
  complexity: z.string().max(20).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.dueDate) return data.startDate <= data.dueDate;
    return true;
  },
  { message: 'Startdatum muss vor dem Fälligkeitsdatum liegen', path: ['dueDate'] },
);

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  moduleId: z.number().int().positive().nullable().optional(),
  milestoneId: z.number().int().positive().nullable().optional(),
  description: z.string().optional(),
  priority: taskPriorityEnum.optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  status: taskStatusEnum.optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
  hoaiPhase: z.number().int().min(1).max(9).nullable().optional(),
  isHoaiBasic: z.boolean().optional(),
  isHoaiSpecial: z.boolean().optional(),
  complexity: z.string().max(20).optional(),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Create / Update Module
// ---------------------------------------------------------------------------
export const createModuleSchema = z.object({
  projectId: z.number().int().positive(),
  parentModuleId: z.number().int().positive().optional(),
  name: z.string().min(1, 'Modulname ist erforderlich').max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  hoaiPhase: z
    .number()
    .int()
    .min(1, 'HOAI-Phase muss zwischen 1 und 9 liegen')
    .max(9, 'HOAI-Phase muss zwischen 1 und 9 liegen')
    .optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  plannedHours: z.number().min(0).optional(),
  budgetNet: z.number().min(0).optional(),
  status: moduleStatusEnum.default('planned'),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) return data.startDate <= data.endDate;
    return true;
  },
  { message: 'Startdatum muss vor dem Enddatum liegen', path: ['endDate'] },
);

export const updateModuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  hoaiPhase: z.number().int().min(1).max(9).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  plannedHours: z.number().min(0).nullable().optional(),
  budgetNet: z.number().min(0).nullable().optional(),
  status: moduleStatusEnum.optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
});

// ---------------------------------------------------------------------------
// Create / Update Milestone
// ---------------------------------------------------------------------------
export const createMilestoneSchema = z.object({
  projectId: z.number().int().positive(),
  moduleId: z.number().int().positive().optional(),
  name: z.string().min(1, 'Meilensteinname ist erforderlich').max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  targetDate: z.coerce.date().optional(),
  status: milestoneStatusEnum.default('pending'),
});

export const updateMilestoneSchema = z.object({
  moduleId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  completedDate: z.coerce.date().nullable().optional(),
  status: milestoneStatusEnum.optional(),
  approvalNotes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
export const taskFilterSchema = z
  .object({
    status: taskStatusEnum.optional(),
    priority: taskPriorityEnum.optional(),
    assignedTo: z.number().int().positive().optional(),
    moduleId: z.number().int().positive().optional(),
    milestoneId: z.number().int().positive().optional(),
    hoaiPhase: z.number().int().min(1).max(9).optional(),
    search: z.string().max(200).optional(),
  })
  .merge(paginationSchema);

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
