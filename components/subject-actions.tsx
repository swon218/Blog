'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FilePlus2, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SubjectRecord } from '@/lib/blog-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RecordingVaultDialog } from '@/components/recording-vault-dialog';
import { VisibilityControl } from '@/components/visibility-controls';

export function SubjectActions({ subject }: { subject: SubjectRecord }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(subject.name);
  const [description, setDescription] = useState(subject.description);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nonPublicPostCount = subject.postCount - subject.publicPostCount;
  const warning =
    subject.visibility === 'private' && subject.publicPostCount > 0
      ? `현재 ${subject.publicPostCount}개 게시물이 공개 상태입니다.`
      : subject.visibility === 'public' && nonPublicPostCount > 0
        ? `현재 ${nonPublicPostCount}개 게시물이 비공개 또는 초안 상태입니다.`
        : undefined;

  async function request(body: Record<string, unknown>) {
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok)
      throw new Error(payload.error || '작업을 완료하지 못했습니다.');
  }

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await request({
        action: 'updateSubject',
        id: subject.id,
        name,
        description,
      });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : '과목을 수정하지 못했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    const confirmed = window.confirm(
      `'${subject.name}' 과목과 포함된 모든 게시글을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError('');
    try {
      await request({ action: 'deleteSubject', id: subject.id });
      setOpen(false);
      router.push('/');
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : '과목을 삭제하지 못했습니다.',
      );
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={'/admin?subject=' + encodeURIComponent(subject.id) + '&new=1'}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/85"
        >
          <FilePlus2 className="size-4" /> 게시물 추가
        </Link>
        <VisibilityControl
          key={`${subject.id}-${subject.visibility}-${subject.publicPostCount}-${subject.postCount}`}
          id={subject.id}
          kind="subject"
          visibility={subject.visibility}
          warning={warning}
        />
        <Button variant="outline" size="lg" onClick={() => setOpen(true)}>
          <Pencil className="size-4" /> 과목 수정
        </Button>
        <RecordingVaultDialog />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>과목 정보 수정</DialogTitle>
            <DialogDescription>
              과목명과 소제목을 수정하거나 과목 전체를 삭제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label
              htmlFor="subject-name"
              className="grid gap-1.5 text-xs font-bold"
            >
              과목명
              <Input
                id="subject-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label
              htmlFor="subject-description"
              className="grid gap-1.5 text-xs font-bold"
            >
              과목 소제목
              <Textarea
                id="subject-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="소제목을 입력하지 않아도 빈 공간은 유지됩니다."
                rows={3}
              />
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter className="justify-between sm:justify-between">
            <Button variant="destructive" onClick={remove} disabled={busy}>
              <Trash2 /> 과목 삭제
            </Button>
            <Button onClick={save} disabled={busy || !name.trim()}>
              변경사항 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
