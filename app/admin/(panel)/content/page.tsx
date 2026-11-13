import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { SiteContentRow } from '@/types/database';
import { ContentEditor } from '@/components/admin-extra/ContentEditor';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorNotice } from '@/components/lister/ErrorNotice';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Website Text', robots: { index: false, follow: false } };

export default async function AdminContentPage() {
  await requireRole('admin');
  const supabase = createClient();
  const { data, error } = await supabase.from('site_content').select('*').order('sort_order');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Text"
        description="Edit the texts shown on the public website. Changes go live as soon as you save a section."
      />
      {error ? (
        <ErrorNotice message="We could not load the website texts. Check your connection and try again." retryHref="/admin/content" />
      ) : (
        <ContentEditor rows={(data ?? []) as SiteContentRow[]} />
      )}
    </div>
  );
}
