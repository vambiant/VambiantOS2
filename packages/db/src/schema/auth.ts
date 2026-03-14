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

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    ulid: varchar('ulid', { length: 26 }).unique().notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    avatarPath: varchar('avatar_path', { length: 500 }),
    locale: varchar('locale', { length: 10 }).default('de'),
    timezone: varchar('timezone', { length: 50 }).default('Europe/Berlin'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    settings: jsonb('settings').default({}),
    rememberToken: varchar('remember_token', { length: 100 }),
    currentCompanyId: integer('current_company_id').references(
      () => companies.id,
    ),
    isSuperAdmin: boolean('is_super_admin').default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    uniqueIndex('users_ulid_idx').on(table.ulid),
  ],
);

// ---------------------------------------------------------------------------
// companies
// ---------------------------------------------------------------------------
export const companies = pgTable(
  'companies',
  {
    id: serial('id').primaryKey(),
    ulid: varchar('ulid', { length: 26 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    legalForm: varchar('legal_form', { length: 50 }),
    taxId: varchar('tax_id', { length: 50 }),
    vatId: varchar('vat_id', { length: 50 }),
    address: jsonb('address'),
    contact: jsonb('contact'),
    logoPath: varchar('logo_path', { length: 500 }),
    domain: varchar('domain', { length: 255 }).unique(),
    settings: jsonb('settings').default({}),
    billingConfig: jsonb('billing_config').default({}),
    offerNumberPattern: varchar('offer_number_pattern', { length: 100 }).default(
      '{YEAR}-{NUM}',
    ),
    approved: boolean('approved').default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('companies_ulid_idx').on(table.ulid),
    uniqueIndex('companies_domain_idx').on(table.domain),
  ],
);

// ---------------------------------------------------------------------------
// roles
// ---------------------------------------------------------------------------
export const roles = pgTable(
  'roles',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    permissions: jsonb('permissions').notNull().default([]),
    isSystem: boolean('is_system').default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('roles_company_slug_idx').on(table.companyId, table.slug),
  ],
);

// ---------------------------------------------------------------------------
// companyUser (pivot)
// ---------------------------------------------------------------------------
export const companyUser = pgTable(
  'company_user',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    roleId: integer('role_id').references(() => roles.id),
    financialSettings: jsonb('financial_settings'),
    yearlySalary: numeric('yearly_salary', { precision: 12, scale: 2 }),
    defaultWorkHoursPerDay: numeric('default_work_hours_per_day', {
      precision: 4,
      scale: 2,
    }).default('8'),
    vacationDaysPerYear: integer('vacation_days_per_year').default(30),
    remainingVacationDays: integer('remaining_vacation_days').default(30),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('company_user_company_user_idx').on(
      table.companyId,
      table.userId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// companyInvitations
// ---------------------------------------------------------------------------
export const companyInvitations = pgTable(
  'company_invitations',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    email: varchar('email', { length: 255 }).notNull(),
    roleId: integer('role_id').references(() => roles.id),
    token: varchar('token', { length: 100 }).unique().notNull(),
    invitedBy: integer('invited_by')
      .notNull()
      .references(() => users.id),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('company_invitations_token_idx').on(table.token),
    index('company_invitations_company_idx').on(table.companyId),
  ],
);

// ---------------------------------------------------------------------------
// userCompetencies
// ---------------------------------------------------------------------------
export const userCompetencies = pgTable(
  'user_competencies',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    competencyType: varchar('competency_type', { length: 30 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    tradeCode: varchar('trade_code', { length: 20 }),
    proficiencyLevel: smallint('proficiency_level'),
    certifiedAt: date('certified_at'),
    expiresAt: date('expires_at'),
    issuingBody: varchar('issuing_body', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('user_competencies_user_idx').on(table.userId),
    index('user_competencies_company_idx').on(table.companyId),
  ],
);

// ---------------------------------------------------------------------------
// apiUsageLogs
// ---------------------------------------------------------------------------
export const apiUsageLogs = pgTable(
  'api_usage_logs',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    userId: integer('user_id').references(() => users.id),
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    method: varchar('method', { length: 10 }).notNull(),
    statusCode: smallint('status_code'),
    requestMeta: jsonb('request_meta'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('api_usage_logs_company_idx').on(table.companyId),
    index('api_usage_logs_created_at_idx').on(table.createdAt),
  ],
);

// ===========================================================================
// Relations
// ===========================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  currentCompany: one(companies, {
    fields: [users.currentCompanyId],
    references: [companies.id],
  }),
  companyMemberships: many(companyUser),
  competencies: many(userCompetencies),
  apiUsageLogs: many(apiUsageLogs),
  sentInvitations: many(companyInvitations),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(companyUser),
  roles: many(roles),
  invitations: many(companyInvitations),
  competencies: many(userCompetencies),
  apiUsageLogs: many(apiUsageLogs),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  company: one(companies, {
    fields: [roles.companyId],
    references: [companies.id],
  }),
  companyUsers: many(companyUser),
}));

export const companyUserRelations = relations(companyUser, ({ one }) => ({
  company: one(companies, {
    fields: [companyUser.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [companyUser.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [companyUser.roleId],
    references: [roles.id],
  }),
}));

export const companyInvitationsRelations = relations(
  companyInvitations,
  ({ one }) => ({
    company: one(companies, {
      fields: [companyInvitations.companyId],
      references: [companies.id],
    }),
    role: one(roles, {
      fields: [companyInvitations.roleId],
      references: [roles.id],
    }),
    inviter: one(users, {
      fields: [companyInvitations.invitedBy],
      references: [users.id],
    }),
  }),
);

export const userCompetenciesRelations = relations(
  userCompetencies,
  ({ one }) => ({
    user: one(users, {
      fields: [userCompetencies.userId],
      references: [users.id],
    }),
    company: one(companies, {
      fields: [userCompetencies.companyId],
      references: [companies.id],
    }),
  }),
);

export const apiUsageLogsRelations = relations(apiUsageLogs, ({ one }) => ({
  company: one(companies, {
    fields: [apiUsageLogs.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [apiUsageLogs.userId],
    references: [users.id],
  }),
}));
