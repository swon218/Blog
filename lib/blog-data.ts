import { env } from 'cloudflare:workers';
import { ensureSchema } from '@/db/runtime';

export type PostStatus = 'draft' | 'private' | 'public';
export type SubjectVisibility = 'private' | 'public';
export type MediaKind = 'image' | 'video' | 'audio';

export type BlogNode = {
  type: string;
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  attrs?: Record<string, unknown>;
  content?: BlogNode[];
};

export type SubjectRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: SubjectVisibility;
  sortOrder: number;
  postCount: number;
  publicPostCount: number;
  updatedAt: string;
};

export type PostRecord = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  title: string;
  slug: string;
  excerpt: string;
  content: BlogNode;
  status: PostStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type RecordingRecord = {
  id: string;
  postId: string | null;
  postTitle: string | null;
  postSlug: string | null;
  subjectName: string | null;
  originalName: string;
  mimeType: string;
  fileSize: number;
  duration: number | null;
  createdAt: string;
  src: string;
};

type SubjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: SubjectVisibility;
  sortOrder: number;
  postCount: number;
  publicPostCount: number;
  updatedAt: string;
};

type PostRow = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  title: string;
  slug: string;
  excerpt: string;
  contentJson: string;
  status: PostStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

const postSelect = [
  'p.id AS id',
  'p.subject_id AS subjectId',
  's.name AS subjectName',
  's.slug AS subjectSlug',
  'p.title AS title',
  'p.slug AS slug',
  'p.excerpt AS excerpt',
  'p.content_json AS contentJson',
  'p.status AS status',
  'p.sort_order AS sortOrder',
  'p.created_at AS createdAt',
  'p.updated_at AS updatedAt',
  'p.published_at AS publishedAt',
].join(', ');

export async function getPublicCatalog(
  subjectSlug?: string,
  includePrivate = false,
) {
  await ensureSchema();
  const postJoin = includePrivate
    ? 'LEFT JOIN posts p ON p.subject_id = s.id'
    : "LEFT JOIN posts p ON p.subject_id = s.id AND p.status = 'public'";
  const having = includePrivate
    ? ''
    : "HAVING s.visibility = 'public' OR COUNT(p.id) > 0";
  const subjectRows = await env.DB.prepare(
    [
      'SELECT s.id, s.name, s.slug, s.description, s.visibility, s.sort_order AS sortOrder,',
      "COUNT(p.id) AS postCount, SUM(CASE WHEN p.status = 'public' THEN 1 ELSE 0 END) AS publicPostCount,",
      'MAX(COALESCE(p.updated_at, s.updated_at)) AS updatedAt',
      'FROM subjects s',
      postJoin,
      'GROUP BY s.id',
      having,
      'ORDER BY s.sort_order, s.created_at',
    ].join(' '),
  ).all<SubjectRow>();

  const subjects = subjectRows.results.map(normalizeSubject);
  const selected =
    subjects.find((subject) => subject.slug === subjectSlug) ??
    subjects[0] ??
    null;

  const visibilityClause = includePrivate ? '' : "WHERE p.status = 'public'";
  const navigationRows = await env.DB.prepare(
    [
      'SELECT',
      postSelect,
      'FROM posts p JOIN subjects s ON s.id = p.subject_id',
      visibilityClause,
      'ORDER BY s.sort_order, p.sort_order, p.created_at',
    ].join(' '),
  ).all<PostRow>();
  const navigationPosts = navigationRows.results.map(normalizePost);

  if (!selected) {
    return {
      subjects,
      selected: null,
      posts: [] as PostRecord[],
      navigationPosts,
    };
  }

  return {
    subjects,
    selected,
    posts: navigationPosts.filter((post) => post.subjectId === selected.id),
    navigationPosts,
  };
}

export async function getPublicPost(slug: string, includePrivate = false) {
  await ensureSchema();
  const visibilityClause = includePrivate ? '' : "AND p.status = 'public'";
  const row = await env.DB.prepare(
    [
      'SELECT',
      postSelect,
      'FROM posts p JOIN subjects s ON s.id = p.subject_id',
      'WHERE p.slug = ?',
      visibilityClause,
      'LIMIT 1',
    ].join(' '),
  )
    .bind(slug)
    .first<PostRow>();
  return row ? normalizePost(row) : null;
}

export async function getRecordings(postId?: string) {
  await ensureSchema();
  const where = postId
    ? "WHERE m.kind = 'audio' AND m.post_id = ?"
    : "WHERE m.kind = 'audio'";
  const statement = env.DB.prepare(
    [
      'SELECT m.id, m.post_id AS postId, p.title AS postTitle, p.slug AS postSlug,',
      's.name AS subjectName, m.original_name AS originalName, m.mime_type AS mimeType,',
      'm.file_size AS fileSize, m.duration AS duration, m.created_at AS createdAt',
      'FROM media m',
      'LEFT JOIN posts p ON p.id = m.post_id',
      'LEFT JOIN subjects s ON s.id = p.subject_id',
      where,
      'ORDER BY m.created_at DESC',
    ].join(' '),
  );
  const rows = postId
    ? await statement.bind(postId).all<Omit<RecordingRecord, 'src'>>()
    : await statement.all<Omit<RecordingRecord, 'src'>>();
  return rows.results.map((row) => ({
    ...row,
    fileSize: Number(row.fileSize),
    duration: row.duration === null ? null : Number(row.duration),
    src: '/media/' + row.id,
  }));
}

export async function getAdminSnapshot() {
  await ensureSchema();
  const [subjectRows, postRows] = await Promise.all([
    env.DB.prepare(
      [
        'SELECT s.id, s.name, s.slug, s.description, s.visibility, s.sort_order AS sortOrder,',
        "COUNT(p.id) AS postCount, SUM(CASE WHEN p.status = 'public' THEN 1 ELSE 0 END) AS publicPostCount,",
        'MAX(COALESCE(p.updated_at, s.updated_at)) AS updatedAt',
        'FROM subjects s LEFT JOIN posts p ON p.subject_id = s.id',
        'GROUP BY s.id ORDER BY s.sort_order, s.created_at',
      ].join(' '),
    ).all<SubjectRow>(),
    env.DB.prepare(
      [
        'SELECT',
        postSelect,
        'FROM posts p JOIN subjects s ON s.id = p.subject_id',
        'ORDER BY s.sort_order, p.sort_order, p.created_at',
      ].join(' '),
    ).all<PostRow>(),
  ]);

  return {
    subjects: subjectRows.results.map(normalizeSubject),
    posts: postRows.results.map(normalizePost),
  };
}

export async function createSubject(name: string) {
  await ensureSchema();
  const cleanName = name.trim();
  if (!cleanName) throw new Error('과목 이름을 입력해 주세요.');
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(slugify(cleanName), 'subjects');
  const max = await env.DB.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) AS value FROM subjects',
  ).first<{ value: number }>();
  const now = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO subjects (id, name, slug, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, cleanName, slug, '', Number(max?.value ?? -1) + 1, now, now)
    .run();
}

export async function renameSubject(id: string, name: string) {
  await ensureSchema();
  const cleanName = name.trim();
  if (!cleanName) throw new Error('과목 이름을 입력해 주세요.');
  await env.DB.prepare(
    'UPDATE subjects SET name = ?, updated_at = ? WHERE id = ?',
  )
    .bind(cleanName, new Date().toISOString(), id)
    .run();
}

export async function updateSubject(
  id: string,
  name: string,
  description: string,
) {
  await ensureSchema();
  const cleanName = name.trim();
  if (!cleanName) throw new Error('과목 이름을 입력해 주세요.');
  await env.DB.prepare(
    'UPDATE subjects SET name = ?, description = ?, updated_at = ? WHERE id = ?',
  )
    .bind(cleanName, description.trim(), new Date().toISOString(), id)
    .run();
}

export async function setSubjectVisibility(
  id: string,
  visibility: SubjectVisibility,
) {
  await ensureSchema();
  assertVisibility(visibility);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE subjects SET visibility = ?, updated_at = ? WHERE id = ?',
    ).bind(visibility, now, id),
    env.DB.prepare(
      "UPDATE posts SET status = ?, updated_at = ?, published_at = CASE WHEN ? = 'public' THEN COALESCE(published_at, ?) ELSE NULL END WHERE subject_id = ?",
    ).bind(visibility, now, visibility, now, id),
  ]);
  await env.DB.prepare(
    "UPDATE media SET visibility = CASE WHEN kind = 'audio' THEN 'private' WHEN ? = 'public' THEN 'public' ELSE 'private' END WHERE post_id IN (SELECT id FROM posts WHERE subject_id = ?)",
  )
    .bind(visibility, id)
    .run();
}

export async function setPostVisibility(
  id: string,
  visibility: SubjectVisibility,
) {
  await ensureSchema();
  assertVisibility(visibility);
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE posts SET status = ?, updated_at = ?, published_at = CASE WHEN ? = 'public' THEN COALESCE(published_at, ?) ELSE NULL END WHERE id = ?",
    ).bind(visibility, now, visibility, now, id),
    env.DB.prepare(
      "UPDATE media SET visibility = CASE WHEN kind = 'audio' THEN 'private' WHEN ? = 'public' THEN 'public' ELSE 'private' END WHERE post_id = ?",
    ).bind(visibility, id),
  ]);
}

export async function reorderSubjects(ids: string[]) {
  await ensureSchema();
  if (!ids.length) return;
  const now = new Date().toISOString();
  await env.DB.batch(
    ids.map((id, index) =>
      env.DB.prepare(
        'UPDATE subjects SET sort_order = ?, updated_at = ? WHERE id = ?',
      ).bind(index, now, id),
    ),
  );
}

export async function deleteSubject(id: string) {
  await ensureSchema();
  const keys = await env.DB.prepare(
    'SELECT m.object_key AS objectKey FROM media m JOIN posts p ON p.id = m.post_id WHERE p.subject_id = ?',
  )
    .bind(id)
    .all<{ objectKey: string }>();
  if (keys.results.length) {
    await env.FILES.delete(keys.results.map((item) => item.objectKey));
  }
  await env.DB.prepare('DELETE FROM subjects WHERE id = ?').bind(id).run();
}

type SavePostInput = {
  id?: string;
  subjectId: string;
  title: string;
  excerpt: string;
  content: BlogNode;
  status: PostStatus;
};

export async function savePost(input: SavePostInput) {
  await ensureSchema();
  const title = input.title.trim();
  if (!title) throw new Error('게시글 제목을 입력해 주세요.');
  if (!['draft', 'private', 'public'].includes(input.status)) {
    throw new Error('올바르지 않은 공개 상태입니다.');
  }

  const now = new Date().toISOString();
  const contentJson = JSON.stringify(input.content);
  const excerpt = input.excerpt.trim();
  let postId = input.id;

  if (postId) {
    const current = await env.DB.prepare(
      'SELECT slug, published_at AS publishedAt FROM posts WHERE id = ?',
    )
      .bind(postId)
      .first<{ slug: string; publishedAt: string | null }>();
    if (!current) throw new Error('게시글을 찾을 수 없습니다.');
    await env.DB.prepare(
      'UPDATE posts SET subject_id = ?, title = ?, excerpt = ?, content_json = ?, status = ?, updated_at = ?, published_at = ? WHERE id = ?',
    )
      .bind(
        input.subjectId,
        title,
        excerpt,
        contentJson,
        input.status,
        now,
        input.status === 'public' ? (current.publishedAt ?? now) : null,
        postId,
      )
      .run();
  } else {
    postId = crypto.randomUUID();
    const slug = await uniqueSlug(slugify(title), 'posts');
    const max = await env.DB.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) AS value FROM posts WHERE subject_id = ?',
    )
      .bind(input.subjectId)
      .first<{ value: number }>();
    await env.DB.prepare(
      'INSERT INTO posts (id, subject_id, title, slug, excerpt, content_json, status, sort_order, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        postId,
        input.subjectId,
        title,
        slug,
        excerpt,
        contentJson,
        input.status,
        Number(max?.value ?? -1) + 1,
        now,
        now,
        input.status === 'public' ? now : null,
      )
      .run();
  }

  await linkMedia(postId, input.content, input.status);
  return postId;
}

export async function reorderPosts(subjectId: string, ids: string[]) {
  await ensureSchema();
  if (!ids.length) return;
  const now = new Date().toISOString();
  await env.DB.batch(
    ids.map((id, index) =>
      env.DB.prepare(
        'UPDATE posts SET sort_order = ?, subject_id = ?, updated_at = ? WHERE id = ?',
      ).bind(index, subjectId, now, id),
    ),
  );
}

export async function deletePost(id: string) {
  await ensureSchema();
  const keys = await env.DB.prepare(
    'SELECT object_key AS objectKey FROM media WHERE post_id = ?',
  )
    .bind(id)
    .all<{ objectKey: string }>();
  if (keys.results.length) {
    await env.FILES.delete(keys.results.map((item) => item.objectKey));
  }
  await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
}

async function linkMedia(
  postId: string,
  document: BlogNode,
  status: PostStatus,
) {
  const ids = new Set<string>();
  walk(document, (node) => {
    const id = node.attrs?.mediaId;
    if (typeof id === 'string') ids.add(id);
  });
  await env.DB.prepare('UPDATE media SET post_id = NULL WHERE post_id = ?')
    .bind(postId)
    .run();
  if (!ids.size) return;
  await env.DB.batch(
    [...ids].map((id) =>
      env.DB.prepare(
        "UPDATE media SET post_id = ?, visibility = CASE WHEN kind = 'audio' THEN 'private' WHEN ? = 'public' THEN 'public' ELSE 'private' END WHERE id = ?",
      ).bind(postId, status, id),
    ),
  );
}

function walk(node: BlogNode, visit: (node: BlogNode) => void) {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

async function uniqueSlug(base: string, table: 'subjects' | 'posts') {
  const safeBase = base || 'note';
  let candidate = safeBase;
  let suffix = 2;
  while (
    await env.DB.prepare('SELECT 1 FROM ' + table + ' WHERE slug = ? LIMIT 1')
      .bind(candidate)
      .first()
  ) {
    candidate = safeBase + '-' + suffix;
    suffix += 1;
  }
  return candidate;
}

function slugify(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSubject(row: SubjectRow): SubjectRecord {
  return {
    ...row,
    sortOrder: Number(row.sortOrder),
    postCount: Number(row.postCount),
    publicPostCount: Number(row.publicPostCount ?? 0),
  };
}

function assertVisibility(
  visibility: SubjectVisibility,
): asserts visibility is SubjectVisibility {
  if (!['private', 'public'].includes(visibility)) {
    throw new Error('올바르지 않은 공개 상태입니다.');
  }
}

function normalizePost(row: PostRow): PostRecord {
  let content: BlogNode;
  try {
    content = JSON.parse(row.contentJson) as BlogNode;
  } catch {
    content = { type: 'doc', content: [{ type: 'paragraph' }] };
  }
  return {
    ...row,
    sortOrder: Number(row.sortOrder),
    content,
  };
}
