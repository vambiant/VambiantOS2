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
import { users, companies } from './auth';
import { organizations, references } from './crm';

// ---------------------------------------------------------------------------
// projects (with scope for templates)
// ---------------------------------------------------------------------------
export const projects = pgTable(
  'projects',
  {
    id: serial('id').primaryKey(),
    ulid: varchar('ulid', { length: 26 }).unique().notNull(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    clientId: integer('client_id').references(() => organizations.id),
    commissionerId: integer('commissioner_id').references(() => organizations.id),
    projectManagerId: integer('project_manager_id').references(() => users.id),
    parentProjectId: integer('parent_project_id').references((): any => projects.id),
    templateId: integer('template_id').references((): any => projects.id),
    scope: varchar('scope', { length: 20 }).notNull().default('project'), // project | template
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }), // project number
    description: text('description'),
    status: varchar('status', { length: 30 }).notNull().default('draft'), // draft | active | on_hold | completed | archived | cancelled
    projectType: varchar('project_type', { length: 50 }), // building type
    hoaiZone: smallint('hoai_zone'), // 1-5
    useBim: boolean('use_bim').default(false),
    bimStandard: varchar('bim_standard', { length: 50 }),
    sustainabilityCertifications: jsonb('sustainability_certifications').default([]),
    fmRequirements: text('fm_requirements'),
    timeTrackingEnabled: boolean('time_tracking_enabled').default(true),
    estimatedHours: numeric('estimated_hours', { precision: 10, scale: 2 }),
    budgetHours: numeric('budget_hours', { precision: 10, scale: 2 }),
    budgetNet: numeric('budget_net', { precision: 15, scale: 2 }),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).default('19.0'),
    currency: varchar('currency', { length: 3 }).default('EUR'),
    address: jsonb('address'), // {street, zip, city, country, bundesland}
    buildingType: varchar('building_type', { length: 100 }),
    buildingTypeL2: varchar('building_type_l2', { length: 100 }),
    quickNote: text('quick_note'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    settings: jsonb('settings').default({}),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('projects_company_code_idx')
      .on(table.companyId, table.code)
      .where(sql`code IS NOT NULL`),
    index('projects_company_scope_idx').on(table.companyId, table.scope),
    index('projects_company_status_idx').on(table.companyId, table.status),
  ],
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, {
    fields: [projects.companyId],
    references: [companies.id],
  }),
  client: one(organizations, {
    fields: [projects.clientId],
    references: [organizations.id],
    relationName: 'projectClient',
  }),
  commissioner: one(organizations, {
    fields: [projects.commissionerId],
    references: [organizations.id],
    relationName: 'projectCommissioner',
  }),
  projectManager: one(users, {
    fields: [projects.projectManagerId],
    references: [users.id],
  }),
  parentProject: one(projects, {
    fields: [projects.parentProjectId],
    references: [projects.id],
    relationName: 'parentChild',
  }),
  childProjects: many(projects, { relationName: 'parentChild' }),
  template: one(projects, {
    fields: [projects.templateId],
    references: [projects.id],
    relationName: 'templateDerived',
  }),
  derivedFromTemplate: many(projects, { relationName: 'templateDerived' }),
  projectUsers: many(projectUsers),
  projectActivities: many(projectActivities),
  projectRevisions: many(projectRevisions),
  references: many(references),
}));

// ---------------------------------------------------------------------------
// projectUsers (pivot)
// ---------------------------------------------------------------------------
export const projectUsers = pgTable(
  'project_users',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    role: varchar('role', { length: 50 }).notNull().default('member'),
    permissions: jsonb('permissions').default([]),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_users_project_user_idx').on(table.projectId, table.userId),
  ],
);

export const projectUsersRelations = relations(projectUsers, ({ one }) => ({
  project: one(projects, {
    fields: [projectUsers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectUsers.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// projectActivities (audit log)
// ---------------------------------------------------------------------------
export const projectActivities = pgTable(
  'project_activities',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    userId: integer('user_id').references(() => users.id),
    action: varchar('action', { length: 50 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: integer('entity_id'),
    changes: jsonb('changes'),
    description: text('description'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('project_activities_project_created_idx').on(table.projectId, table.createdAt),
  ],
);

export const projectActivitiesRelations = relations(projectActivities, ({ one }) => ({
  project: one(projects, {
    fields: [projectActivities.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectActivities.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// projectRevisions
// ---------------------------------------------------------------------------
export const projectRevisions = pgTable(
  'project_revisions',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    revisionNumber: smallint('revision_number').notNull(),
    name: varchar('name', { length: 255 }),
    description: text('description'),
    isCurrent: boolean('is_current').default(false),
    snapshot: jsonb('snapshot'),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_revisions_project_revision_idx').on(
      table.projectId,
      table.revisionNumber,
    ),
  ],
);

export const projectRevisionsRelations = relations(projectRevisions, ({ one }) => ({
  project: one(projects, {
    fields: [projectRevisions.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [projectRevisions.createdBy],
    references: [users.id],
  }),
}));
