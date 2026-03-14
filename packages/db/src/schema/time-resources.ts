import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  smallint,
  timestamp,
  jsonb,
  numeric,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, companies } from './auth';
import { projects } from './projects';
import { modules, tasks } from './project-structure';

// ---------------------------------------------------------------------------
// timeEntries
// ---------------------------------------------------------------------------
export const timeEntries = pgTable(
  'time_entries',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    projectId: integer('project_id').references(() => projects.id),
    moduleId: integer('module_id').references(() => modules.id),
    taskId: integer('task_id').references(() => tasks.id),
    date: date('date').notNull(),
    hours: numeric('hours', { precision: 5, scale: 2 }).notNull(),
    description: text('description'),
    billable: boolean('billable').default(true),
    billingStatus: varchar('billing_status', { length: 20 }).default('pending'), // pending | approved | invoiced
    workType: varchar('work_type', { length: 50 }),
    color: varchar('color', { length: 20 }),
    status: varchar('status', { length: 20 }).default('draft'), // draft | submitted | approved | rejected
    approvedBy: integer('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('time_entries_user_date_idx').on(table.userId, table.date),
    index('time_entries_project_date_idx').on(table.projectId, table.date),
    index('time_entries_company_user_date_idx').on(
      table.companyId,
      table.userId,
      table.date,
    ),
  ],
);

// ---------------------------------------------------------------------------
// workSchedules
// ---------------------------------------------------------------------------
export const workSchedules = pgTable('work_schedules', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  userId: integer('user_id').references(() => users.id), // null = company default
  name: varchar('name', { length: 255 }),
  weeklyHours: numeric('weekly_hours', { precision: 5, scale: 2 }),
  schedule: jsonb('schedule').notNull(), // {mon: 8, tue: 8, ...}
  validFrom: date('valid_from').notNull(),
  validUntil: date('valid_until'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// timeEntryTemplates
// ---------------------------------------------------------------------------
export const timeEntryTemplates = pgTable('time_entry_templates', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  userId: integer('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  templateType: varchar('template_type', { length: 20 }).notNull(), // favorite | recurring
  projectId: integer('project_id').references(() => projects.id),
  moduleId: integer('module_id').references(() => modules.id),
  taskId: integer('task_id').references(() => tasks.id),
  hours: numeric('hours', { precision: 5, scale: 2 }),
  description: text('description'),
  recurrence: jsonb('recurrence'), // {frequency, days, startDate, endDate}
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// resourceScenarios
// ---------------------------------------------------------------------------
export const resourceScenarios = pgTable('resource_scenarios', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: integer('created_by').references(() => users.id),
  isActive: boolean('is_active').default(true),
  isBaseline: boolean('is_baseline').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// resourceAllocations
// ---------------------------------------------------------------------------
export const resourceAllocations = pgTable(
  'resource_allocations',
  {
    id: serial('id').primaryKey(),
    scenarioId: integer('scenario_id')
      .notNull()
      .references(() => resourceScenarios.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    moduleId: integer('module_id').references(() => modules.id),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    hoursPerWeek: numeric('hours_per_week', { precision: 5, scale: 2 }).notNull(),
    weeklyOverrides: jsonb('weekly_overrides').default({}), // {"2026-W11": 20}
    status: varchar('status', { length: 30 }).default('planned'),
    notes: text('notes'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('resource_allocations_scenario_user_idx').on(
      table.scenarioId,
      table.userId,
    ),
    index('resource_allocations_scenario_project_idx').on(
      table.scenarioId,
      table.projectId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// resourceAlerts
// ---------------------------------------------------------------------------
export const resourceAlerts = pgTable(
  'resource_alerts',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    userId: integer('user_id').references(() => users.id),
    projectId: integer('project_id').references(() => projects.id),
    moduleId: integer('module_id').references(() => modules.id),
    alertType: varchar('alert_type', { length: 30 }).notNull(), // overallocation | underallocation | skill_gap | expiring_cert
    severity: varchar('severity', { length: 20 }).default('warning'),
    title: varchar('title', { length: 500 }),
    message: text('message').notNull(),
    context: jsonb('context').default({}),
    isResolved: boolean('is_resolved').default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    alertHash: varchar('alert_hash', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('resource_alerts_company_hash_idx').on(
      table.companyId,
      table.alertHash,
    ),
  ],
);

// ===========================================================================
// Relations
// ===========================================================================

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [timeEntries.companyId],
    references: [companies.id],
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  module: one(modules, {
    fields: [timeEntries.moduleId],
    references: [modules.id],
  }),
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
  approver: one(users, {
    fields: [timeEntries.approvedBy],
    references: [users.id],
    relationName: 'timeEntryApprover',
  }),
}));

export const workSchedulesRelations = relations(workSchedules, ({ one }) => ({
  company: one(companies, {
    fields: [workSchedules.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [workSchedules.userId],
    references: [users.id],
  }),
}));

export const timeEntryTemplatesRelations = relations(
  timeEntryTemplates,
  ({ one }) => ({
    company: one(companies, {
      fields: [timeEntryTemplates.companyId],
      references: [companies.id],
    }),
    user: one(users, {
      fields: [timeEntryTemplates.userId],
      references: [users.id],
    }),
    project: one(projects, {
      fields: [timeEntryTemplates.projectId],
      references: [projects.id],
    }),
    module: one(modules, {
      fields: [timeEntryTemplates.moduleId],
      references: [modules.id],
    }),
    task: one(tasks, {
      fields: [timeEntryTemplates.taskId],
      references: [tasks.id],
    }),
  }),
);

export const resourceScenariosRelations = relations(
  resourceScenarios,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [resourceScenarios.companyId],
      references: [companies.id],
    }),
    creator: one(users, {
      fields: [resourceScenarios.createdBy],
      references: [users.id],
    }),
    allocations: many(resourceAllocations),
  }),
);

export const resourceAllocationsRelations = relations(
  resourceAllocations,
  ({ one }) => ({
    scenario: one(resourceScenarios, {
      fields: [resourceAllocations.scenarioId],
      references: [resourceScenarios.id],
    }),
    user: one(users, {
      fields: [resourceAllocations.userId],
      references: [users.id],
    }),
    project: one(projects, {
      fields: [resourceAllocations.projectId],
      references: [projects.id],
    }),
    module: one(modules, {
      fields: [resourceAllocations.moduleId],
      references: [modules.id],
    }),
  }),
);

export const resourceAlertsRelations = relations(
  resourceAlerts,
  ({ one }) => ({
    company: one(companies, {
      fields: [resourceAlerts.companyId],
      references: [companies.id],
    }),
    user: one(users, {
      fields: [resourceAlerts.userId],
      references: [users.id],
    }),
    project: one(projects, {
      fields: [resourceAlerts.projectId],
      references: [projects.id],
    }),
    module: one(modules, {
      fields: [resourceAlerts.moduleId],
      references: [modules.id],
    }),
  }),
);
