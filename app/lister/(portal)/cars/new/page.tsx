import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { CarForm } from '@/components/car-form/CarForm';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Add a car', robots: { index: false, follow: false } };

export default async function NewCarPage() {
  const { user } = await requireRole('lister');
  return (
    <div className="space-y-6">
      <PageHeader title="Add a car" description="Fill in the steps. You can save a draft at any time." />
      <CarForm
        mode="create"
        actor="lister"
        listerId={user.id}
        afterSaveHref="/lister/cars"
        cancelHref="/lister/cars"
      />
    </div>
  );
}
