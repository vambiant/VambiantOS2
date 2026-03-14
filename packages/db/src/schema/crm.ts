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

// ---------------------------------------------------------------------------
// organizations (unified clients + contractors + partners)
// ---------------------------------------------------------------------------
export const organizations = pgTable(
  'organizations',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    type: varchar('type', { length: 30 }).notNull(), // client | contractor | partner
    name: varchar('name', { length: 255 }).notNull(),
    legalForm: varchar('legal_form', { length: 50 }),
    taxId: varchar('tax_id', { length: 50 }),
    vatId: varchar('vat_id', { length: 50 }),
    address: jsonb('address'), // {street, streetNumber, city, zip, country, state}
    contact: jsonb('contact'), // {phone, fax, email, website}
    classification: jsonb('classification'), // {industry, size, priority, segment, tags}
    financial: jsonb('financial'), // {creditRating, paymentTerms, defaultCurrency, taxExempt, discountPercentage, iban, bic, bankName}
    notes: text('notes'),
    status: varchar('status', { length: 30 }).default('active'),
    clientNumber: varchar('client_number', { length: 50 }),
    creditorNumber: varchar('creditor_number', { length: 50 }),
    debitorId: varchar('debitor_id', { length: 50 }),
    responsibleUserId: integer('responsible_user_id').references(() => users.id),
    metadata: jsonb('metadata').default({}),
    lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('organizations_company_type_idx').on(table.companyId, table.type),
    uniqueIndex('organizations_company_client_number_idx')
      .on(table.companyId, table.clientNumber)
      .where(sql`client_number IS NOT NULL`),
  ],
);

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  company: one(companies, {
    fields: [organizations.companyId],
    references: [companies.id],
  }),
  responsibleUser: one(users, {
    fields: [organizations.responsibleUserId],
    references: [users.id],
  }),
  contacts: many(contacts),
  trades: many(organizationTrades),
  crmActivities: many(crmActivities),
  references: many(references),
}));

// ---------------------------------------------------------------------------
// contacts
// ---------------------------------------------------------------------------
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  organizationId: integer('organization_id').references(() => organizations.id),
  salutation: varchar('salutation', { length: 20 }),
  title: varchar('title', { length: 50 }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  mobile: varchar('mobile', { length: 50 }),
  position: varchar('position', { length: 100 }),
  department: varchar('department', { length: 100 }),
  isPrimary: boolean('is_primary').default(false),
  useOrgAddress: boolean('use_org_address').default(true),
  address: jsonb('address'),
  notes: text('notes'),
  tags: jsonb('tags').default([]),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  crmActivities: many(crmActivities),
}));

// ---------------------------------------------------------------------------
// organizationTrades
// ---------------------------------------------------------------------------
export const organizationTrades = pgTable(
  'organization_trades',
  {
    id: serial('id').primaryKey(),
    organizationId: integer('organization_id')
      .notNull()
      .references(() => organizations.id),
    tradeCode: varchar('trade_code', { length: 20 }).notNull(),
    tradeName: varchar('trade_name', { length: 255 }).notNull(),
    metadata: jsonb('metadata').default({}),
  },
  (table) => [
    uniqueIndex('organization_trades_org_code_idx').on(
      table.organizationId,
      table.tradeCode,
    ),
  ],
);

export const organizationTradesRelations = relations(organizationTrades, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationTrades.organizationId],
    references: [organizations.id],
  }),
}));

// ---------------------------------------------------------------------------
// crmActivities
// ---------------------------------------------------------------------------
export const crmActivities = pgTable('crm_activities', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  organizationId: integer('organization_id').references(() => organizations.id),
  contactId: integer('contact_id').references(() => contacts.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  activityType: varchar('activity_type', { length: 30 }).notNull(), // call | email | meeting | note | task
  subject: varchar('subject', { length: 500 }),
  description: text('description'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const crmActivitiesRelations = relations(crmActivities, ({ one }) => ({
  company: one(companies, {
    fields: [crmActivities.companyId],
    references: [companies.id],
  }),
  organization: one(organizations, {
    fields: [crmActivities.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [crmActivities.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [crmActivities.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// references (portfolio)
// ---------------------------------------------------------------------------
export const references = pgTable('references', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id),
  organizationId: integer('organization_id').references(() => organizations.id),
  projectId: integer('project_id').references(() => projects.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  projectValue: numeric('project_value', { precision: 15, scale: 2 }),
  completionDate: date('completion_date'),
  location: jsonb('location'), // {city, state, country}
  buildingType: varchar('building_type', { length: 100 }),
  buildingTypeL2: varchar('building_type_l2', { length: 100 }),
  teamSize: integer('team_size'),
  trades: jsonb('trades').default([]), // array of trade codes
  activities: jsonb('activities').default([]), // [{description, date, outcome}]
  packages: jsonb('packages').default([]), // [{name, scope, value}]
  images: jsonb('images').default([]),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const referencesRelations = relations(references, ({ one }) => ({
  company: one(companies, {
    fields: [references.companyId],
    references: [companies.id],
  }),
  organization: one(organizations, {
    fields: [references.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [references.projectId],
    references: [projects.id],
  }),
}));
