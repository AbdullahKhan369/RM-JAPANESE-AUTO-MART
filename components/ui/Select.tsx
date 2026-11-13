import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'select-chevron h-11 w-full rounded-xl border bg-background pl-3.5 pr-9 text-sm text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
        invalid
          ? 'border-danger focus-visible:ring-danger/30'
          : 'border-border focus-visible:border-ring focus-visible:ring-ring/30',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
