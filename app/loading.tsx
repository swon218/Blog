import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <output
      className="fixed inset-x-0 top-16 z-30 flex justify-center py-3"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-sm">
        <LoaderCircle className="size-3.5 animate-spin" /> 불러오는 중
      </span>
    </output>
  );
}
