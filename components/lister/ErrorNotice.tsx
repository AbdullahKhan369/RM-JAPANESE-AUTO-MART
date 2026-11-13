import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';

interface ErrorNoticeProps {
  title?: string;
  message: string;
  retryHref?: string;
}

/** Server-safe error block shown when a query fails. */
export function ErrorNotice({ title = 'Something went wrong', message, retryHref }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-5 sm:flex-row sm:items-center"
    >
      <CircleAlert className="h-6 w-6 shrink-0 text-danger" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {retryHref && (
        <Link href={retryHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Try again
        </Link>
      )}
    </div>
  );
}
