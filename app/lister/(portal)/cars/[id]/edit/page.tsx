import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CAR_SELECT } from '@/lib/constants';
import type { CarWithRelations } from '@/types/database';
import { CarForm } from '@/components/car-form/CarForm';
import { buttonVariants } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorNotice } from '@/components/lister/ErrorNotice';
import { UUID_RE } from '@/components/lister/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit car', robots: { index: false, follow: false } };

export default async function EditCarPage({ params }: { params: { id: string } }) {
  const { user } = await requireRole('lister');
  if (!UUID_RE.test(params.id)) notFound();

  const supabase = createClient();
  const { data, error } = await supabase.from('cars').select(CAR_SELECT).eq('id', params.id).maybeSingle();

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit car" />
        <ErrorNotice message="We could not load this car. Check your connection and try again." retryHref={`/lister/cars/${params.id}/edit`} />
      </div>
    );
  }
  if (!data) notFound();
  const car = data as unknown as CarWithRelations;
  if (car.lister_id !== user.id) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit car"
        description={car.title}
        actions={
          car.status !== 'draft' ? (
            <Link
              href={`/cars/${car.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline' })}
            >
              <ExternalLink className="mr-1 h-4 w-4" aria-hidden="true" /> View on website
            </Link>
          ) : undefined
        }
      />
      <CarForm
        mode="edit"
        actor="lister"
        car={car}
        listerId={user.id}
        afterSaveHref="/lister/cars"
        cancelHref="/lister/cars"
      />
    </div>
  );
}
