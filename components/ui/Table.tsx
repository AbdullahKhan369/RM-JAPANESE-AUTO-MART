import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-card">
      <table className={cn('w-full min-w-[640px] border-collapse text-left text-sm', className)}>{children}</table>
    </div>
  );
}

export function THead({ className, children }: { className?: string; children: ReactNode }) {
  return <thead className={cn('bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground', className)}>{children}</thead>;
}

export function TBody({ className, children }: { className?: string; children: ReactNode }) {
  return <tbody className={cn('divide-y divide-border', className)}>{children}</tbody>;
}

export function Tr({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('transition-colors hover:bg-muted/40', className)} {...props}>
      {children}
    </tr>
  );
}

export function Th({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={cn('px-4 py-3 font-semibold', className)} {...props}>
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle text-foreground', className)} {...props}>
      {children}
    </td>
  );
}
