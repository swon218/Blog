import Link from 'next/link';
import { chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { BlogShell } from '@/components/blog-shell';
import { SubjectActions } from '@/components/subject-actions';
import { VisibilityControl } from '@/components/visibility-controls';
import { getPublicCatalog } from '@/lib/blog-data';
import { getOptionalOwner } from '@/lib/owner-auth';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; q?: string }>;
}) {
  const query = await searchParams;
  const owner = await getOptionalOwner();
  const catalog = await getPublicCatalog(query.subject, Boolean(owner));
  const search = query.q?.trim().toLowerCase() ?? '';
  const visiblePosts = search
    ? catalog.posts.filter(
        (post) =>
          post.title.toLowerCase().includes(search) ||
          post.excerpt.toLowerCase().includes(search),
      )
    : catalog.posts;

  return (
    <BlogShell
      subjects={catalog.subjects}
      posts={catalog.navigationPosts}
      activeSubjectId={catalog.selected?.id}
      isOwner={Boolean(owner)}
      ownerSignOutPath={owner ? chatGPTSignOutPath('/') : undefined}
      search={query.q}
    >
      <section className="px-5 py-7 sm:px-8 lg:px-12 lg:py-9 xl:px-16">
        <div className="mx-auto max-w-5xl">
          {catalog.selected ? (
            <>
              <div className="mb-9 flex flex-col justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-sky-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />{' '}
                    공부 기록
                  </div>
                  <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                    {catalog.selected.name}
                  </h1>
                  <p className="mt-3 min-h-6 max-w-xl text-sm leading-6 text-muted-foreground">
                    {catalog.selected.description || '\u00a0'}
                  </p>
                </div>
                {owner && <SubjectActions subject={catalog.selected} />}
              </div>

              <div className="grid gap-4">
                {visiblePosts.map((post, index) => (
                  <article
                    key={post.id}
                    className="group grid gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:items-center sm:p-6"
                  >
                    <span className="font-mono text-xl font-semibold text-primary/30">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Link
                      href={'/posts/' + encodeURIComponent(post.slug)}
                      className="min-w-0"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-sky-950 dark:text-sky-300">
                          {post.subjectName}
                        </span>
                        {owner && post.status !== 'public' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {post.status === 'draft' ? '초안' : '비공개'}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(post.publishedAt ?? post.updatedAt)}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold tracking-[-0.025em] sm:text-xl">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {post.excerpt}
                        </p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      {owner && (
                        <VisibilityControl
                          key={`${post.id}-${post.status}`}
                          id={post.id}
                          kind="post"
                          visibility={
                            post.status === 'public' ? 'public' : 'private'
                          }
                          compact
                        />
                      )}
                      <Link
                        href={'/posts/' + encodeURIComponent(post.slug)}
                        aria-label={post.title + ' 읽기'}
                        className="grid size-10 place-items-center rounded-full border border-border bg-background text-muted-foreground transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </article>
                ))}
                {!visiblePosts.length && (
                  <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
                    <Search className="mx-auto mb-3 size-6 text-muted-foreground" />
                    <p className="font-bold">
                      {search
                        ? '일치하는 공부 기록이 없습니다.'
                        : '아직 작성된 공부 기록이 없습니다.'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {owner
                        ? '위의 파일 생성 버튼으로 첫 글을 작성해 보세요.'
                        : '새로운 공부 기록을 준비하고 있습니다.'}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-20 text-center">
              <BookOpen className="mx-auto mb-4 size-8 text-muted-foreground" />
              <h1 className="text-xl font-bold">아직 게시글이 없습니다.</h1>
            </div>
          )}
        </div>
      </section>
    </BlogShell>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
