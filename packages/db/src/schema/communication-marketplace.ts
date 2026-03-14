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
import { contacts } from './crm';
import { projects } from './projects';
import { modules, tasks } from './project-structure';

// ---------------------------------------------------------------------------
// communications
// ---------------------------------------------------------------------------
export const communications = pgTable('communications', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  type: varchar('type', { length: 30 }).notNull(), // meeting_protocol | correspondence | note
  subject: varchar('subject', { length: 500 }).notNull(),
  content: text('content'),
  date: timestamp('date', { withTimezone: true }).notNull(),
  location: varchar('location', { length: 255 }),
  entryType: varchar('entry_type', { length: 30 }), // letter | email | call (for correspondence)
  externalReference: varchar('external_reference', { length: 255 }),
  status: varchar('status', { length: 30 }).default('draft'),
  actionItemsSummary: text('action_items_summary'),
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
});

// ---------------------------------------------------------------------------
// communicationParticipants
// ---------------------------------------------------------------------------
export const communicationParticipants = pgTable(
  'communication_participants',
  {
    id: serial('id').primaryKey(),
    communicationId: integer('communication_id')
      .notNull()
      .references(() => communications.id),
    userId: integer('user_id').references(() => users.id),
    contactId: integer('contact_id').references(() => contacts.id),
    role: varchar('role', { length: 30 }).default('attendee'), // organizer | attendee | from | to | cc
    attended: boolean('attended'),
    participationType: varchar('participation_type', { length: 30 }),
  },
);

// ---------------------------------------------------------------------------
// actionItems
// ---------------------------------------------------------------------------
export const actionItems = pgTable('action_items', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  communicationId: integer('communication_id').references(
    () => communications.id,
  ),
  entityType: varchar('entity_type', { length: 30 }),
  entityId: integer('entity_id'),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  assignedTo: integer('assigned_to').references(() => users.id),
  dueDate: date('due_date'),
  status: varchar('status', { length: 30 }).default('open'), // open | in_progress | completed | cancelled
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
// bkiBuildingTypes
// ---------------------------------------------------------------------------
export const bkiBuildingTypes = pgTable('bki_building_types', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  gebaeudeklasse: varchar('gebaeudeklasse', { length: 50 }),
  parentCode: varchar('parent_code', { length: 20 }),
  description: text('description'),
  standardeinordnung: jsonb('standardeinordnung').default({}),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// bkiCostData
// ---------------------------------------------------------------------------
export const bkiCostData = pgTable(
  'bki_cost_data',
  {
    id: serial('id').primaryKey(),
    buildingTypeId: integer('building_type_id')
      .notNull()
      .references(() => bkiBuildingTypes.id),
    kostengruppe: varchar('kostengruppe', { length: 10 }).notNull(), // DIN 276 code
    kennwertType: varchar('kennwert_type', { length: 30 }).notNull(), // kosten | mengen | planung
    region: varchar('region', { length: 50 }),
    regionalFactor: numeric('regional_factor', { precision: 6, scale: 4 }),
    priceIndex: numeric('price_index', { precision: 8, scale: 4 }),
    priceIndexDate: date('price_index_date'),
    value: numeric('value', { precision: 15, scale: 2 }).notNull(),
    unit: varchar('unit', { length: 30 }),
    minValue: numeric('min_value', { precision: 15, scale: 2 }),
    maxValue: numeric('max_value', { precision: 15, scale: 2 }),
    schwellenwert: jsonb('schwellenwert'),
    referenceYear: smallint('reference_year'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('bki_cost_data_type_kg_kennwert_idx').on(
      table.buildingTypeId,
      table.kostengruppe,
      table.kennwertType,
    ),
  ],
);

// ---------------------------------------------------------------------------
// marketplaceListings
// ---------------------------------------------------------------------------
export const marketplaceListings = pgTable('marketplace_listings', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  listingType: varchar('listing_type', { length: 30 }).notNull(), // offer | request
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  trades: jsonb('trades').default([]),
  availability: jsonb('availability'), // {startDate, endDate, hoursPerWeek}
  pricing: jsonb('pricing'), // {type, amount, currency}
  location: jsonb('location'), // {city, radiusKm, remotePossible}
  status: varchar('status', { length: 30 }).default('active'),
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
// intercompanyTransactions
// ---------------------------------------------------------------------------
export const intercompanyTransactions = pgTable('intercompany_transactions', {
  id: serial('id').primaryKey(),
  listingId: integer('listing_id').references(() => marketplaceListings.id),
  requestingCompanyId: integer('requesting_company_id')
    .notNull()
    .references(() => companies.id),
  providingCompanyId: integer('providing_company_id')
    .notNull()
    .references(() => companies.id),
  transactionType: varchar('transaction_type', { length: 50 }),
  amount: numeric('amount', { precision: 15, scale: 2 }),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('pending'),
  terms: jsonb('terms').default({}),
  approvals: jsonb('approvals').default([]), // [{companyId, userId, approvedAt, notes}]
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// variantComparisons
// ---------------------------------------------------------------------------
export const variantComparisons = pgTable('variant_comparisons', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('draft'),
  criteria: jsonb('criteria').default([]), // [{name, weight}]
  items: jsonb('items').notNull(), // [{name, optionA, optionB, optionC, scores, recommendation}]
  recommendation: text('recommendation'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// ganttItems
// ---------------------------------------------------------------------------
export const ganttItems = pgTable('gantt_items', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  entityType: varchar('entity_type', { length: 30 }), // task | module | milestone | custom
  entityId: integer('entity_id'),
  parentGanttItemId: integer('parent_gantt_item_id').references(
    (): any => ganttItems.id,
  ),
  label: varchar('label', { length: 255 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  progress: smallint('progress').default(0), // 0-100
  color: varchar('color', { length: 20 }),
  sortOrder: smallint('sort_order').default(0),
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

export const communicationsRelations = relations(
  communications,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [communications.projectId],
      references: [projects.id],
    }),
    creator: one(users, {
      fields: [communications.createdBy],
      references: [users.id],
    }),
    participants: many(communicationParticipants),
    actionItems: many(actionItems),
  }),
);

export const communicationParticipantsRelations = relations(
  communicationParticipants,
  ({ one }) => ({
    communication: one(communications, {
      fields: [communicationParticipants.communicationId],
      references: [communications.id],
    }),
    user: one(users, {
      fields: [communicationParticipants.userId],
      references: [users.id],
    }),
    contact: one(contacts, {
      fields: [communicationParticipants.contactId],
      references: [contacts.id],
    }),
  }),
);

export const actionItemsRelations = relations(actionItems, ({ one }) => ({
  project: one(projects, {
    fields: [actionItems.projectId],
    references: [projects.id],
  }),
  communication: one(communications, {
    fields: [actionItems.communicationId],
    references: [communications.id],
  }),
  assignee: one(users, {
    fields: [actionItems.assignedTo],
    references: [users.id],
  }),
}));

export const bkiBuildingTypesRelations = relations(
  bkiBuildingTypes,
  ({ many }) => ({
    costData: many(bkiCostData),
  }),
);

export const bkiCostDataRelations = relations(bkiCostData, ({ one }) => ({
  buildingType: one(bkiBuildingTypes, {
    fields: [bkiCostData.buildingTypeId],
    references: [bkiBuildingTypes.id],
  }),
}));

export const marketplaceListingsRelations = relations(
  marketplaceListings,
  ({ one, many }) => ({
    company: one(companies, {
      fields: [marketplaceListings.companyId],
      references: [companies.id],
    }),
    transactions: many(intercompanyTransactions),
  }),
);

export const intercompanyTransactionsRelations = relations(
  intercompanyTransactions,
  ({ one }) => ({
    listing: one(marketplaceListings, {
      fields: [intercompanyTransactions.listingId],
      references: [marketplaceListings.id],
    }),
    requestingCompany: one(companies, {
      fields: [intercompanyTransactions.requestingCompanyId],
      references: [companies.id],
      relationName: 'requestingCompany',
    }),
    providingCompany: one(companies, {
      fields: [intercompanyTransactions.providingCompanyId],
      references: [companies.id],
      relationName: 'providingCompany',
    }),
  }),
);

export const variantComparisonsRelations = relations(
  variantComparisons,
  ({ one }) => ({
    project: one(projects, {
      fields: [variantComparisons.projectId],
      references: [projects.id],
    }),
  }),
);

export const ganttItemsRelations = relations(
  ganttItems,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [ganttItems.projectId],
      references: [projects.id],
    }),
    parentGanttItem: one(ganttItems, {
      fields: [ganttItems.parentGanttItemId],
      references: [ganttItems.id],
      relationName: 'ganttItemHierarchy',
    }),
    childGanttItems: many(ganttItems, {
      relationName: 'ganttItemHierarchy',
    }),
  }),
);
