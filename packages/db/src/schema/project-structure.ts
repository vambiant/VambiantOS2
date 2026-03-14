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
import { relations, sql } from 'drizzle-orm';
import { users } from './auth';
import { projects } from './projects';
import { media } from './cross-cutting';

// ---------------------------------------------------------------------------
// modules (unified template + project modules, HOAI phases)
// ---------------------------------------------------------------------------
export const modules = pgTable(
  'modules',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    parentModuleId: integer('parent_module_id'),
    contractId: integer('contract_id'),
    scope: varchar('scope', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: text('description'),
    sortOrder: smallint('sort_order').default(0),
    hoaiPhase: smallint('hoai_phase'),
    phaseType: varchar('phase_type', { length: 50 }),
    percentage: numeric('percentage', { precision: 5, scale: 2 }),
    hoaiFeeAllocated: numeric('hoai_fee_allocated', {
      precision: 15,
      scale: 2,
    }),
    invoicingStatus: varchar('invoicing_status', { length: 30 }).default(
      'pending',
    ),
    goals: jsonb('goals').default([]),
    relatedTrades: jsonb('related_trades').default([]),
    startDate: date('start_date'),
    endDate: date('end_date'),
    actualStartDate: date('actual_start_date'),
    actualEndDate: date('actual_end_date'),
    status: varchar('status', { length: 30 }).default('planned'),
    progressPercentage: numeric('progress_percentage', {
      precision: 5,
      scale: 2,
    }).default('0'),
    plannedHours: numeric('planned_hours', { precision: 10, scale: 2 }),
    budgetNet: numeric('budget_net', { precision: 15, scale: 2 }),
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
    index('modules_project_status_idx').on(table.projectId, table.status),
    index('modules_project_hoai_phase_idx').on(
      table.projectId,
      table.hoaiPhase,
    ),
  ],
);

// ---------------------------------------------------------------------------
// milestones
// ---------------------------------------------------------------------------
export const milestones = pgTable(
  'milestones',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    moduleId: integer('module_id').references(() => modules.id),
    scope: varchar('scope', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: text('description'),
    successCriteria: jsonb('success_criteria').default([]),
    successIndicators: jsonb('success_indicators').default([]),
    status: varchar('status', { length: 30 }).default('pending'),
    targetDate: date('target_date'),
    completedDate: date('completed_date'),
    approvalNotes: text('approval_notes'),
    sortOrder: smallint('sort_order').default(0),
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
    index('milestones_project_status_idx').on(table.projectId, table.status),
  ],
);

// ---------------------------------------------------------------------------
// projectRoles
// ---------------------------------------------------------------------------
export const projectRoles = pgTable(
  'project_roles',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    scope: varchar('scope', { length: 20 }).notNull(),
    code: varchar('code', { length: 50 }),
    title: varchar('title', { length: 100 }).notNull(),
    description: text('description'),
    responsibilities: jsonb('responsibilities').default([]),
    requiredQualifications: jsonb('required_qualifications').default([]),
    decisionAuthority: jsonb('decision_authority').default([]),
    sortOrder: smallint('sort_order').default(0),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_roles_project_code_idx').on(table.projectId, table.code),
  ],
);

// ---------------------------------------------------------------------------
// projectTrades
// ---------------------------------------------------------------------------
export const projectTrades = pgTable(
  'project_trades',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    scope: varchar('scope', { length: 20 }).notNull(),
    tradeCode: varchar('trade_code', { length: 20 }).notNull(),
    tradeName: varchar('trade_name', { length: 255 }).notNull(),
    description: text('description'),
    leadRoleId: integer('lead_role_id').references(() => projectRoles.id),
    isActive: boolean('is_active').default(true),
    budget: numeric('budget', { precision: 15, scale: 2 }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('project_trades_project_code_idx').on(
      table.projectId,
      table.tradeCode,
    ),
  ],
);

// ---------------------------------------------------------------------------
// tasks
// ---------------------------------------------------------------------------
export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    moduleId: integer('module_id').references(() => modules.id),
    milestoneId: integer('milestone_id').references(() => milestones.id),
    assignedTo: integer('assigned_to').references(() => users.id),
    projectTradeId: integer('project_trade_id').references(
      () => projectTrades.id,
    ),
    projectRoleId: integer('project_role_id').references(
      () => projectRoles.id,
    ),
    scope: varchar('scope', { length: 20 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: text('description'),
    inputs: jsonb('inputs').default([]),
    outputs: jsonb('outputs').default([]),
    hoaiPhase: smallint('hoai_phase'),
    isHoaiBasic: boolean('is_hoai_basic').default(false),
    isHoaiSpecial: boolean('is_hoai_special').default(false),
    status: varchar('status', { length: 30 }).default('open'),
    priority: smallint('priority').default(3),
    estimatedHours: numeric('estimated_hours', { precision: 8, scale: 2 }),
    actualHours: numeric('actual_hours', { precision: 8, scale: 2 }),
    effortDays: numeric('effort_days', { precision: 6, scale: 2 }),
    complexity: varchar('complexity', { length: 20 }),
    progressPercentage: numeric('progress_percentage', {
      precision: 5,
      scale: 2,
    }).default('0'),
    startDate: date('start_date'),
    dueDate: date('due_date'),
    actualStartDate: date('actual_start_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    boardPosition: integer('board_position'),
    sortOrder: smallint('sort_order').default(0),
    notes: text('notes'),
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
    index('tasks_project_status_idx').on(table.projectId, table.status),
    index('tasks_assigned_status_idx').on(table.assignedTo, table.status),
    index('tasks_module_status_idx').on(table.moduleId, table.status),
  ],
);

// ---------------------------------------------------------------------------
// deliverables
// ---------------------------------------------------------------------------
export const deliverables = pgTable(
  'deliverables',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    moduleId: integer('module_id').references(() => modules.id),
    taskId: integer('task_id').references(() => tasks.id),
    milestoneId: integer('milestone_id').references(() => milestones.id),
    scope: varchar('scope', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    type: varchar('type', { length: 50 }),
    format: varchar('format', { length: 50 }),
    purpose: text('purpose'),
    isFmRelevant: boolean('is_fm_relevant').default(false),
    retentionPeriod: varchar('retention_period', { length: 50 }),
    qualityStandards: jsonb('quality_standards').default([]),
    status: varchar('status', { length: 30 }).default('pending'),
    fileId: integer('file_id').references(() => media.id),
    dueDate: date('due_date'),
    submittedDate: date('submitted_date'),
    approvedDate: date('approved_date'),
    approvedBy: integer('approved_by').references(() => users.id),
    approvalNotes: text('approval_notes'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('deliverables_project_status_idx').on(
      table.projectId,
      table.status,
    ),
  ],
);

// ---------------------------------------------------------------------------
// projectRoleAssignments
// ---------------------------------------------------------------------------
export const projectRoleAssignments = pgTable(
  'project_role_assignments',
  {
    id: serial('id').primaryKey(),
    projectRoleId: integer('project_role_id')
      .notNull()
      .references(() => projectRoles.id),
    userId: integer('user_id').references(() => users.id),
    organizationId: integer('organization_id'),
    contactId: integer('contact_id'),
    assignmentType: varchar('assignment_type', { length: 30 }).default(
      'responsible',
    ),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    releasedAt: timestamp('released_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('project_role_assignments_role_user_idx')
      .on(table.projectRoleId, table.userId)
      .where(sql`user_id IS NOT NULL`),
  ],
);

// ===========================================================================
// Relations
// ===========================================================================

export const modulesRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, {
    fields: [modules.projectId],
    references: [projects.id],
  }),
  parentModule: one(modules, {
    fields: [modules.parentModuleId],
    references: [modules.id],
    relationName: 'moduleHierarchy',
  }),
  childModules: many(modules, {
    relationName: 'moduleHierarchy',
  }),
  tasks: many(tasks),
  milestones: many(milestones),
  deliverables: many(deliverables),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  module: one(modules, {
    fields: [milestones.moduleId],
    references: [modules.id],
  }),
  tasks: many(tasks),
  deliverables: many(deliverables),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  module: one(modules, {
    fields: [tasks.moduleId],
    references: [modules.id],
  }),
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  projectTrade: one(projectTrades, {
    fields: [tasks.projectTradeId],
    references: [projectTrades.id],
  }),
  projectRole: one(projectRoles, {
    fields: [tasks.projectRoleId],
    references: [projectRoles.id],
  }),
  deliverables: many(deliverables),
}));

export const deliverablesRelations = relations(deliverables, ({ one }) => ({
  project: one(projects, {
    fields: [deliverables.projectId],
    references: [projects.id],
  }),
  module: one(modules, {
    fields: [deliverables.moduleId],
    references: [modules.id],
  }),
  task: one(tasks, {
    fields: [deliverables.taskId],
    references: [tasks.id],
  }),
  milestone: one(milestones, {
    fields: [deliverables.milestoneId],
    references: [milestones.id],
  }),
  file: one(media, {
    fields: [deliverables.fileId],
    references: [media.id],
  }),
  approver: one(users, {
    fields: [deliverables.approvedBy],
    references: [users.id],
  }),
}));

export const projectRolesRelations = relations(
  projectRoles,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectRoles.projectId],
      references: [projects.id],
    }),
    assignments: many(projectRoleAssignments),
    tasks: many(tasks),
    leadTrades: many(projectTrades),
  }),
);

export const projectRoleAssignmentsRelations = relations(
  projectRoleAssignments,
  ({ one }) => ({
    projectRole: one(projectRoles, {
      fields: [projectRoleAssignments.projectRoleId],
      references: [projectRoles.id],
    }),
    user: one(users, {
      fields: [projectRoleAssignments.userId],
      references: [users.id],
    }),
  }),
);

export const projectTradesRelations = relations(
  projectTrades,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectTrades.projectId],
      references: [projects.id],
    }),
    leadRole: one(projectRoles, {
      fields: [projectTrades.leadRoleId],
      references: [projectRoles.id],
    }),
    tasks: many(tasks),
  }),
);
