'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronRight,
  Code2,
  GripVertical,
  LockKeyhole,
  LogOut,
  Menu,
  PanelLeftClose,
  Plus,
  Search,
} from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import type { PostSummary, SubjectRecord } from '@/lib/blog-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';

type Props = {
  subjects: SubjectRecord[];
  posts: PostSummary[];
  activeSubjectId?: string;
  activePostId?: string;
  isOwner: boolean;
  ownerSignOutPath?: string;
  search?: string;
  onSubjectSelect?: (subjectId: string) => void;
  children: ReactNode;
};

export function BlogShell({
  subjects,
  posts,
  activeSubjectId,
  activePostId,
  isOwner,
  ownerSignOutPath,
  search = '',
  onSubjectSelect,
  children,
}: Props) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(activePostId && activeSubjectId ? [activeSubjectId] : []),
  );
  const [subjectName, setSubjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);
  const [subjectOrder, setSubjectOrder] = useState<string[]>(() =>
    subjects.map((subject) => subject.id),
  );
  const liveOrderRef = useRef(subjects.map((subject) => subject.id));
  const dragStartOrderRef = useRef(subjects.map((subject) => subject.id));
  const dropCommittedRef = useRef(false);
  const [error, setError] = useState('');

  const orderIndex = new Map(subjectOrder.map((id, index) => [id, index]));
  const orderedSubjects = [...subjects].sort((left, right) => {
    const leftIndex = orderIndex.get(left.id);
    const rightIndex = orderIndex.get(right.id);
    if (leftIndex === undefined && rightIndex === undefined)
      return left.sortOrder - right.sortOrder;
    if (leftIndex === undefined) return 1;
    if (rightIndex === undefined) return -1;
    return leftIndex - rightIndex;
  });

  function toggleSubject(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createFolder() {
    const name = subjectName.trim();
    if (!name || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'createSubject', name }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || '과목을 만들지 못했습니다.');
      setSubjectName('');
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '과목을 만들지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }

  function previewSubjectOrder(targetId: string, placeAfter: boolean) {
    const sourceId = draggedSubjectId;
    if (!isOwner || !sourceId || sourceId === targetId || reordering) return;
    const current = liveOrderRef.current;
    const next = current.filter((id) => id !== sourceId);
    const targetIndex = next.indexOf(targetId);
    next.splice(targetIndex + (placeAfter ? 1 : 0), 0, sourceId);
    if (next.every((id, index) => id === current[index])) return;
    liveOrderRef.current = next;
    setSubjectOrder(next);
  }

  async function commitSubjectOrder() {
    const previous = dragStartOrderRef.current;
    const next = liveOrderRef.current;
    setDraggedSubjectId(null);
    if (next.every((id, index) => id === previous[index])) return;
    setReordering(true);
    setError('');
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'reorderSubjects', ids: next }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || '과목 순서를 저장하지 못했습니다.');
      router.refresh();
    } catch (caught) {
      liveOrderRef.current = previous;
      setSubjectOrder(previous);
      setError(
        caught instanceof Error
          ? caught.message
          : '과목 순서를 저장하지 못했습니다.',
      );
    } finally {
      setReordering(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/92 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? '좌측 패널 접기' : '좌측 패널 펼치기'}
            title={sidebarOpen ? '좌측 패널 접기' : '좌측 패널 펼치기'}
          >
            {sidebarOpen ? <PanelLeftClose /> : <Menu />}
          </Button>
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="홈으로 이동"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Code2 className="size-4.5" />
            </span>
            <strong className="hidden text-[16px] leading-none tracking-[-0.02em] sm:block">
              Blog
            </strong>
          </Link>
          <form
            className="ml-auto hidden w-full max-w-sm items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-xs md:flex"
            action="/"
          >
            <Search className="size-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={search}
              aria-label="검색"
              placeholder="검색"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </form>
          <ThemeToggle />
          <Link
            href={isOwner ? (ownerSignOutPath ?? '/') : '/admin'}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold shadow-xs transition hover:bg-muted"
          >
            {isOwner ? (
              <LogOut className="size-3.5" />
            ) : (
              <LockKeyhole className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {isOwner ? '로그아웃' : '로그인'}
            </span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] items-stretch">
        <aside
          className={
            'shrink-0 overflow-hidden border-r border-border bg-sidebar transition-[width] duration-200 ' +
            (sidebarOpen ? 'w-[280px]' : 'w-0 border-r-0')
          }
        >
          <div className="w-[280px] px-4 py-2">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                태그
              </p>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {subjects.length}
              </span>
            </div>

            <nav aria-label="과목과 게시글 목록" className="grid gap-1.5">
              {orderedSubjects.map((subject) => {
                const open = expanded.has(subject.id);
                const subjectPosts = posts.filter(
                  (post) => post.subjectId === subject.id,
                );
                const active = activeSubjectId === subject.id;
                return (
                  <div
                    key={subject.id}
                    draggable={isOwner && !reordering}
                    onDragStart={(event) => {
                      if (!isOwner) return;
                      const current = orderedSubjects.map((item) => item.id);
                      dragStartOrderRef.current = current;
                      liveOrderRef.current = current;
                      dropCommittedRef.current = false;
                      setDraggedSubjectId(subject.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', subject.id);
                    }}
                    onDragOver={(event) => {
                      if (!isOwner) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      previewSubjectOrder(
                        subject.id,
                        event.clientY > bounds.top + bounds.height / 2,
                      );
                    }}
                    onDrop={(event) => {
                      if (!isOwner) return;
                      event.preventDefault();
                      const bounds =
                        event.currentTarget.getBoundingClientRect();
                      previewSubjectOrder(
                        subject.id,
                        event.clientY > bounds.top + bounds.height / 2,
                      );
                      dropCommittedRef.current = true;
                      void commitSubjectOrder();
                    }}
                    onDragEnd={() => {
                      if (!dropCommittedRef.current) {
                        liveOrderRef.current = dragStartOrderRef.current;
                        setSubjectOrder(dragStartOrderRef.current);
                        setDraggedSubjectId(null);
                      }
                    }}
                    className={
                      'transition-all duration-150 ' +
                      (isOwner ? 'cursor-grab active:cursor-grabbing ' : '') +
                      (draggedSubjectId === subject.id
                        ? 'scale-[0.98] opacity-55'
                        : '')
                    }
                  >
                    <div
                      className={
                        'flex items-center rounded-xl transition ' +
                        (active
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-sidebar-accent')
                      }
                    >
                      {isOwner && (
                        <GripVertical
                          className={
                            'ml-1 size-3.5 shrink-0 transition ' +
                            (draggedSubjectId === subject.id
                              ? 'text-primary opacity-100'
                              : 'opacity-35')
                          }
                        />
                      )}
                      {onSubjectSelect ? (
                        <button
                          type="button"
                          draggable={false}
                          onClick={() => onSubjectSelect(subject.id)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3 text-left"
                        >
                          <SubjectLabel subject={subject} active={active} />
                        </button>
                      ) : (
                        <Link
                          draggable={false}
                          href={'/?subject=' + encodeURIComponent(subject.slug)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3 text-left"
                        >
                          <SubjectLabel subject={subject} active={active} />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleSubject(subject.id)}
                        className="mr-1 grid size-9 place-items-center rounded-lg opacity-70 transition hover:bg-background/15 hover:opacity-100"
                        aria-label={
                          subject.name +
                          ' 게시글 목록 ' +
                          (open ? '접기' : '펼치기')
                        }
                        aria-expanded={open}
                        title={open ? '게시글 목록 접기' : '게시글 목록 펼치기'}
                      >
                        <ChevronRight
                          className={
                            'size-4 transition-transform ' +
                            (open ? 'rotate-90' : '')
                          }
                        />
                      </button>
                    </div>
                    {open && (
                      <div className="ml-5 mt-1 grid gap-1 border-l border-border pl-3">
                        {subjectPosts.map((post, index) => (
                          <Link
                            key={post.id}
                            href={'/posts/' + encodeURIComponent(post.slug)}
                            className={
                              'flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs leading-5 transition ' +
                              (post.id === activePostId
                                ? 'bg-sidebar-accent font-bold text-foreground'
                                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground')
                            }
                          >
                            <span className="mt-px font-mono opacity-50">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="line-clamp-2 min-w-0 flex-1">
                              {post.title}
                            </span>
                            {isOwner && post.status !== 'public' && (
                              <span
                                className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500"
                                title={post.status}
                              />
                            )}
                          </Link>
                        ))}
                        {!subjectPosts.length && (
                          <p className="px-2.5 py-2 text-xs text-muted-foreground">
                            아직 작성된 글이 없습니다.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!subjects.length && (
                <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                  태그가 없습니다.
                </p>
              )}
            </nav>
            {isOwner && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={subjectName}
                    onChange={(event) => setSubjectName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void createFolder();
                    }}
                    placeholder="새 과목"
                    aria-label="새 과목 이름"
                    className="h-9 bg-card"
                  />
                  <Button
                    variant="outline"
                    size="icon-lg"
                    disabled={!subjectName.trim() || saving}
                    onClick={createFolder}
                    aria-label="과목 추가"
                    title="과목 추가"
                  >
                    <Plus />
                  </Button>
                </div>
                {error && (
                  <p className="mt-2 text-xs text-destructive">{error}</p>
                )}
              </div>
            )}
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}

function SubjectLabel({
  subject,
  active,
}: {
  subject: SubjectRecord;
  active: boolean;
}) {
  return (
    <>
      <BookOpen
        className={
          active
            ? 'size-4 text-amber-300'
            : 'size-4 text-muted-foreground'
        }
      />
      <span className="truncate text-sm font-semibold">{subject.name}</span>
      <span className="ml-auto text-xs opacity-60">{subject.postCount}</span>
    </>
  );
}
