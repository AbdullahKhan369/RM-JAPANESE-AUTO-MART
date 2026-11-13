import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { buttonVariants } from '@/components/ui/Button';
import { getSiteContent, t } from '@/lib/site-content';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Seller portal',
  robots: { index: false, follow: false },
};

export default async function ListerLandingPage() {
  const content = await getSiteContent();
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-primary/10 to-transparent"
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <Logo size="lg" />
        <h1 className="mt-10 text-3xl font-bold tracking-tight sm:text-4xl">{t(content, 'lister_landing_title')}</h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground sm:text-lg">{t(content, 'lister_landing_text')}</p>

        <Link
          href="/lister/login"
          className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'mt-10 min-w-[15rem] text-base shadow-lg')}
        >
          {t(content, 'lister_landing_button')}
        </Link>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to website
        </Link>
      </div>
    </main>
  );
}
