import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const subjects = sqliteTable(
  'subjects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull().default(''),
    visibility: text('visibility', { enum: ['private', 'public'] })
      .notNull()
      .default('private'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_subjects_slug').on(table.slug),
    index('idx_subjects_sort_order').on(table.sortOrder),
  ],
);

export const posts = sqliteTable(
  'posts',
  {
    id: text('id').primaryKey(),
    subjectId: text('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt').notNull().default(''),
    contentJson: text('content_json').notNull(),
    status: text('status', { enum: ['draft', 'private', 'public'] })
      .notNull()
      .default('draft'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    publishedAt: text('published_at'),
  },
  (table) => [
    uniqueIndex('idx_posts_slug').on(table.slug),
    index('idx_posts_subject_sort').on(table.subjectId, table.sortOrder),
    index('idx_posts_public_subject_sort').on(
      table.status,
      table.subjectId,
      table.sortOrder,
    ),
  ],
);

export const media = sqliteTable(
  'media',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').references(() => posts.id, {
      onDelete: 'set null',
    }),
    objectKey: text('object_key').notNull(),
    kind: text('kind', { enum: ['image', 'video', 'audio'] }).notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    duration: integer('duration'),
    visibility: text('visibility', { enum: ['private', 'public'] })
      .notNull()
      .default('private'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_media_object_key').on(table.objectKey),
    index('idx_media_post_id').on(table.postId),
  ],
);
