import { env } from 'cloudflare:workers';

let ready: Promise<void> | null = null;

const emptyDoc = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '이곳에 공부한 내용을 기록해 보세요.' }],
    },
  ],
});

const sampleDoc = JSON.stringify({
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '오늘의 핵심' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'C 프로그램은 ' },
        { type: 'text', marks: [{ type: 'code' }], text: 'main' },
        {
          type: 'text',
          text: ' 함수에서 시작합니다. 소스 코드는 전처리, 컴파일, 어셈블, 링크 단계를 거쳐 실행 파일이 됩니다.',
        },
      ],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '코드를 외우기보다 빌드 과정에서 각 도구가 무엇을 만드는지 이해하는 것이 중요하다.',
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: '직접 확인한 것' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'gcc로 소스 파일을 컴파일했다.' },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '반환값 0은 프로그램이 정상 종료되었다는 뜻이다.',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

const subjectsSql = [
  'CREATE TABLE IF NOT EXISTS subjects (',
  'id TEXT PRIMARY KEY,',
  'name TEXT NOT NULL,',
  'slug TEXT NOT NULL UNIQUE,',
  "description TEXT NOT NULL DEFAULT '',",
  "visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'public')),",
  'sort_order INTEGER NOT NULL DEFAULT 0,',
  'created_at TEXT NOT NULL,',
  'updated_at TEXT NOT NULL',
  ')',
].join(' ');

const postsSql = [
  'CREATE TABLE IF NOT EXISTS posts (',
  'id TEXT PRIMARY KEY,',
  'subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,',
  'title TEXT NOT NULL,',
  'slug TEXT NOT NULL UNIQUE,',
  "excerpt TEXT NOT NULL DEFAULT '',",
  'content_json TEXT NOT NULL,',
  "status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'private', 'public')),",
  'sort_order INTEGER NOT NULL DEFAULT 0,',
  'created_at TEXT NOT NULL,',
  'updated_at TEXT NOT NULL,',
  'published_at TEXT',
  ')',
].join(' ');

const mediaSql = [
  'CREATE TABLE IF NOT EXISTS media (',
  'id TEXT PRIMARY KEY,',
  'post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,',
  'object_key TEXT NOT NULL UNIQUE,',
  "kind TEXT NOT NULL CHECK(kind IN ('image', 'video', 'audio')),",
  'original_name TEXT NOT NULL,',
  'mime_type TEXT NOT NULL,',
  'file_size INTEGER NOT NULL,',
  'duration INTEGER,',
  "visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'public')),",
  'created_at TEXT NOT NULL',
  ')',
].join(' ');

export async function ensureSchema() {
  if (!ready) {
    ready = initialize().catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}

async function initialize() {
  const db = env.DB;
  await db.batch([
    db.prepare(subjectsSql),
    db.prepare(postsSql),
    db.prepare(mediaSql),
    db.prepare(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_slug ON subjects(slug)',
    ),
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_subjects_sort_order ON subjects(sort_order)',
    ),
    db.prepare(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug)',
    ),
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_posts_subject_sort ON posts(subject_id, sort_order)',
    ),
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_posts_public_subject_sort ON posts(status, subject_id, sort_order)',
    ),
    db.prepare(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_media_object_key ON media(object_key)',
    ),
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_media_post_id ON media(post_id)',
    ),
  ]);

  const subjectColumns = await db
    .prepare('PRAGMA table_info(subjects)')
    .all<{ name: string }>();
  if (!subjectColumns.results.some((column) => column.name === 'visibility')) {
    await db
      .prepare(
        "ALTER TABLE subjects ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'public'))",
      )
      .run();
  }

  const count = await db
    .prepare('SELECT COUNT(*) AS count FROM subjects')
    .first<{ count: number }>();

  if (Number(count?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    await db.batch([
      db
        .prepare(
          'INSERT INTO subjects (id, name, slug, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'subject-c',
          'C 언어',
          'c-language',
          '기초 문법부터 포인터와 메모리 구조까지 차근차근 기록합니다.',
          0,
          now,
          now,
        ),
      db
        .prepare(
          'INSERT INTO subjects (id, name, slug, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'subject-linux',
          '리눅스',
          'linux',
          '명령어와 운영체제의 동작 원리를 실습 중심으로 정리합니다.',
          1,
          now,
          now,
        ),
      db
        .prepare(
          'INSERT INTO subjects (id, name, slug, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'subject-ds',
          '자료구조',
          'data-structures',
          'C로 구현하며 자료구조의 원리를 이해합니다.',
          2,
          now,
          now,
        ),
      db
        .prepare(
          'INSERT INTO posts (id, subject_id, title, slug, excerpt, content_json, status, sort_order, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'post-first-c',
          'subject-c',
          '개발 환경과 첫 번째 프로그램',
          'first-c-program',
          '컴파일 과정과 main 함수의 역할을 정리하고 직접 실행해 본 기록',
          sampleDoc,
          'public',
          0,
          now,
          now,
          now,
        ),
      db
        .prepare(
          'INSERT INTO posts (id, subject_id, title, slug, excerpt, content_json, status, sort_order, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'post-data-types',
          'subject-c',
          '변수와 자료형 이해하기',
          'c-data-types',
          '정수형과 실수형의 차이, 메모리 크기와 표현 범위를 정리했습니다.',
          emptyDoc,
          'public',
          1,
          now,
          now,
          now,
        ),
      db
        .prepare(
          'INSERT INTO posts (id, subject_id, title, slug, excerpt, content_json, status, sort_order, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'post-linux-shell',
          'subject-linux',
          '셸과 첫 번째 명령어',
          'linux-first-shell',
          '터미널을 열고 현재 위치와 파일 목록을 확인해 본 첫 실습입니다.',
          emptyDoc,
          'public',
          0,
          now,
          now,
          now,
        ),
    ]);
    await db.prepare('PRAGMA optimize').run();
  }
}
