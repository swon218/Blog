import Link from 'next/link';
import { ArrowLeft, Clock3, Download, Headphones, ShieldX } from 'lucide-react';
import { chatGPTSignOutPath, requireChatGPTUser } from '@/app/chatgpt-auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { getRecordings } from '@/lib/blog-data';
import { isOwner } from '@/lib/owner-auth';

export const dynamic = 'force-dynamic';

export default async function RecordingsPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const query = await searchParams;
  const returnTo = query.post
    ? '/recordings?post=' + encodeURIComponent(query.post)
    : '/recordings';
  const user = await requireChatGPTUser(returnTo);

  if (!isOwner(user)) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
          <ShieldX className="mx-auto mb-5 size-10 text-destructive" />
          <h1 className="text-xl font-bold">관리자 계정이 아닙니다.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            수업 녹음은 블로그 소유자만 확인할 수 있습니다.
          </p>
          <Link
            href={chatGPTSignOutPath('/')}
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            로그아웃
          </Link>
        </div>
      </main>
    );
  }

  const recordings = await getRecordings(query.post);
  const filteredPostTitle = query.post ? recordings[0]?.postTitle : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold"
          >
            <ArrowLeft className="size-4" />
            블로그로 돌아가기
          </Link>
          <span className="ml-auto text-xs text-muted-foreground">
            소유자 전용
          </span>
          <ThemeToggle />
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex items-end justify-between gap-5 border-b border-border pb-7">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
              <Headphones className="size-4" />
              수업 녹음 보관함
            </div>
            <h1 className="text-3xl font-bold tracking-[-0.04em]">
              {filteredPostTitle
                ? filteredPostTitle + ' 녹음'
                : '모든 수업 녹음'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              녹음 시각별로 재생하거나 원본 파일을 기기에 저장할 수 있습니다.
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
            {recordings.length}개
          </span>
        </div>

        <div className="grid gap-4">
          {recordings.map((recording) => (
            <article
              key={recording.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
            >
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {recording.subjectName ?? '미분류'}
                  </p>
                  <h2 className="mt-1 font-bold">
                    {recording.postTitle ?? recording.originalName}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" />
                      {formatDateTime(recording.createdAt)}
                    </span>
                    <span>{formatDuration(recording.duration)}</span>
                    <span>{formatBytes(recording.fileSize)}</span>
                  </div>
                </div>
                <a
                  href={recording.src + '?download=1'}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-semibold transition hover:bg-muted"
                >
                  <Download className="size-4" />
                  파일 저장
                </a>
              </div>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <audio
                controls
                preload="metadata"
                className="w-full"
                src={recording.src}
              />
              {recording.postSlug && (
                <Link
                  href={'/posts/' + encodeURIComponent(recording.postSlug)}
                  className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  게시글에서 확인하기
                </Link>
              )}
            </article>
          ))}
          {!recordings.length && (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <Headphones className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-bold">저장된 녹음이 없습니다.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                게시글 편집기에서 녹음한 뒤 글을 저장하면 이곳에 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(value: number | null) {
  if (!value) return '시간 정보 없음';
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return Math.max(1, Math.round(value / 1024)) + ' KB';
  return (value / 1024 / 1024).toFixed(1) + ' MB';
}
