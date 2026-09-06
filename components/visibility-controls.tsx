'use client';

import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SubjectVisibility } from '@/lib/blog-data';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type VisibilityControlProps = {
  id: string;
  visibility: SubjectVisibility;
  kind: 'subject' | 'post';
  warning?: string;
  compact?: boolean;
};

export function VisibilityControl({
  id,
  visibility,
  kind,
  warning,
  compact = false,
}: VisibilityControlProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(visibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isPublic = current === 'public';

  async function changeVisibility(checked: boolean) {
    if (saving) return;
    const next: SubjectVisibility = checked ? 'public' : 'private';
    const previous = current;
    setCurrent(next);
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action:
            kind === 'subject' ? 'setSubjectVisibility' : 'setPostVisibility',
          id,
          visibility: next,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || '공개 상태를 변경하지 못했습니다.');
      router.refresh();
    } catch (caught) {
      setCurrent(previous);
      setError(
        caught instanceof Error
          ? caught.message
          : '공개 상태를 변경하지 못했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <div
        className={
          'inline-flex items-center gap-2 rounded-lg border border-border bg-card ' +
          (compact ? 'h-8 px-2.5' : 'h-9 px-3')
        }
      >
        <span className="text-xs font-bold text-muted-foreground">
          {isPublic ? '공개' : '비공개'}
        </span>
        <Switch
          size="sm"
          checked={isPublic}
          onCheckedChange={changeVisibility}
          disabled={saving}
          aria-label={`${kind === 'subject' ? '과목' : '게시물'} 공개 상태`}
        />
        {warning && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="grid size-5 place-items-center rounded-full bg-amber-400 text-[11px] font-black text-amber-950"
                    aria-label={warning}
                  />
                }
              >
                <CircleAlert className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">{warning}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {error && (
        <span className="absolute top-full right-0 z-20 mt-1 w-56 rounded-md bg-destructive px-2 py-1 text-[10px] text-white shadow-lg">
          {error}
        </span>
      )}
    </div>
  );
}
