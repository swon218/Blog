import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, CalendarDays, Pencil } from 'lucide-react';
import { notFound } from 'next/navigation';
import { chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { BlogShell } from '@/components/blog-shell';
import { ContentRenderer } from '@/components/content-renderer';
import { PostAttachmentsDialog } from '@/components/post-attachments-dialog';
import { getPublicCatalog, getPublicPost } from '@/lib/blog-data';
import { getOptionalOwner } from '@/lib/owner-auth';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPost(decodeURIComponent(slug));
  if (!post) return { title: '게시글을 찾을 수 없습니다' };
  return { title: post.title + ' | Blog', description: post.excerpt };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const owner = await getOptionalOwner();
  const post = await getPublicPost(decodeURIComponent(slug), Boolean(owner));
  if (!post) notFound();
  const catalog = await getPublicCatalog(post.subjectSlug, Boolean(owner));

  return (
    <BlogShell
      subjects={catalog.subjects}
      posts={catalog.navigationPosts}
      activeSubjectId={post.subjectId}
      activePostId={post.id}
      isOwner={Boolean(owner)}
      ownerSignOutPath={owner ? chatGPTSignOutPath('/') : undefined}
    >
      <article className="px-5 py-10 sm:px-8 lg:px-14 lg:py-14 xl:px-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 border-b border-border pb-9">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-700 dark:text-sky-400">
                <BookOpen className="size-3.5" /> {post.subjectName}
                {owner && post.status !== 'public' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {post.status === 'draft' ? '초안' : '비공개'}
                  </span>
                )}
              </div>
              {owner && (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={
                      '/admin?subject=' +
                      encodeURIComponent(post.subjectId) +
                      '&post=' +
                      encodeURIComponent(post.id)
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 font-semibold text-primary-foreground transition hover:bg-primary/85"
                  >
                    <Pencil className="size-3.5" /> 게시물 수정
                  </Link>
                  <PostAttachmentsDialog
                    document={post.content}
                    canAccessPrivate
                  />
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                {post.excerpt}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-3.5" />
                {formatDate(post.publishedAt ?? post.updatedAt)}
              </span>
            </div>
          </div>
          <ContentRenderer
            document={post.content}
            canAccessPrivate={Boolean(owner)}
          />
        </div>
      </article>
    </BlogShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}
