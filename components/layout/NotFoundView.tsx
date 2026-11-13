import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';

export function NotFoundView() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Page not found</h1>
      <p className="mt-3 text-muted-foreground">
        The page you are looking for does not exist, or the car has been removed.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
          Back to home
        </Link>
        <Link href="/cars" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Browse cars
        </Link>
      </div>
    </div>
  );
}
