import type { Metadata } from 'next';
import { getSiteContent, t } from '@/lib/site-content';
import { ListRequestForm } from '@/components/list-request/ListRequestForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: t(content, 'list_form_title'), description: t(content, 'list_form_text') };
}

export default async function ListYourCarPage() {
  const content = await getSiteContent();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-8">
        <ListRequestForm
          title={t(content, 'list_form_title')}
          text={t(content, 'list_form_text')}
          successTitle={t(content, 'list_success_title')}
          successText={t(content, 'list_success_text')}
        />
      </div>
    </div>
  );
}
