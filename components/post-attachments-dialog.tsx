'use client';

import { useMemo, useState } from 'react';
import {
  AudioLines,
  Download,
  FileArchive,
  ImageIcon,
  Video,
} from 'lucide-react';
import type { BlogNode } from '@/lib/blog-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type AttachmentKind = 'image' | 'video' | 'audio';

type PostAttachment = {
  id: string;
  kind: AttachmentKind;
  name: string;
  src: string;
};

const sectors: Array<{
  kind: AttachmentKind;
  label: string;
  icon: typeof ImageIcon;
}> = [
  { kind: 'image', label: '이미지', icon: ImageIcon },
  { kind: 'video', label: '동영상', icon: Video },
  { kind: 'audio', label: '녹음', icon: AudioLines },
];

export function PostAttachmentsDialog({
  document,
  canAccessPrivate = false,
}: {
  document: BlogNode;
  canAccessPrivate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeKind, setActiveKind] = useState<AttachmentKind>('image');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const attachments = useMemo(
    () =>
      collectAttachments(document).filter(
        (attachment) => attachment.kind !== 'audio' || canAccessPrivate,
      ),
    [canAccessPrivate, document],
  );
  const sectorFiles = attachments.filter((file) => file.kind === activeKind);
  const selectedSectorCount = sectorFiles.filter((file) =>
    selectedIds.has(file.id),
  ).length;
  const allSectorSelected =
    sectorFiles.length > 0 && selectedSectorCount === sectorFiles.length;

  function toggleFile(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSector() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const file of sectorFiles) {
        if (allSectorSelected) next.delete(file.id);
        else next.add(file.id);
      }
      return next;
    });
  }

  function downloadFiles(files: PostAttachment[]) {
    files.forEach((file, index) => {
      window.setTimeout(() => {
        const anchor = window.document.createElement('a');
        anchor.href =
          file.src + (file.src.includes('?') ? '&download=1' : '?download=1');
        anchor.download = file.name;
        anchor.style.display = 'none';
        window.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }, index * 150);
    });
  }

  const selectedFiles = attachments.filter((file) => selectedIds.has(file.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="default" onClick={() => setOpen(true)}>
        <FileArchive className="size-4" /> 첨부파일
      </Button>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>게시글 첨부파일</DialogTitle>
          <DialogDescription>
            종류별로 파일을 선택해 개별 또는 한꺼번에 다운로드할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="첨부파일 종류">
          {sectors.map((sector) => {
            const Icon = sector.icon;
            const count = attachments.filter(
              (file) => file.kind === sector.kind,
            ).length;
            return (
              <button
                key={sector.kind}
                type="button"
                role="tab"
                aria-selected={activeKind === sector.kind}
                onClick={() => setActiveKind(sector.kind)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                  activeKind === sector.kind
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <Icon className="size-4" /> {sector.label}
                <span className="rounded-full bg-black/10 px-1.5 text-[10px] dark:bg-white/10">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={allSectorSelected}
              onChange={toggleSector}
              disabled={!sectorFiles.length}
              className="size-4 accent-primary"
            />
            이 섹터 전체 선택
          </label>
          <Button
            size="sm"
            disabled={!selectedFiles.length}
            onClick={() => downloadFiles(selectedFiles)}
          >
            <Download /> 선택 파일 다운로드 ({selectedFiles.length})
          </Button>
        </div>

        <div className="max-h-[48vh] overflow-y-auto pr-1" role="tabpanel">
          <div className="grid gap-2">
            {sectorFiles.map((file) => (
              <article
                key={file.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(file.id)}
                  onChange={() => toggleFile(file.id)}
                  aria-label={`${file.name} 선택`}
                  className="size-4 shrink-0 accent-primary"
                />
                <AttachmentPreview file={file} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => downloadFiles([file])}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted"
                  aria-label={`${file.name} 다운로드`}
                  title="이 파일 다운로드"
                >
                  <Download className="size-4" />
                </button>
              </article>
            ))}
            {!sectorFiles.length ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                이 섹터에 첨부된 파일이 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentPreview({ file }: { file: PostAttachment }) {
  if (file.kind === 'image') {
    return (
      // The image source is generated by the trusted media API.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file.src}
        alt=""
        className="size-11 shrink-0 rounded-lg border border-border object-cover"
      />
    );
  }
  const Icon = file.kind === 'video' ? Video : AudioLines;
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="size-5" />
    </span>
  );
}

function collectAttachments(document: BlogNode) {
  const attachments: PostAttachment[] = [];
  let sequence = 0;

  function visit(node: BlogNode) {
    if (node.type === 'image') {
      sequence += 1;
      const src = stringNodeAttr(node, 'src');
      if (src) {
        attachments.push({
          id: stringNodeAttr(node, 'mediaId') || `image-${sequence}`,
          kind: 'image',
          name:
            stringNodeAttr(node, 'title') ||
            stringNodeAttr(node, 'alt') ||
            `이미지 ${sequence}`,
          src,
        });
      }
    }
    if (node.type === 'media') {
      const kind = stringNodeAttr(node, 'kind');
      const src = stringNodeAttr(node, 'src');
      if ((kind === 'video' || kind === 'audio') && src) {
        sequence += 1;
        attachments.push({
          id: stringNodeAttr(node, 'mediaId') || `${kind}-${sequence}`,
          kind,
          name:
            stringNodeAttr(node, 'name') ||
            (kind === 'video' ? `동영상 ${sequence}` : `녹음 ${sequence}`),
          src,
        });
      }
    }
    node.content?.forEach(visit);
  }

  visit(document);
  return attachments;
}

function stringNodeAttr(node: BlogNode, key: string) {
  const value = node.attrs?.[key];
  return typeof value === 'string' ? value : '';
}
