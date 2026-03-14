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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, companies } from './auth';
import { projects } from './projects';
import { media } from './cross-cutting';

// ---------------------------------------------------------------------------
// bimModels
// ---------------------------------------------------------------------------
export const bimModels = pgTable('bim_models', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  name: varchar('name', { length: 255 }).notNull(),
  modelType: varchar('model_type', { length: 50 }), // architecture | structural | mep | coordination
  filePath: varchar('file_path', { length: 500 }),
  fileId: integer('file_id').references(() => media.id),
  version: varchar('version', { length: 50 }),
  format: varchar('format', { length: 30 }), // ifc | rvt | nwd
  ifcStandard: varchar('ifc_standard', { length: 50 }),
  status: varchar('status', { length: 30 }).default('active'),
  createdBy: integer('created_by').references(() => users.id),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// projectRooms (Raumbuch)
// ---------------------------------------------------------------------------
export const projectRooms = pgTable('project_rooms', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  bimModelId: integer('bim_model_id').references(() => bimModels.id),
  roomNumber: varchar('room_number', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  floor: varchar('floor', { length: 50 }),
  category: varchar('category', { length: 100 }),
  areaSqm: numeric('area_sqm', { precision: 10, scale: 2 }),
  volume: numeric('volume', { precision: 10, scale: 2 }),
  ceilingHeight: numeric('ceiling_height', { precision: 5, scale: 2 }),
  usageType: varchar('usage_type', { length: 100 }),
  specifications: jsonb('specifications').default({}), // requirements, finishes, MEP
  properties: jsonb('properties').default({}),
  boundingBox: jsonb('bounding_box'),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// questionnaires
// ---------------------------------------------------------------------------
export const questionnaires = pgTable('questionnaires', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  projectId: integer('project_id').references(() => projects.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('draft'),
  sections: jsonb('sections').notNull(), // [{title, description, sortOrder, questions: [{id, text, type, options, required}]}]
  reportMappings: jsonb('report_mappings').default([]),
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
// questionnaireResponses
// ---------------------------------------------------------------------------
export const questionnaireResponses = pgTable('questionnaire_responses', {
  id: serial('id').primaryKey(),
  questionnaireId: integer('questionnaire_id')
    .notNull()
    .references(() => questionnaires.id),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  respondentId: integer('respondent_id').references(() => users.id),
  status: varchar('status', { length: 30 }).default('in_progress'),
  answers: jsonb('answers').notNull(), // {questionId: {value, notes, attachments}}
  runningText: text('running_text'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// projectRequirements
// ---------------------------------------------------------------------------
export const projectRequirements = pgTable('project_requirements', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  questionnaireId: integer('questionnaire_id').references(
    () => questionnaires.id,
  ),
  category: varchar('category', { length: 100 }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  priority: smallint('priority').default(3), // 1=must, 5=nice
  status: varchar('status', { length: 30 }).default('open'), // open | approved | implemented | rejected
  source: varchar('source', { length: 50 }), // questionnaire | manual | norm
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===========================================================================
// Relations
// ===========================================================================

export const bimModelsRelations = relations(bimModels, ({ one, many }) => ({
  project: one(projects, {
    fields: [bimModels.projectId],
    references: [projects.id],
  }),
  file: one(media, {
    fields: [bimModels.fileId],
    references: [media.id],
  }),
  creator: one(users, {
    fields: [bimModels.createdBy],
    references: [users.id],
  }),
  rooms: many(projectRooms),
}));

export const projectRoomsRelations = relations(projectRooms, ({ one }) => ({
  project: one(projects, {
    fields: [projectRooms.projectId],
    references: [projects.id],
  }),
  bimModel: one(bimModels, {
    fields: [projectRooms.bimModelId],
    references: [bimModels.id],
  }),
}));

export const questionnairesRelations = relations(
  questionnaires,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [questionnaires.companyId],
      references: [companies.id],
    }),
    project: one(projects, {
      fields: [questionnaires.projectId],
      references: [projects.id],
    }),
    responses: many(questionnaireResponses),
    requirements: many(projectRequirements),
  }),
);

export const questionnaireResponsesRelations = relations(
  questionnaireResponses,
  ({ one }) => ({
    questionnaire: one(questionnaires, {
      fields: [questionnaireResponses.questionnaireId],
      references: [questionnaires.id],
    }),
    project: one(projects, {
      fields: [questionnaireResponses.projectId],
      references: [projects.id],
    }),
    respondent: one(users, {
      fields: [questionnaireResponses.respondentId],
      references: [users.id],
    }),
  }),
);

export const projectRequirementsRelations = relations(
  projectRequirements,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectRequirements.projectId],
      references: [projects.id],
    }),
    questionnaire: one(questionnaires, {
      fields: [projectRequirements.questionnaireId],
      references: [questionnaires.id],
    }),
  }),
);
