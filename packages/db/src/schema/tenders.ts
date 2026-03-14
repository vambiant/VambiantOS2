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
import { projects } from './projects';
import { organizations } from './crm';

// ---------------------------------------------------------------------------
// tenders (public procurement monitoring / SPEN integration)
// ---------------------------------------------------------------------------
export const tenders = pgTable(
  'tenders',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    projectId: integer('project_id').references(() => projects.id),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    referenceNumber: varchar('reference_number', { length: 100 }),
    source: varchar('source', { length: 100 }), // manual, spen
    spenId: varchar('spen_id', { length: 100 }),
    platformUrl: varchar('platform_url', { length: 500 }),
    procurementType: varchar('procurement_type', { length: 100 }),
    cpvCodes: jsonb('cpv_codes').default([]),
    contractingAuthority: varchar('contracting_authority', { length: 255 }),
    clientId: integer('client_id').references(() => organizations.id),
    locationAddress: varchar('location_address', { length: 255 }),
    locationCity: varchar('location_city', { length: 100 }),
    locationPostalCode: varchar('location_postal_code', { length: 20 }),
    locationState: varchar('location_state', { length: 100 }),
    estimatedValueNet: numeric('estimated_value_net', {
      precision: 15,
      scale: 2,
    }),
    currency: varchar('currency', { length: 3 }).default('EUR'),
    publicationDate: date('publication_date'),
    submissionDeadline: timestamp('submission_deadline', {
      withTimezone: true,
    }),
    bindingPeriodEnd: date('binding_period_end'),
    executionStart: date('execution_start'),
    executionEnd: date('execution_end'),
    hoaiPhases: jsonb('hoai_phases').default([]),
    honorarzone: smallint('honorarzone'),
    buildingType: varchar('building_type', { length: 100 }),
    buildingTypeL2: varchar('building_type_l2', { length: 100 }),
    status: varchar('status', { length: 30 }).default('discovered'), // discovered, qualified, analyzed, bid_prepared, submitted, awarded, cancelled
    assignedTo: integer('assigned_to').references(() => users.id),
    compositeScore: numeric('composite_score', { precision: 5, scale: 2 }),
    legalAssessment: jsonb('legal_assessment').default({}),
    analysis: jsonb('analysis').default({}),
    scoring: jsonb('scoring').default({}), // {dimensions, calibrationNotes, totalScore}
    qaReview: jsonb('qa_review').default({}), // {status, findings}
    partnerMatches: jsonb('partner_matches').default([]),
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
    uniqueIndex('tenders_company_spen_id_idx')
      .on(table.companyId, table.spenId)
      .where(sql`spen_id IS NOT NULL`),
    index('tenders_company_status_idx').on(table.companyId, table.status),
    index('tenders_submission_deadline_idx').on(table.submissionDeadline),
  ],
);

// ---------------------------------------------------------------------------
// inboundEmailConfigs
// ---------------------------------------------------------------------------
export const inboundEmailConfigs = pgTable('inbound_email_configs', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  emailAddress: varchar('email_address', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  credentials: jsonb('credentials'), // encrypted
  filters: jsonb('filters').default({}),
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// inboundEmails
// ---------------------------------------------------------------------------
export const inboundEmails = pgTable('inbound_emails', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  configId: integer('config_id')
    .notNull()
    .references(() => inboundEmailConfigs.id),
  tenderId: integer('tender_id').references(() => tenders.id),
  fromAddress: varchar('from_address', { length: 255 }),
  subject: varchar('subject', { length: 500 }),
  body: text('body'),
  rawHeaders: jsonb('raw_headers'),
  attachments: jsonb('attachments').default([]),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===========================================================================
// Relations
// ===========================================================================

export const tendersRelations = relations(tenders, ({ one, many }) => ({
  company: one(companies, {
    fields: [tenders.companyId],
    references: [companies.id],
  }),
  project: one(projects, {
    fields: [tenders.projectId],
    references: [projects.id],
  }),
  client: one(organizations, {
    fields: [tenders.clientId],
    references: [organizations.id],
  }),
  assignee: one(users, {
    fields: [tenders.assignedTo],
    references: [users.id],
  }),
  inboundEmails: many(inboundEmails),
}));

export const inboundEmailConfigsRelations = relations(
  inboundEmailConfigs,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [inboundEmailConfigs.companyId],
      references: [companies.id],
    }),
    emails: many(inboundEmails),
  }),
);

export const inboundEmailsRelations = relations(inboundEmails, ({ one }) => ({
  company: one(companies, {
    fields: [inboundEmails.companyId],
    references: [companies.id],
  }),
  config: one(inboundEmailConfigs, {
    fields: [inboundEmails.configId],
    references: [inboundEmailConfigs.id],
  }),
  tender: one(tenders, {
    fields: [inboundEmails.tenderId],
    references: [tenders.id],
  }),
}));
