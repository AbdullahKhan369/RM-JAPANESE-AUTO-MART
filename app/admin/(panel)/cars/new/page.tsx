import type { Metadata } from 'next';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { ErrorNotice } from '@/components/admin/ErrorNotice';
import { CarForm } from '@/components/car-form/CarForm';
import { buttonVariants } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Add car' };

export default async function AdminNewCarPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'lister')
    .eq('is_active', true)
    .order('full_name', { ascending: true });
  const listers = (data ?? []) as { id: string; full_name: string; email: string }[];

  return (
    <>
      <PageHeader title="Add car" description="Create a listing on behalf of a lister." />
      {error ? (
        <ErrorNotice />
      ) : listers.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-6 w-6" aria-hidden="true" />}
          title="Create a lister first"
          description="Every car belongs to a lister. There are no active listers yet."
          action={<Link href="/admin/listers" className={buttonVariants({ variant: 'primary' })}>Create a lister</Link>}
        />
      ) : (
        <CarForm mode="create" actor="admin" listers={listers} afterSaveHref="/admin/cars" cancelHref="/admin/cars" />
      )}
    </>
  );
}
