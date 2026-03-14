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
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, companies } from './auth';
import { projects } from './projects';
import { media } from './cross-cutting';

// ---------------------------------------------------------------------------
// wikiNorms
// ---------------------------------------------------------------------------
export const wikiNorms = pgTable('wiki_norms', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companies.id), // null = system
  code: varchar('code', { length: 50 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  version: varchar('version', { length: 50 }),
  validFrom: date('valid_from'),
  validUntil: date('valid_until'),
  description: text('description'),
  sections: jsonb('sections').default([]), // [{id, title, content, values, sortOrder, subsections}]
  trades: jsonb('trades').default([]),
  relations_data: jsonb('relations').default([]), // {relatedNormId, relationType}
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
// wikiReports
// ---------------------------------------------------------------------------
export const wikiReports = pgTable('wiki_reports', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companies.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  sections: jsonb('sections').notNull(), // [{title, content, normReferences, sortOrder}]
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// reports
// ---------------------------------------------------------------------------
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  reportType: varchar('report_type', { length: 30 }).notNull(), // explanatory | proposal | submission
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('draft'),
  version: smallint('version').default(1),
  sections: jsonb('sections').default([]), // [{title, content, templateId, sortOrder}]
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// reportSnapshots
// ---------------------------------------------------------------------------
export const reportSnapshots = pgTable('report_snapshots', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id')
    .notNull()
    .references(() => reports.id),
  snapshotVersion: smallint('snapshot_version').notNull(),
  content: jsonb('content').notNull(),
  generatedBy: integer('generated_by')
    .notNull()
    .references(() => users.id),
  generatedAt: timestamp('generated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// contentBlocks
// ---------------------------------------------------------------------------
export const contentBlocks = pgTable('content_blocks', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  blockType: varchar('block_type', { length: 30 }).notNull(), // text | template | reusable
  category: varchar('category', { length: 100 }),
  name: varchar('name', { length: 255 }),
  title: varchar('title', { length: 255 }),
  content: jsonb('content').notNull(),
  version: smallint('version').default(1),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// permitDocuments
// ---------------------------------------------------------------------------
export const permitDocuments = pgTable('permit_documents', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  companyId: integer('company_id').references(() => companies.id),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  documentNumber: varchar('document_number', { length: 100 }),
  title: varchar('title', { length: 500 }).notNull(),
  status: varchar('status', { length: 30 }).default('pending'), // pending | required | submitted | approved | rejected
  issuedBy: varchar('issued_by', { length: 255 }),
  issueDate: date('issue_date'),
  expiryDate: date('expiry_date'),
  submittedAt: date('submitted_at'),
  approvedAt: date('approved_at'),
  authority: varchar('authority', { length: 255 }),
  referenceNumber: varchar('reference_number', { length: 100 }),
  fileId: integer('file_id').references(() => media.id),
  notes: text('notes'),
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

export const wikiNormsRelations = relations(wikiNorms, ({ one }) => ({
  company: one(companies, {
    fields: [wikiNorms.companyId],
    references: [companies.id],
  }),
}));

export const wikiReportsRelations = relations(wikiReports, ({ one }) => ({
  company: one(companies, {
    fields: [wikiReports.companyId],
    references: [companies.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  project: one(projects, {
    fields: [reports.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
  }),
  snapshots: many(reportSnapshots),
}));

export const reportSnapshotsRelations = relations(
  reportSnapshots,
  ({ one }) => ({
    report: one(reports, {
      fields: [reportSnapshots.reportId],
      references: [reports.id],
    }),
    generator: one(users, {
      fields: [reportSnapshots.generatedBy],
      references: [users.id],
    }),
  }),
);

export const contentBlocksRelations = relations(contentBlocks, ({ one }) => ({
  company: one(companies, {
    fields: [contentBlocks.companyId],
    references: [companies.id],
  }),
  creator: one(users, {
    fields: [contentBlocks.createdBy],
    references: [users.id],
  }),
}));

export const permitDocumentsRelations = relations(
  permitDocuments,
  ({ one }) => ({
    project: one(projects, {
      fields: [permitDocuments.projectId],
      references: [projects.id],
    }),
    company: one(companies, {
      fields: [permitDocuments.companyId],
      references: [companies.id],
    }),
    file: one(media, {
      fields: [permitDocuments.fileId],
      references: [media.id],
    }),
  }),
);
