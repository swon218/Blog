'use client';

import { Clock3, Download, Headphones, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import type { RecordingRecord } from '@/lib/blog-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function RecordingVaultDialog({
  postId,
  compact = false,
}: {
  postId?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [recordings, setRecordings] = useState<RecordingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next || loaded || loading) return;
    setLoading(true);
    setError('');
    try {
      const query = postId ? '?post=' + encodeURIComponent(postId) : '';
      const response = await fetch('/api/recordings' + query);
      const payload = (await response.json()) as {
        recordings?: RecordingRecord[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || '녹음을 불러오지 못했습니다.');
      setRecordings(payload.recordings ?? []);
      setLoaded(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : '녹음을 불러오지 못했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        variant="outline"
        size={compact ? 'default' : 'lg'}
        onClick={() => void handleOpenChange(true)}
      >
        <Headphones className="size-4" /> {compact ? '녹음' : '녹음 보관함'}
      </Button>
      <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {postId ? '이 게시물의 녹음' : '수업 녹음 보관함'}
          </DialogTitle>
          <DialogDescription>
            녹음 시각별로 재생하거나 원본 파일을 저장할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {loading && (
            <div className="grid place-items-center py-14 text-muted-foreground">
              <LoaderCircle className="mb-3 size-6 animate-spin" />
              <p className="text-sm">녹음을 불러오는 중입니다.</p>
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && (
            <div className="grid gap-3">
              {recordings.map((recording) => (
                <article
                  key={recording.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-primary">
                        {recording.subjectName ?? '미분류'}
                      </p>
                      <h3 className="mt-1 text-sm font-bold">
                        {recording.postTitle ?? recording.originalName}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3" />
                          {formatDateTime(recording.createdAt)}
                        </span>
                        <span>{formatDuration(recording.duration)}</span>
                        <span>{formatBytes(recording.fileSize)}</span>
                      </div>
                    </div>
                    <a
                      href={recording.src + '?download=1'}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold hover:bg-muted"
                    >
                      <Download className="size-3.5" /> 저장
                    </a>
                  </div>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio
                    controls
                    preload="metadata"
                    className="w-full"
                    src={recording.src}
                  />
                </article>
              ))}
              {!recordings.length && (
                <div className="rounded-xl border border-dashed border-border py-12 text-center">
                  <Headphones className="mx-auto mb-2 size-6 text-muted-foreground" />
                  <p className="text-sm font-bold">저장된 녹음이 없습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(value: number | null) {
  if (!value) return '시간 정보 없음';
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return Math.max(1, Math.round(value / 1024)) + ' KB';
  return (value / 1024 / 1024).toFixed(1) + ' MB';
}
