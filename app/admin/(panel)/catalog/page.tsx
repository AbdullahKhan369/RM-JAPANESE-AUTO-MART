import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Make, Model } from '@/types/database';
import { CatalogManager } from '@/components/admin-extra/CatalogManager';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorNotice } from '@/components/lister/ErrorNotice';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Makes & Models', robots: { index: false, follow: false } };

export default async function AdminCatalogPage() {
  await requireRole('admin');
  const supabase = createClient();
  const [makes, models] = await Promise.all([
    supabase.from('makes').select('*').order('name'),
    supabase.from('models').select('*').order('name'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Makes & Models" description="Manage the makes and models listers can choose from." />
      {makes.error || models.error ? (
        <ErrorNotice message="We could not load makes and models. Check your connection and try again." retryHref="/admin/catalog" />
      ) : (
        <CatalogManager makes={(makes.data ?? []) as Make[]} models={(models.data ?? []) as Model[]} />
      )}
    </div>
  );
}
