import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/Button';
import { getSiteContent, t } from '@/lib/site-content';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: t(content, 'about_title') };
}

export default async function AboutPage() {
  const content = await getSiteContent();
  const paragraphs = t(content, 'about_body')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t(content, 'about_title')}</h1>
      <div className="mt-6 space-y-5 text-lg leading-relaxed text-foreground/90">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/cars" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
          Browse cars
        </Link>
        <Link href="/contact" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Contact us
        </Link>
      </div>
    </div>
  );
}
