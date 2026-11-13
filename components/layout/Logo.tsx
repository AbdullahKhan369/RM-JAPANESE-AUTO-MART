import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

const tile = {
  sm: 'h-9 w-[54px]',
  md: 'h-11 w-[66px]',
  lg: 'h-14 w-[84px]',
} as const;

const text = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
} as const;

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  name?: string;
  href?: string | null;
  className?: string;
}

/** The logo has a black background, so it always sits in a black rounded tile. */
export function Logo({ size = 'md', showName = true, name = SITE_NAME, href = '/', className }: LogoProps) {
  const content = (
    <>
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-logo ring-1 ring-border',
          tile[size],
        )}
      >
        <img src="/logo.png" alt={showName ? '' : name} className="h-full w-full object-cover" width={84} height={56} />
      </span>
      {showName ? (
        <span className={cn('font-bold leading-tight tracking-tight text-foreground', text[size])}>{name}</span>
      ) : null}
    </>
  );

  const classes = cn('inline-flex items-center gap-3', className);

  if (href === null) return <span className={classes}>{content}</span>;
  return (
    <Link
      href={href}
      className={cn(classes, 'rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
      aria-label={name}
    >
      {content}
    </Link>
  );
}
