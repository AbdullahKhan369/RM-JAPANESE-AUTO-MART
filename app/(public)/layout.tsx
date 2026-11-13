import type { ReactNode } from 'react';
import { getSiteContent, t } from '@/lib/site-content';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CurrencyModal } from '@/components/layout/CurrencyModal';

export const dynamic = 'force-dynamic';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const content = await getSiteContent();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Header
        siteName={t(content, 'site_name')}
        listButtonLabel={t(content, 'nav_list_button')}
        listContent={{
          title: t(content, 'list_form_title'),
          text: t(content, 'list_form_text'),
          successTitle: t(content, 'list_success_title'),
          successText: t(content, 'list_success_text'),
        }}
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer content={content} />
      <CurrencyModal />
    </div>
  );
}
