import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ErrorNotice } from '@/components/admin/ErrorNotice';
import { OwnerCard, type OwnerOption } from '@/components/admin/OwnerCard';
import { UUID_RE } from '@/components/admin/params';
import { CarForm } from '@/components/car-form/CarForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { CAR_SELECT } from '@/lib/constants';
import { sortedImages } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { CarWithRelations } from '@/types/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Edit car' };

export default async function AdminEditCarPage({ params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) notFound();
  const supabase = createClient();

  const [carRes, listersRes] = await Promise.all([
    supabase.from('cars').select(CAR_SELECT).eq('id', params.id).maybeSingle(),
    supabase.from('profiles').select('id, full_name, email, is_active').eq('role', 'lister').order('full_name', { ascending: true }),
  ]);

  if (carRes.error || listersRes.error) {
    return (
      <>
        <PageHeader title="Edit car" />
        <ErrorNotice />
      </>
    );
  }
  if (!carRes.data) notFound();

  const raw = carRes.data as unknown as CarWithRelations;
  const car: CarWithRelations = { ...raw, images: sortedImages(raw.images ?? []) };
  const listers = (listersRes.data ?? []) as OwnerOption[];

  return (
    <>
      <PageHeader title="Edit car" description={car.title} />
      <OwnerCard carId={car.id} ownerId={car.lister_id} listers={listers} />
      <CarForm key={`${car.id}-${car.lister_id}`} mode="edit" actor="admin" car={car} afterSaveHref="/admin/cars" cancelHref="/admin/cars" />
    </>
  );
}
