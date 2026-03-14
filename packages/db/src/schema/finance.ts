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
import { organizations } from './crm';
import { media } from './cross-cutting';
import { procurements, procurementPositions } from './procurement';

// ---------------------------------------------------------------------------
// contracts
// ---------------------------------------------------------------------------
export const contracts = pgTable(
  'contracts',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    procurementId: integer('procurement_id').references(
      () => procurements.id,
    ),
    organizationId: integer('organization_id').references(
      () => organizations.id,
    ),
    contractType: varchar('contract_type', { length: 30 }).notNull(), // service, construction, consulting
    number: varchar('number', { length: 50 }),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 30 }).default('draft'), // draft, active, completed, terminated, suspended
    contractDate: date('contract_date'),
    signedAt: date('signed_at'),
    signedBy: integer('signed_by').references(() => users.id),
    startDate: date('start_date'),
    plannedEndDate: date('planned_end_date'),
    actualEndDate: date('actual_end_date'),
    totalFeeNet: numeric('total_fee_net', { precision: 15, scale: 2 }),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).default('19.0'),
    totalFeeGross: numeric('total_fee_gross', { precision: 15, scale: 2 }),
    invoicedNet: numeric('invoiced_net', { precision: 15, scale: 2 }).default(
      '0',
    ),
    paidNet: numeric('paid_net', { precision: 15, scale: 2 }).default('0'),
    currency: varchar('currency', { length: 3 }).default('EUR'),
    items: jsonb('items').default([]), // [{description, unit, qty, unitPrice, total, hoaiPhase, percentage}]
    terms: jsonb('terms').default({}), // {paymentTerms, retentionPercentage, penalties, warranties}
    signedDocumentId: integer('signed_document_id').references(() => media.id),
    performanceBondRequired: boolean('performance_bond_required').default(
      false,
    ),
    performanceBondAmount: numeric('performance_bond_amount', {
      precision: 15,
      scale: 2,
    }),
    notes: text('notes'),
    internalNotes: text('internal_notes'),
    terminationReason: text('termination_reason'),
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
    index('contracts_project_status_idx').on(table.projectId, table.status),
  ],
);

// ---------------------------------------------------------------------------
// invoices
// ---------------------------------------------------------------------------
export const invoices = pgTable(
  'invoices',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').references(() => projects.id),
    contractId: integer('contract_id').references(() => contracts.id),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    organizationId: integer('organization_id').references(
      () => organizations.id,
    ),
    direction: varchar('direction', { length: 10 }).notNull(), // outbound, inbound
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
    type: varchar('type', { length: 30 }).default('standard'), // standard, partial, final, credit_note, advance
    version: smallint('version').default(1),
    status: varchar('status', { length: 30 }).default('draft'), // draft, sent, paid, overdue, cancelled, partially_paid
    invoiceDate: date('invoice_date').notNull(),
    dueDate: date('due_date'),
    paidAt: date('paid_at'),
    currency: varchar('currency', { length: 3 }).default('EUR'),
    amountNet: numeric('amount_net', { precision: 15, scale: 2 }),
    amountVat: numeric('amount_vat', { precision: 15, scale: 2 }),
    amountGross: numeric('amount_gross', { precision: 15, scale: 2 }),
    paidAmount: numeric('paid_amount', { precision: 15, scale: 2 }).default(
      '0',
    ),
    modules: jsonb('modules').default([]), // [{moduleId, description, amount, phase}]
    lineItems: jsonb('line_items').default([]), // [{description, qty, unitPrice, taxRate, total}]
    paymentInfo: jsonb('payment_info').default({}),
    paymentTerms: text('payment_terms'),
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
    index('invoices_contract_status_idx').on(
      table.contractId,
      table.status,
    ),
    index('invoices_company_direction_status_idx').on(
      table.companyId,
      table.direction,
      table.status,
    ),
    uniqueIndex('invoices_company_number_idx').on(
      table.companyId,
      table.invoiceNumber,
    ),
  ],
);

// ---------------------------------------------------------------------------
// changeOrders
// ---------------------------------------------------------------------------
export const changeOrders = pgTable('change_orders', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  contractId: integer('contract_id').references(() => contracts.id),
  number: varchar('number', { length: 50 }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  originalAmount: numeric('original_amount', { precision: 15, scale: 2 }),
  changedAmount: numeric('changed_amount', { precision: 15, scale: 2 }),
  costImpact: numeric('cost_impact', { precision: 15, scale: 2 }),
  scheduleImpactDays: integer('schedule_impact_days'),
  status: varchar('status', { length: 30 }).default('draft'), // draft, submitted, approved, rejected
  requestedBy: integer('requested_by').references(() => users.id),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// aufmass (site measurements for billing)
// ---------------------------------------------------------------------------
export const aufmass = pgTable('aufmass', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  contractId: integer('contract_id').references(() => contracts.id),
  procurementPositionId: integer('procurement_position_id').references(
    () => procurementPositions.id,
  ),
  title: varchar('title', { length: 255 }),
  measurementDate: date('measurement_date').notNull(),
  measuredBy: integer('measured_by').references(() => users.id),
  quantity: numeric('quantity', { precision: 15, scale: 3 }),
  unit: varchar('unit', { length: 30 }),
  locationDescription: text('location_description'),
  status: varchar('status', { length: 30 }).default('draft'), // draft, submitted, verified, rejected
  verifiedBy: integer('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  attachments: jsonb('attachments').default([]),
  metadata: jsonb('metadata').default({}),
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

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  project: one(projects, {
    fields: [contracts.projectId],
    references: [projects.id],
  }),
  procurement: one(procurements, {
    fields: [contracts.procurementId],
    references: [procurements.id],
  }),
  organization: one(organizations, {
    fields: [contracts.organizationId],
    references: [organizations.id],
  }),
  signer: one(users, {
    fields: [contracts.signedBy],
    references: [users.id],
  }),
  signedDocument: one(media, {
    fields: [contracts.signedDocumentId],
    references: [media.id],
  }),
  invoices: many(invoices),
  changeOrders: many(changeOrders),
  aufmass: many(aufmass),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  contract: one(contracts, {
    fields: [invoices.contractId],
    references: [contracts.id],
  }),
  company: one(companies, {
    fields: [invoices.companyId],
    references: [companies.id],
  }),
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
}));

export const changeOrdersRelations = relations(changeOrders, ({ one }) => ({
  project: one(projects, {
    fields: [changeOrders.projectId],
    references: [projects.id],
  }),
  contract: one(contracts, {
    fields: [changeOrders.contractId],
    references: [contracts.id],
  }),
  requester: one(users, {
    fields: [changeOrders.requestedBy],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [changeOrders.approvedBy],
    references: [users.id],
  }),
}));

export const aufmassRelations = relations(aufmass, ({ one }) => ({
  project: one(projects, {
    fields: [aufmass.projectId],
    references: [projects.id],
  }),
  contract: one(contracts, {
    fields: [aufmass.contractId],
    references: [contracts.id],
  }),
  procurementPosition: one(procurementPositions, {
    fields: [aufmass.procurementPositionId],
    references: [procurementPositions.id],
  }),
  measurer: one(users, {
    fields: [aufmass.measuredBy],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [aufmass.verifiedBy],
    references: [users.id],
  }),
}));
