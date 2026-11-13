import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function pageList(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, pageCount - 1, pageCount, page - 1, page, page + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

const itemBase =
  'inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const current = Math.min(Math.max(page, 1), pageCount);

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {current > 1 ? (
        <Link href={buildHref(current - 1)} className={cn(itemBase, 'border border-border bg-card hover:bg-muted')} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(itemBase, 'cursor-not-allowed border border-border bg-card opacity-40')} aria-hidden="true">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {pageList(current, pageCount).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-current={item === current ? 'page' : undefined}
            aria-label={`Page ${item}`}
            className={cn(
              itemBase,
              item === current
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            {item}
          </Link>
        ),
      )}

      {current < pageCount ? (
        <Link href={buildHref(current + 1)} className={cn(itemBase, 'border border-border bg-card hover:bg-muted')} aria-label="Next page">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(itemBase, 'cursor-not-allowed border border-border bg-card opacity-40')} aria-hidden="true">
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
