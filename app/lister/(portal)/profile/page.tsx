import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { PasswordForm, ProfileForm } from '@/components/lister/ProfileForms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Profile', robots: { index: false, follow: false } };

export default async function ListerProfilePage() {
  const { user, profile } = await requireRole('lister');
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your name, phone and city are shown to buyers on your cars." />
      <ProfileForm
        userId={user.id}
        email={profile.email}
        initial={{ full_name: profile.full_name ?? '', phone: profile.phone ?? '', city: profile.city ?? '' }}
      />
      <PasswordForm />
    </div>
  );
}
