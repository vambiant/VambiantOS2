import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  smallint,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './auth';
import { projects } from './projects';
import { tasks } from './project-structure';

// ---------------------------------------------------------------------------
// dependencies (polymorphic - replaces multiple dependency tables)
// ---------------------------------------------------------------------------
export const dependencies = pgTable(
  'dependencies',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    sourceType: varchar('source_type', { length: 30 }).notNull(),
    sourceId: integer('source_id'),
    targetType: varchar('target_type', { length: 30 }).notNull(),
    targetId: integer('target_id'),
    dependencyType: varchar('dependency_type', { length: 30 })
      .notNull()
      .default('finish_to_start'),
    lagDays: smallint('lag_days').default(0),
    externalDescription: text('external_description'),
    status: varchar('status', { length: 30 }).default('pending'),
    condition: text('condition'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('dependencies_source_idx').on(
      table.projectId,
      table.sourceType,
      table.sourceId,
    ),
    index('dependencies_target_idx').on(
      table.projectId,
      table.targetType,
      table.targetId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// projectRisks
// ---------------------------------------------------------------------------
export const projectRisks = pgTable(
  'project_risks',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    affectedModules: jsonb('affected_modules').default([]),
    category: varchar('category', { length: 50 }),
    likelihood: smallint('likelihood'),
    impact: smallint('impact'),
    status: varchar('status', { length: 30 }).default('identified'),
    mitigationStrategy: text('mitigation_strategy'),
    ownerId: integer('owner_id').references(() => users.id),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('project_risks_project_status_idx').on(
      table.projectId,
      table.status,
    ),
  ],
);

// ---------------------------------------------------------------------------
// coordinationIssues
// ---------------------------------------------------------------------------
export const coordinationIssues = pgTable(
  'coordination_issues',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    reportedBy: integer('reported_by')
      .notNull()
      .references(() => users.id),
    assignedTo: integer('assigned_to').references(() => users.id),
    relatedTaskId: integer('related_task_id').references(() => tasks.id),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    affectedTrades: jsonb('affected_trades').default([]),
    affectedRoles: jsonb('affected_roles').default([]),
    severity: varchar('severity', { length: 20 }).default('medium'),
    status: varchar('status', { length: 30 }).default('open'),
    resolution: text('resolution'),
    resolvedBy: integer('resolved_by').references(() => users.id),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('coordination_issues_project_status_idx').on(
      table.projectId,
      table.status,
    ),
  ],
);

// ===========================================================================
// Relations
// ===========================================================================

export const dependenciesRelations = relations(dependencies, ({ one }) => ({
  project: one(projects, {
    fields: [dependencies.projectId],
    references: [projects.id],
  }),
}));

export const projectRisksRelations = relations(projectRisks, ({ one }) => ({
  project: one(projects, {
    fields: [projectRisks.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [projectRisks.ownerId],
    references: [users.id],
  }),
}));

export const coordinationIssuesRelations = relations(
  coordinationIssues,
  ({ one }) => ({
    project: one(projects, {
      fields: [coordinationIssues.projectId],
      references: [projects.id],
    }),
    reporter: one(users, {
      fields: [coordinationIssues.reportedBy],
      references: [users.id],
    }),
    assignee: one(users, {
      fields: [coordinationIssues.assignedTo],
      references: [users.id],
      relationName: 'coordinationIssueAssignee',
    }),
    relatedTask: one(tasks, {
      fields: [coordinationIssues.relatedTaskId],
      references: [tasks.id],
    }),
    resolver: one(users, {
      fields: [coordinationIssues.resolvedBy],
      references: [users.id],
      relationName: 'coordinationIssueResolver',
    }),
  }),
);
