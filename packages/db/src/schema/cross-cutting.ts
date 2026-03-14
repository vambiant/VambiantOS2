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
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, companies } from './auth';

// ---------------------------------------------------------------------------
// comments (polymorphic, threaded)
// ---------------------------------------------------------------------------
export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: integer('entity_id').notNull(),
    parentCommentId: integer('parent_comment_id'),
    body: text('body').notNull(),
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
    index('comments_entity_idx').on(table.entityType, table.entityId),
    index('comments_user_idx').on(table.userId),
    index('comments_parent_idx').on(table.parentCommentId),
  ],
);

// Self-referencing FK added after table definition to avoid circular ref
// Drizzle handles this via the references callback
// We re-declare the self-reference in relations below.

// ---------------------------------------------------------------------------
// tags
// ---------------------------------------------------------------------------
export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 20 }),
  },
  (table) => [
    uniqueIndex('tags_company_name_idx').on(table.companyId, table.name),
  ],
);

// ---------------------------------------------------------------------------
// taggables (polymorphic pivot)
// ---------------------------------------------------------------------------
export const taggables = pgTable(
  'taggables',
  {
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id),
    taggableType: varchar('taggable_type', { length: 50 }).notNull(),
    taggableId: integer('taggable_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tagId, table.taggableType, table.taggableId] }),
    index('taggables_entity_idx').on(table.taggableType, table.taggableId),
  ],
);

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 500 }),
    body: text('body'),
    data: jsonb('data').default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('notifications_user_read_idx').on(table.userId, table.readAt),
  ],
);

// ---------------------------------------------------------------------------
// media (file attachments, polymorphic)
// ---------------------------------------------------------------------------
export const media = pgTable(
  'media',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id').references(() => companies.id),
    uploadedBy: integer('uploaded_by').references(() => users.id),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: integer('entity_id'),
    collectionName: varchar('collection_name', { length: 100 }),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }),
    size: integer('size').notNull(),
    disk: varchar('disk', { length: 50 }).default('local'),
    path: varchar('path', { length: 500 }).notNull(),
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
    index('media_entity_idx').on(table.entityType, table.entityId),
    index('media_company_idx').on(table.companyId),
    index('media_uploaded_by_idx').on(table.uploadedBy),
  ],
);

// ---------------------------------------------------------------------------
// fileCategories
// ---------------------------------------------------------------------------
export const fileCategories = pgTable(
  'file_categories',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    icon: varchar('icon', { length: 50 }),
    color: varchar('color', { length: 20 }),
    description: text('description'),
    sortOrder: smallint('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('file_categories_slug_idx').on(table.slug)],
);

// ===========================================================================
// Relations
// ===========================================================================

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
    relationName: 'commentThread',
  }),
  replies: many(comments, {
    relationName: 'commentThread',
  }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  company: one(companies, {
    fields: [tags.companyId],
    references: [companies.id],
  }),
  taggables: many(taggables),
}));

export const taggablesRelations = relations(taggables, ({ one }) => ({
  tag: one(tags, {
    fields: [taggables.tagId],
    references: [tags.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  company: one(companies, {
    fields: [media.companyId],
    references: [companies.id],
  }),
  uploader: one(users, {
    fields: [media.uploadedBy],
    references: [users.id],
  }),
}));
