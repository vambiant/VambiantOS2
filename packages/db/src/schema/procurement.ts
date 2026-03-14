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
import { organizations, contacts } from './crm';
import { costEstimations, costPositions } from './costs';
import { tenders } from './tenders';

// ---------------------------------------------------------------------------
// procurements (unified HOAI offers + AVA tenders)
// ---------------------------------------------------------------------------
export const procurements = pgTable(
  'procurements',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    type: varchar('type', { length: 30 }).notNull(), // hoai_offer, ava_tender, direct_award
    number: varchar('number', { length: 50 }),
    parentId: integer('parent_id').references((): any => procurements.id),
    version: smallint('version').default(1),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 30 }).notNull().default('draft'), // draft, sent, accepted, rejected, expired, published, bidding, evaluation, awarded, executed, cancelled
    clientId: integer('client_id').references(() => organizations.id),
    clientContactId: integer('client_contact_id').references(() => contacts.id),
    costEstimationId: integer('cost_estimation_id').references(
      () => costEstimations.id,
    ),
    tenderId: integer('tender_id').references(() => tenders.id),
    createdBy: integer('created_by').references(() => users.id),

    // -- financial
    totalValueNet: numeric('total_value_net', { precision: 15, scale: 2 }),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).default('19.0'),
    totalValueGross: numeric('total_value_gross', { precision: 15, scale: 2 }),
    currency: varchar('currency', { length: 3 }).default('EUR'),
    nebenkostenPercent: numeric('nebenkosten_percent', {
      precision: 5,
      scale: 2,
    }),

    // -- HOAI specific
    hoaiParams: jsonb('hoai_params').default({}), // {zone, objectType, serviceType, difficultyLevel, baseCosts, calculatedFeeMin, calculatedFeeMax, offeredFee, conversionFactor, modernizationFactor, coordinationFactor}

    // -- AVA specific
    avaParams: jsonb('ava_params').default({}), // {vergabeart: beschraenkt/öffentlich/freihändig, contractType: vob_b/vob_a, submissionDeadline, bindingPeriodEnd, executionStart, executionEnd}

    // -- dates
    validUntil: date('valid_until'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),

    // -- text fields
    notes: text('notes'),
    internalNotes: text('internal_notes'),
    termsConditions: text('terms_conditions'),
    paymentTerms: text('payment_terms'),
    isLocked: boolean('is_locked').default(false),

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
    index('procurements_project_type_status_idx').on(
      table.projectId,
      table.type,
      table.status,
    ),
    index('procurements_company_status_idx').on(
      table.companyId,
      table.status,
    ),
  ],
);

// ---------------------------------------------------------------------------
// procurementGroups (offer phases/groups + AVA lots)
// ---------------------------------------------------------------------------
export const procurementGroups = pgTable(
  'procurement_groups',
  {
    id: serial('id').primaryKey(),
    procurementId: integer('procurement_id')
      .notNull()
      .references(() => procurements.id),
    parentGroupId: integer('parent_group_id').references(
      (): any => procurementGroups.id,
    ),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    groupType: varchar('group_type', { length: 30 }), // hoai_phase, hoai_service_group, ava_lot, general
    sortOrder: smallint('sort_order').default(0),
    description: text('description'),

    // -- HOAI phase specific
    phaseNumber: smallint('phase_number'),
    percentageBasic: numeric('percentage_basic', { precision: 5, scale: 2 }),
    percentageSpecial: numeric('percentage_special', {
      precision: 5,
      scale: 2,
    }),
    percentageActual: numeric('percentage_actual', { precision: 5, scale: 2 }),
    feeBasic: numeric('fee_basic', { precision: 15, scale: 2 }),
    feeSpecial: numeric('fee_special', { precision: 15, scale: 2 }),
    feeTotal: numeric('fee_total', { precision: 15, scale: 2 }),
    isIncluded: boolean('is_included').default(true),
    isOptional: boolean('is_optional').default(false),
    estimatedDurationWeeks: smallint('estimated_duration_weeks'),
    plannedStartDate: date('planned_start_date'),
    plannedEndDate: date('planned_end_date'),
    includedServices: jsonb('included_services').default([]),
    specialServices: jsonb('special_services').default([]),
    excludedServices: jsonb('excluded_services').default([]),
    deliverables: jsonb('deliverables').default([]),

    // -- AVA lot specific
    lotWorkPackages: jsonb('lot_work_packages').default([]),

    notes: text('notes'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('procurement_groups_procurement_sort_idx').on(
      table.procurementId,
      table.sortOrder,
    ),
  ],
);

// ---------------------------------------------------------------------------
// procurementPositions (offer positions + AVA LV positions)
// ---------------------------------------------------------------------------
export const procurementPositions = pgTable(
  'procurement_positions',
  {
    id: serial('id').primaryKey(),
    procurementId: integer('procurement_id')
      .notNull()
      .references(() => procurements.id),
    groupId: integer('group_id').references(() => procurementGroups.id),
    parentId: integer('parent_id').references(
      (): any => procurementPositions.id,
    ),
    costPositionId: integer('cost_position_id').references(
      () => costPositions.id,
    ),
    positionNumber: varchar('position_number', { length: 50 }),
    shortText: varchar('short_text', { length: 500 }).notNull(),
    longText: text('long_text'),
    workPackageCode: varchar('work_package_code', { length: 20 }),
    workPackageName: varchar('work_package_name', { length: 255 }),
    costGroup: varchar('cost_group', { length: 10 }),
    level: smallint('level'),
    unit: varchar('unit', { length: 30 }),
    quantity: numeric('quantity', { precision: 15, scale: 3 }),
    unitPrice: numeric('unit_price', { precision: 15, scale: 2 }),
    totalNet: numeric('total_net', { precision: 15, scale: 2 }),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }),
    totalGross: numeric('total_gross', { precision: 15, scale: 2 }),
    sortOrder: smallint('sort_order').default(0),
    isCustom: boolean('is_custom').default(false),
    isOptional: boolean('is_optional').default(false),
    isGroup: boolean('is_group').default(false),
    color: varchar('color', { length: 20 }),
    typeData: jsonb('type_data').default({}), // for HOAI: {phase, percentage, feeZone}; for AVA: {gaebPositionId, ozNumber}
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('procurement_positions_procurement_sort_idx').on(
      table.procurementId,
      table.sortOrder,
    ),
    index('procurement_positions_procurement_group_idx').on(
      table.procurementId,
      table.groupId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// bids
// ---------------------------------------------------------------------------
export const bids = pgTable(
  'bids',
  {
    id: serial('id').primaryKey(),
    procurementId: integer('procurement_id')
      .notNull()
      .references(() => procurements.id),
    bidderId: integer('bidder_id')
      .notNull()
      .references(() => organizations.id),
    argePartners: jsonb('arge_partners').default([]), // [{organizationId, sharePercentage, role}]
    submissionDate: timestamp('submission_date', { withTimezone: true }),
    totalNet: numeric('total_net', { precision: 15, scale: 2 }),
    totalGross: numeric('total_gross', { precision: 15, scale: 2 }),
    status: varchar('status', { length: 30 }).default('submitted'), // pending, submitted, valid, invalid, withdrawn
    evaluation: jsonb('evaluation').default({}), // {scoring, notes, criteria}
    decision: varchar('decision', { length: 30 }), // awarded, rejected, withdrawn
    decisionReason: text('decision_reason'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedBy: integer('decided_by').references(() => users.id),
    notes: text('notes'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('bids_procurement_status_idx').on(
      table.procurementId,
      table.status,
    ),
  ],
);

// ---------------------------------------------------------------------------
// bidPositions
// ---------------------------------------------------------------------------
export const bidPositions = pgTable('bid_positions', {
  id: serial('id').primaryKey(),
  bidId: integer('bid_id')
    .notNull()
    .references(() => bids.id),
  procurementPositionId: integer('procurement_position_id')
    .notNull()
    .references(() => procurementPositions.id),
  quantity: numeric('quantity', { precision: 15, scale: 3 }),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }),
  totalNet: numeric('total_net', { precision: 15, scale: 2 }),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),
});

// ---------------------------------------------------------------------------
// priceCorridors
// ---------------------------------------------------------------------------
export const priceCorridors = pgTable('price_corridors', {
  id: serial('id').primaryKey(),
  procurementId: integer('procurement_id')
    .notNull()
    .references(() => procurements.id),
  procurementPositionId: integer('procurement_position_id').references(
    () => procurementPositions.id,
  ),
  minPrice: numeric('min_price', { precision: 15, scale: 2 }),
  maxPrice: numeric('max_price', { precision: 15, scale: 2 }),
  referencePrice: numeric('reference_price', { precision: 15, scale: 2 }),
  source: varchar('source', { length: 100 }), // bki, market, historical
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===========================================================================
// Relations
// ===========================================================================

export const procurementsRelations = relations(
  procurements,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [procurements.projectId],
      references: [projects.id],
    }),
    company: one(companies, {
      fields: [procurements.companyId],
      references: [companies.id],
    }),
    parent: one(procurements, {
      fields: [procurements.parentId],
      references: [procurements.id],
      relationName: 'procurementVersions',
    }),
    versions: many(procurements, { relationName: 'procurementVersions' }),
    client: one(organizations, {
      fields: [procurements.clientId],
      references: [organizations.id],
    }),
    clientContact: one(contacts, {
      fields: [procurements.clientContactId],
      references: [contacts.id],
    }),
    costEstimation: one(costEstimations, {
      fields: [procurements.costEstimationId],
      references: [costEstimations.id],
    }),
    tender: one(tenders, {
      fields: [procurements.tenderId],
      references: [tenders.id],
    }),
    creator: one(users, {
      fields: [procurements.createdBy],
      references: [users.id],
    }),
    groups: many(procurementGroups),
    positions: many(procurementPositions),
    bids: many(bids),
    priceCorridors: many(priceCorridors),
  }),
);

export const procurementGroupsRelations = relations(
  procurementGroups,
  ({ one, many }) => ({
    procurement: one(procurements, {
      fields: [procurementGroups.procurementId],
      references: [procurements.id],
    }),
    parentGroup: one(procurementGroups, {
      fields: [procurementGroups.parentGroupId],
      references: [procurementGroups.id],
      relationName: 'groupHierarchy',
    }),
    childGroups: many(procurementGroups, { relationName: 'groupHierarchy' }),
    positions: many(procurementPositions),
  }),
);

export const procurementPositionsRelations = relations(
  procurementPositions,
  ({ one, many }) => ({
    procurement: one(procurements, {
      fields: [procurementPositions.procurementId],
      references: [procurements.id],
    }),
    group: one(procurementGroups, {
      fields: [procurementPositions.groupId],
      references: [procurementGroups.id],
    }),
    parent: one(procurementPositions, {
      fields: [procurementPositions.parentId],
      references: [procurementPositions.id],
      relationName: 'positionHierarchy',
    }),
    children: many(procurementPositions, {
      relationName: 'positionHierarchy',
    }),
    costPosition: one(costPositions, {
      fields: [procurementPositions.costPositionId],
      references: [costPositions.id],
    }),
    bidPositions: many(bidPositions),
    priceCorridors: many(priceCorridors),
  }),
);

export const bidsRelations = relations(bids, ({ one, many }) => ({
  procurement: one(procurements, {
    fields: [bids.procurementId],
    references: [procurements.id],
  }),
  bidder: one(organizations, {
    fields: [bids.bidderId],
    references: [organizations.id],
  }),
  decider: one(users, {
    fields: [bids.decidedBy],
    references: [users.id],
  }),
  positions: many(bidPositions),
}));

export const bidPositionsRelations = relations(bidPositions, ({ one }) => ({
  bid: one(bids, {
    fields: [bidPositions.bidId],
    references: [bids.id],
  }),
  procurementPosition: one(procurementPositions, {
    fields: [bidPositions.procurementPositionId],
    references: [procurementPositions.id],
  }),
}));

export const priceCorridorsRelations = relations(
  priceCorridors,
  ({ one }) => ({
    procurement: one(procurements, {
      fields: [priceCorridors.procurementId],
      references: [procurements.id],
    }),
    procurementPosition: one(procurementPositions, {
      fields: [priceCorridors.procurementPositionId],
      references: [procurementPositions.id],
    }),
  }),
);
