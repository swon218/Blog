'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Mark, Node, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from '@tiptap/react';
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Braces,
  Code2,
  Eye,
  FileAudio,
  FilePlus2,
  GripVertical,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  LockKeyhole,
  Mic2,
  Pause,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import type {
  BlogNode,
  PostRecord,
  PostStatus,
  SubjectRecord,
} from '@/lib/blog-data';

type Snapshot = {
  subjects: SubjectRecord[];
  posts: PostRecord[];
};

type Draft = {
  id?: string;
  subjectId: string;
  title: string;
  excerpt: string;
  status: PostStatus;
  content: BlogNode;
};

type UploadedMedia = {
  id: string;
  kind: 'image' | 'video' | 'audio';
  name: string;
  src: string;
  downloadUrl: string;
};

const emptyDocument: BlogNode = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const resizeDirections: ResizeDirection[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];

const FontSizeMark = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => {
          const value = Number.parseFloat(element.style.fontSize);
          return Number.isFinite(value) ? value : null;
        },
        renderHTML: (attributes) => {
          const size = numericFontSize(attributes.size);
          return size ? { style: `font-size: ${size}pt` } : {};
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style*="font-size"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

function numericFontSize(value: unknown) {
  const size =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN;
  return Number.isFinite(size) && size >= 8 && size <= 72 ? size : undefined;
}

function ResizableMediaNodeView({
  node,
  selected,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [liveSize, setLiveSize] = useState<{
    width?: number;
    height?: number;
  }>({});
  const isImage = node.type.name === 'image';
  const kind = isImage ? 'image' : String(node.attrs.kind ?? 'audio');
  const src = String(node.attrs.src ?? '');
  const name = String(node.attrs.name ?? node.attrs.alt ?? '첨부 파일');
  const storedWidth = numericSize(node.attrs.width);
  const storedHeight = numericSize(node.attrs.height);
  const width = liveSize.width ?? storedWidth;
  const height = liveSize.height ?? storedHeight;

  function startResize(
    event: React.PointerEvent<HTMLButtonElement>,
    direction: ResizeDirection,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const element = wrapperRef.current;
    if (!element) return;

    const startRect = element.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const maxWidth = element.parentElement?.clientWidth ?? startRect.width;
    const minWidth = kind === 'audio' ? 240 : 160;
    const minHeight = kind === 'audio' ? 64 : 100;
    let finalWidth = Math.round(startRect.width);
    let finalHeight = Math.round(startRect.height);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const horizontal = direction.includes('e')
        ? deltaX
        : direction.includes('w')
          ? -deltaX
          : 0;
      const vertical = direction.includes('s')
        ? deltaY
        : direction.includes('n')
          ? -deltaY
          : 0;
      finalWidth = Math.round(
        Math.min(maxWidth, Math.max(minWidth, startRect.width + horizontal)),
      );
      finalHeight = Math.round(
        Math.max(minHeight, startRect.height + vertical),
      );
      setLiveSize({ width: finalWidth, height: finalHeight });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      onPointerMove(upEvent);
      updateAttributes({
        width: finalWidth,
        height: finalHeight,
      });
      setLiveSize({});
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`resizable-media-node ${selected ? 'is-selected' : ''}`}
      data-kind={kind}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : undefined,
      }}
    >
      <div className="resizable-media-node__content">
        {isImage ? (
          // The image source is generated by the trusted media API.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={String(node.attrs.alt ?? name)} />
        ) : null}
        {kind === 'video' ? (
          // User-uploaded video may not include a separate WebVTT track.
          // oxlint-disable-next-line jsx-a11y/media-has-caption
          <video src={src} controls preload="metadata" />
        ) : null}
        {kind === 'audio' ? (
          <div className="resizable-media-node__audio">
            <span>{name}</span>
            {/* Recorded lecture audio does not have a caption track at upload time. */}
            {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={src} controls preload="metadata" />
          </div>
        ) : null}
      </div>

      {selected ? (
        <>
          <button
            type="button"
            className="resizable-media-node__delete"
            aria-label={`${name} 삭제`}
            title="첨부 파일 삭제"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              deleteNode();
            }}
          >
            <X aria-hidden="true" />
          </button>
          {resizeDirections.map((direction) => (
            <button
              key={direction}
              type="button"
              className={`resizable-media-node__handle is-${direction}`}
              aria-label={`${direction} 방향으로 크기 조절`}
              onPointerDown={(event) => startResize(event, direction)}
            />
          ))}
        </>
      ) : null}
    </NodeViewWrapper>
  );
}

function numericSize(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

const MediaNode = Node.create({
  name: 'media',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      mediaId: { default: null },
      kind: { default: 'audio' },
      src: { default: null },
      name: { default: '첨부 파일' },
      width: { default: null },
      height: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-media-node]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const kind = HTMLAttributes.kind === 'video' ? 'video' : 'audio';
    const src = String(HTMLAttributes.src ?? '');
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-media-node': kind,
        class: 'editor-media-node',
      }),
      [kind, { src, controls: 'true', preload: 'metadata' }],
      [
        'a',
        { href: src + '?download=1', class: 'editor-media-download' },
        '녹음본 다운로드',
      ],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableMediaNodeView);
  },
});

const MediaImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-id'),
        renderHTML: (attributes) =>
          attributes.mediaId
            ? { 'data-media-id': String(attributes.mediaId) }
            : {},
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) =>
          attributes.width ? { width: String(attributes.width) } : {},
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('height'),
        renderHTML: (attributes) =>
          attributes.height ? { height: String(attributes.height) } : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableMediaNodeView);
  },
});

export function AdminWorkspace({
  initialSnapshot,
  ownerName,
  signOutPath,
  initialSubjectId,
  initialPostId,
  startWithNewPost = false,
}: {
  initialSnapshot: Snapshot;
  ownerName: string;
  signOutPath: string;
  initialSubjectId?: string;
  initialPostId?: string;
  startWithNewPost?: boolean;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const firstSubject =
    initialSnapshot.subjects.find(
      (subject) => subject.id === initialSubjectId,
    ) ?? initialSnapshot.subjects[0];
  const requestedPost = initialSnapshot.posts.find(
    (post) => post.id === initialPostId && post.subjectId === firstSubject?.id,
  );
  const firstPost = startWithNewPost
    ? undefined
    : (requestedPost ??
      initialSnapshot.posts.find(
        (post) => post.subjectId === firstSubject?.id,
      ));
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    firstSubject?.id ?? '',
  );
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(
    firstPost?.id,
  );
  const [draft, setDraft] = useState<Draft>(() =>
    firstPost ? fromPost(firstPost) : newDraft(firstSubject?.id ?? ''),
  );
  const [subjectName, setSubjectName] = useState('');
  const [message, setMessage] = useState('모든 변경사항이 저장되었습니다.');
  const [busy, setBusy] = useState(false);
  const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<
    'idle' | 'recording' | 'paused' | 'uploading'
  >('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      FontSizeMark,
      MediaImage,
      MediaNode,
      Placeholder.configure({
        placeholder: '오늘 배운 내용과 직접 확인한 것을 기록해 보세요…',
      }),
    ],
    content: draft.content,
    editorProps: {
      attributes: {
        class: 'study-editor',
        'aria-label': '게시글 본문 편집기',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      setDraft((current) => ({
        ...current,
        content: currentEditor.getJSON() as BlogNode,
      }));
      setMessage('저장되지 않은 변경사항이 있습니다.');
    },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const subjectPosts = useMemo(
    () => snapshot.posts.filter((post) => post.subjectId === selectedSubjectId),
    [snapshot.posts, selectedSubjectId],
  );

  async function mutate(
    body: Record<string, unknown>,
    options?: { selectSaved?: boolean },
  ) {
    setBusy(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as Snapshot & {
        savedId?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? '작업에 실패했습니다.');
      setSnapshot({ subjects: result.subjects, posts: result.posts });
      if (options?.selectSaved && result.savedId) {
        const saved = result.posts.find((post) => post.id === result.savedId);
        if (saved) {
          setSelectedSubjectId(saved.subjectId);
          setSelectedPostId(saved.id);
          setDraft(fromPost(saved));
          editor?.commands.setContent(saved.content);
        }
      }
      setMessage('변경사항을 저장했습니다.');
      return result;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '작업에 실패했습니다.',
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  function selectSubject(id: string) {
    setSelectedSubjectId(id);
    const post = snapshot.posts.find((item) => item.subjectId === id);
    if (post) {
      selectPost(post);
    } else {
      setSelectedPostId(undefined);
      setDraft(newDraft(id));
    }
  }

  function selectPost(post: PostRecord) {
    setSelectedSubjectId(post.subjectId);
    setSelectedPostId(post.id);
    setDraft(fromPost(post));
    editor?.commands.setContent(post.content);
    setMessage('게시글을 불러왔습니다.');
  }

  function startNewPost() {
    const subjectId = selectedSubjectId || snapshot.subjects[0]?.id || '';
    setSelectedPostId(undefined);
    setDraft(newDraft(subjectId));
    editor?.commands.setContent(emptyDocument);
    setMessage('새 게시글을 작성 중입니다.');
  }

  async function saveCurrentPost() {
    if (!editor) return;
    await mutate(
      {
        action: 'savePost',
        id: draft.id,
        subjectId: draft.subjectId,
        title: draft.title,
        excerpt: draft.excerpt,
        status: draft.status,
        content: editor.getJSON(),
      },
      { selectSaved: true },
    );
  }

  async function addSubject() {
    if (!subjectName.trim()) return;
    const result = await mutate({ action: 'createSubject', name: subjectName });
    if (result) {
      setSubjectName('');
      const created = result.subjects[result.subjects.length - 1];
      if (created) selectSubject(created.id);
    }
  }

  async function moveSubject(id: string, direction: -1 | 1) {
    const index = snapshot.subjects.findIndex((subject) => subject.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= snapshot.subjects.length) return;
    const ids = snapshot.subjects.map((subject) => subject.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await mutate({ action: 'reorderSubjects', ids });
  }

  async function dropSubject(targetId: string) {
    const sourceId = draggedSubjectId;
    setDraggedSubjectId(null);
    if (!sourceId || sourceId === targetId || busy) return;
    const ids = snapshot.subjects.map((subject) => subject.id);
    const sourceIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    ids.splice(sourceIndex, 1);
    ids.splice(targetIndex, 0, sourceId);
    await mutate({ action: 'reorderSubjects', ids });
  }

  async function movePost(id: string, direction: -1 | 1) {
    const ids = subjectPosts.map((post) => post.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await mutate({
      action: 'reorderPosts',
      subjectId: selectedSubjectId,
      ids,
    });
  }

  async function uploadFile(file: File, duration?: number) {
    setMessage(file.name + ' 업로드 중…');
    const form = new FormData();
    form.append('file', file);
    if (duration) form.append('duration', String(duration));
    const response = await fetch('/api/media', { method: 'POST', body: form });
    const result = (await response.json()) as UploadedMedia & {
      error?: string;
    };
    if (!response.ok)
      throw new Error(result.error ?? '파일 업로드에 실패했습니다.');
    insertMedia(result);
    setMessage(
      result.kind === 'audio'
        ? result.name +
            ' 녹음 파일을 본문에 삽입했습니다. 게시글을 저장하면 녹음 보관함에도 표시됩니다.'
        : result.name + ' 파일을 본문에 삽입했습니다.',
    );
  }

  function insertMedia(media: UploadedMedia) {
    if (!editor) return;
    if (media.kind === 'image') {
      editor
        .chain()
        .focus()
        .setImage({
          src: media.src,
          alt: media.name,
          title: media.name,
          mediaId: media.id,
        } as Parameters<typeof editor.commands.setImage>[0])
        .run();
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'media',
        attrs: {
          mediaId: media.id,
          kind: media.kind,
          src: media.src,
          name: media.name,
        },
      })
      .run();
  }

  function chooseFile(kind: 'image' | 'video' | 'audio') {
    if (fileInputRef.current) {
      fileInputRef.current.accept =
        kind === 'image'
          ? 'image/*'
          : kind === 'video'
            ? 'video/*'
            : 'audio/*';
      fileInputRef.current.click();
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessage('이 브라우저는 녹음 기능을 지원하지 않습니다.');
      return;
    }
    setMessage('마이크 연결과 권한을 확인하는 중입니다…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = [
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/webm',
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(
        stream,
        preferred ? { mimeType: preferred } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        const type = recorder.mimeType || 'audio/webm';
        const extension = type.includes('mp4') ? 'm4a' : 'webm';
        const blob = new Blob(chunksRef.current, { type });
        const file = new File(
          [blob],
          'class-recording-' +
            new Date().toISOString().slice(0, 10) +
            '.' +
            extension,
          { type },
        );
        setRecordingState('uploading');
        try {
          await uploadFile(file, recordingSeconds);
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : '녹음 저장에 실패했습니다.',
          );
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          setRecordingState('idle');
        }
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setRecordingSeconds(0);
      setRecordingState('recording');
      setMessage('녹음 중입니다. 종료하면 본문에 자동으로 삽입됩니다.');
      timerRef.current = setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000,
      );
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotFoundError') {
        setMessage('사용 가능한 마이크를 찾을 수 없습니다. PC의 마이크 연결을 확인해 주세요.');
      } else if (name === 'NotReadableError') {
        setMessage('마이크를 사용할 수 없습니다. 다른 프로그램이 마이크를 사용 중인지 확인해 주세요.');
      } else {
        setMessage('브라우저에서 마이크 권한을 허용해야 녹음할 수 있습니다.');
      }
    }
  }

  function togglePause() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recordingState === 'recording') {
      recorder.pause();
      setRecordingState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    } else if (recordingState === 'paused') {
      recorder.resume();
      setRecordingState('recording');
      timerRef.current = setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000,
      );
    }
  }

  function stopRecording() {
    if (
      recorderRef.current &&
      ['recording', 'paused'].includes(recorderRef.current.state)
    ) {
      recorderRef.current.stop();
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Code2 className="size-4" />
          </span>
          <span className="hidden sm:inline">Blog</span>
        </Link>
        <Badge variant="secondary">관리자 작업실</Badge>
        <span className="ml-auto hidden text-xs text-muted-foreground md:inline">
          {message}
        </span>
        <span className="hidden text-xs font-semibold sm:inline">
          {ownerName}
        </span>
        <ThemeToggle />
        <Link
          href={signOutPath}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          로그아웃
        </Link>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 xl:grid-cols-[220px_300px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-sidebar p-4 xl:border-r xl:border-b-0">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              과목 목차
            </p>
            <Badge variant="outline">{snapshot.subjects.length}</Badge>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-3 xl:grid-cols-1">
            {snapshot.subjects.map((subject, index) => (
              <div
                key={subject.id}
                draggable={!busy}
                onDragStart={(event) => {
                  setDraggedSubjectId(subject.id);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', subject.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  void dropSubject(subject.id);
                }}
                onDragEnd={() => setDraggedSubjectId(null)}
                className={
                  'group flex cursor-grab items-center rounded-xl border px-2 py-2 active:cursor-grabbing ' +
                  (subject.id === selectedSubjectId
                    ? 'border-primary/25 bg-primary text-primary-foreground'
                    : 'border-transparent hover:bg-sidebar-accent') +
                  (draggedSubjectId === subject.id ? ' opacity-45' : '')
                }
              >
                <GripVertical className="size-3.5 opacity-35" />
                <Link
                  href={'/?subject=' + encodeURIComponent(subject.slug)}
                  className="min-w-0 flex-1 truncate px-2 text-left text-sm font-semibold"
                >
                  {subject.name}
                </Link>
                <span className="text-[10px] opacity-55">
                  {subject.postCount}
                </span>
                <div className="ml-1 hidden items-center group-hover:flex">
                  <button
                    type="button"
                    aria-label="과목 위로 이동"
                    disabled={index === 0 || busy}
                    onClick={() => moveSubject(subject.id, -1)}
                    className="rounded p-0.5 hover:bg-black/10 disabled:opacity-25"
                  >
                    <ArrowUp className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="과목 아래로 이동"
                    disabled={index === snapshot.subjects.length - 1 || busy}
                    onClick={() => moveSubject(subject.id, 1)}
                    className="rounded p-0.5 hover:bg-black/10 disabled:opacity-25"
                  >
                    <ArrowDown className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void addSubject();
              }}
              placeholder="새 과목"
              className="h-9 bg-card"
            />
            <Button
              size="icon-lg"
              variant="outline"
              onClick={addSubject}
              disabled={busy}
              aria-label="과목 추가"
            >
              <Plus />
            </Button>
          </div>
        </aside>

        <aside className="border-b border-border bg-card/40 p-4 xl:border-r xl:border-b-0">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                게시글 순서
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                화살표로 공개 순서를 바꿉니다.
              </p>
            </div>
            <Button
              size="sm"
              onClick={startNewPost}
              disabled={!selectedSubjectId}
            >
              <FilePlus2 />
              새 글
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {subjectPosts.map((post, index) => (
              <div
                key={post.id}
                className={
                  'group rounded-xl border p-3 transition ' +
                  (post.id === selectedPostId
                    ? 'border-primary/30 bg-primary/[0.055]'
                    : 'border-border bg-card hover:border-primary/20')
                }
              >
                <button
                  type="button"
                  onClick={() => selectPost(post)}
                  className="w-full text-left"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="line-clamp-2 text-sm font-bold leading-5">
                    {post.title}
                  </p>
                </button>
                <div className="mt-2 flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === 0 || busy}
                    onClick={() => movePost(post.id, -1)}
                    aria-label="게시글 위로 이동"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === subjectPosts.length - 1 || busy}
                    onClick={() => movePost(post.id, 1)}
                    aria-label="게시글 아래로 이동"
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm('이 게시글을 삭제할까요?')) {
                        void mutate({ action: 'deletePost', id: post.id }).then(
                          () => startNewPost(),
                        );
                      }
                    }}
                    aria-label="게시글 삭제"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
            {!subjectPosts.length && (
              <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                이 과목의 첫 글을 작성해 보세요.
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-5 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={draft.title}
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }));
                    setMessage('저장되지 않은 변경사항이 있습니다.');
                  }}
                  placeholder="게시글 제목"
                  className="h-11 flex-1 bg-card px-4 text-base font-bold"
                />
                <select
                  aria-label="게시글 과목"
                  value={draft.subjectId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      subjectId: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:border-ring"
                >
                  {snapshot.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="공개 상태"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as PostStatus,
                    }))
                  }
                  className="h-11 rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:border-ring"
                >
                  <option value="draft">임시저장</option>
                  <option value="private">비공개</option>
                  <option value="public">공개</option>
                </select>
              </div>
              <Input
                value={draft.excerpt}
                onChange={(event) => {
                  setDraft((current) => ({
                    ...current,
                    excerpt: event.target.value,
                  }));
                  setMessage('저장되지 않은 변경사항이 있습니다.');
                }}
                placeholder="소제목 (선택 사항)"
                aria-label="게시글 소제목"
                className="h-11 bg-card px-4 text-sm"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/45 p-2">
                <label className="mr-1 inline-flex h-8 items-center gap-1 rounded-lg border border-input bg-card px-2 text-xs font-semibold text-muted-foreground">
                  <span>크기</span>
                  <select
                    aria-label="글자 크기"
                    title="글자 크기"
                    value={
                      numericFontSize(editor?.getAttributes('fontSize').size) ??
                      10
                    }
                    onChange={(event) =>
                      editor
                        ?.chain()
                        .focus()
                        .setMark('fontSize', {
                          size: Number(event.target.value),
                        })
                        .run()
                    }
                    className="bg-transparent font-bold text-foreground outline-none"
                  >
                    {fontSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <ToolbarButton
                  label="굵게"
                  active={editor?.isActive('bold')}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                  <Bold />
                </ToolbarButton>
                <ToolbarButton
                  label="기울임"
                  active={editor?.isActive('italic')}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                  <Italic />
                </ToolbarButton>
                <ToolbarButton
                  label="소제목"
                  active={editor?.isActive('heading', { level: 2 })}
                  onClick={() =>
                    editor?.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                >
                  <Heading2 />
                </ToolbarButton>
                <ToolbarButton
                  label="글머리 목록"
                  active={editor?.isActive('bulletList')}
                  onClick={() =>
                    editor?.chain().focus().toggleBulletList().run()
                  }
                >
                  <List />
                </ToolbarButton>
                <ToolbarButton
                  label="번호 목록"
                  active={editor?.isActive('orderedList')}
                  onClick={() =>
                    editor?.chain().focus().toggleOrderedList().run()
                  }
                >
                  <ListOrdered />
                </ToolbarButton>
                <ToolbarButton
                  label="코드 블록"
                  active={editor?.isActive('codeBlock')}
                  onClick={() =>
                    editor?.chain().focus().toggleCodeBlock().run()
                  }
                >
                  <Braces />
                </ToolbarButton>
                <span className="mx-1 h-6 w-px bg-border" />
                <ToolbarButton
                  label="이미지 첨부"
                  onClick={() => chooseFile('image')}
                >
                  <ImagePlus />
                </ToolbarButton>
                <ToolbarButton
                  label="동영상 첨부"
                  onClick={() => chooseFile('video')}
                >
                  <Video />
                </ToolbarButton>
                <ToolbarButton
                  label="녹음 파일 첨부"
                  onClick={() => chooseFile('audio')}
                >
                  <FileAudio />
                </ToolbarButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      try {
                        await uploadFile(file);
                      } catch (error) {
                        setMessage(
                          error instanceof Error
                            ? error.message
                            : '업로드에 실패했습니다.',
                        );
                      }
                    }
                    event.target.value = '';
                  }}
                />

                <div className="ml-auto flex items-center gap-1">
                  {recordingState === 'idle' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startRecording}
                      className="text-red-700"
                    >
                      <Mic2 />
                      마이크 녹음
                    </Button>
                  ) : (
                    <>
                      <span className="mr-1 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                        <span className="size-1.5 animate-pulse rounded-full bg-red-600" />
                        {formatDuration(recordingSeconds)}
                      </span>
                      {recordingState !== 'uploading' && (
                        <>
                          <Button
                            size="icon-sm"
                            variant="outline"
                            onClick={togglePause}
                            aria-label={
                              recordingState === 'paused'
                                ? '녹음 계속'
                                : '녹음 일시정지'
                            }
                          >
                            {recordingState === 'paused' ? <Play /> : <Pause />}
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            onClick={stopRecording}
                            aria-label="녹음 종료"
                          >
                            <Square />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              <EditorContent editor={editor} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={saveCurrentPost}
                disabled={busy || !draft.subjectId || !draft.title.trim()}
              >
                <Save />
                {busy ? '저장 중…' : '게시글 저장'}
              </Button>
              {draft.id && draft.status === 'public' && (
                <Link
                  href={
                    '/posts/' +
                    encodeURIComponent(
                      snapshot.posts.find((post) => post.id === draft.id)
                        ?.slug ?? '',
                    )
                  }
                  target="_blank"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-muted"
                >
                  <Eye className="size-4" />
                  공개 화면
                </Link>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                <LockKeyhole className="mr-1 inline size-3" />
                수업 녹음은 게시글을 공개해도 관리자에게만 표시됩니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={active ? 'secondary' : 'ghost'}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  if (status === 'public') {
    return <Badge className="bg-emerald-100 text-emerald-800">공개</Badge>;
  }
  if (status === 'private') {
    return <Badge variant="secondary">비공개</Badge>;
  }
  return <Badge variant="outline">임시저장</Badge>;
}

function fromPost(post: PostRecord): Draft {
  return {
    id: post.id,
    subjectId: post.subjectId,
    title: post.title,
    excerpt: post.excerpt,
    status: post.status,
    content: post.content,
  };
}

function newDraft(subjectId: string): Draft {
  return {
    subjectId,
    title: '',
    excerpt: '',
    status: 'draft',
    content: emptyDocument,
  };
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds % 60).padStart(2, '0')
  );
}
