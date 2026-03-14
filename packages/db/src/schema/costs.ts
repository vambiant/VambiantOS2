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
import { companies } from './auth';
import { projects } from './projects';

// ---------------------------------------------------------------------------
// costEstimations
// ---------------------------------------------------------------------------
export const costEstimations = pgTable(
  'cost_estimations',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id),
    name: varchar('name', { length: 255 }).notNull(),
    estimationType: varchar('estimation_type', { length: 30 }).notNull(), // kostenschaetzung, kostenberechnung, kostenanschlag, kostenfeststellung
    din276Level: smallint('din276_level').default(2),
    status: varchar('status', { length: 30 }).default('draft'),
    baseDate: date('base_date'),
    totalNet: numeric('total_net', { precision: 15, scale: 2 }),
    totalGross: numeric('total_gross', { precision: 15, scale: 2 }),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).default('19.0'),
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
    index('cost_estimations_project_type_idx').on(
      table.projectId,
      table.estimationType,
    ),
  ],
);

// ---------------------------------------------------------------------------
// costPositions (hierarchical DIN 276)
// ---------------------------------------------------------------------------
export const costPositions = pgTable(
  'cost_positions',
  {
    id: serial('id').primaryKey(),
    estimationId: integer('estimation_id')
      .notNull()
      .references(() => costEstimations.id),
    parentId: integer('parent_id').references((): any => costPositions.id),
    costGroupCode: varchar('cost_group_code', { length: 10 }).notNull(), // DIN 276 code: 300, 340, 345
    level: smallint('level').notNull(),
    shortText: varchar('short_text', { length: 500 }),
    longText: text('long_text'),
    workPackageCode: varchar('work_package_code', { length: 20 }),
    workPackageName: varchar('work_package_name', { length: 255 }),
    quantity: numeric('quantity', { precision: 15, scale: 3 }),
    unit: varchar('unit', { length: 30 }),
    unitPrice: numeric('unit_price', { precision: 15, scale: 2 }),
    totalNet: numeric('total_net', { precision: 15, scale: 2 }),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }),
    totalGross: numeric('total_gross', { precision: 15, scale: 2 }),
    sortOrder: smallint('sort_order').default(0),
    isCustom: boolean('is_custom').default(false),
    isOptional: boolean('is_optional').default(false),
    isGroup: boolean('is_group').default(false),
    color: varchar('color', { length: 20 }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cost_positions_estimation_code_idx').on(
      table.estimationId,
      table.costGroupCode,
    ),
    index('cost_positions_estimation_parent_idx').on(
      table.estimationId,
      table.parentId,
    ),
    index('cost_positions_estimation_sort_idx').on(
      table.estimationId,
      table.sortOrder,
    ),
  ],
);

// ---------------------------------------------------------------------------
// costFrameworks
// ---------------------------------------------------------------------------
export const costFrameworks = pgTable('cost_frameworks', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  frameworkType: varchar('framework_type', { length: 30 }).notNull(), // din276, custom
  year: smallint('year'),
  description: text('description'),
  structure: jsonb('structure').notNull(), // the full cost group hierarchy
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// kalkulationen
// ---------------------------------------------------------------------------
export const kalkulationen = pgTable('kalkulationen', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  procurementId: integer('procurement_id'), // FK added at app level to avoid circular import with procurement.ts
  name: varchar('name', { length: 255 }).notNull(),
  status: varchar('status', { length: 30 }).default('draft'),
  phaseEntries: jsonb('phase_entries').default([]), // [{phase, hours, hourlyRate, total, staffAssignments}]
  costRates: jsonb('cost_rates').default({}), // {internalRate, externalRate, overheadFactor, profitMargin}
  externalCosts: jsonb('external_costs').default([]), // [{description, vendor, amount, category}]
  totalInternal: numeric('total_internal', { precision: 15, scale: 2 }),
  totalExternal: numeric('total_external', { precision: 15, scale: 2 }),
  total: numeric('total', { precision: 15, scale: 2 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// vatRates
// ---------------------------------------------------------------------------
export const vatRates = pgTable('vat_rates', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  name: varchar('name', { length: 100 }).notNull(),
  rate: numeric('rate', { precision: 5, scale: 2 }).notNull(),
  isDefault: boolean('is_default').default(false),
  validFrom: date('valid_from'),
  validUntil: date('valid_until'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===========================================================================
// Relations
// ===========================================================================

export const costEstimationsRelations = relations(
  costEstimations,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [costEstimations.projectId],
      references: [projects.id],
    }),
    positions: many(costPositions),
  }),
);

export const costPositionsRelations = relations(
  costPositions,
  ({ one, many }) => ({
    estimation: one(costEstimations, {
      fields: [costPositions.estimationId],
      references: [costEstimations.id],
    }),
    parent: one(costPositions, {
      fields: [costPositions.parentId],
      references: [costPositions.id],
      relationName: 'costPositionHierarchy',
    }),
    children: many(costPositions, { relationName: 'costPositionHierarchy' }),
  }),
);

export const costFrameworksRelations = relations(
  costFrameworks,
  ({ one }) => ({
    company: one(companies, {
      fields: [costFrameworks.companyId],
      references: [companies.id],
    }),
  }),
);

export const kalkulationenRelations = relations(kalkulationen, ({ one }) => ({
  project: one(projects, {
    fields: [kalkulationen.projectId],
    references: [projects.id],
  }),
}));

export const vatRatesRelations = relations(vatRates, ({ one }) => ({
  company: one(companies, {
    fields: [vatRates.companyId],
    references: [companies.id],
  }),
}));
