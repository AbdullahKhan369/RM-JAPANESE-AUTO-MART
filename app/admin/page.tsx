import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminIndexPage() {
  const session = await getSessionProfile();
  if (session && session.profile.role === 'admin' && session.profile.is_active) {
    redirect('/admin/dashboard');
  }
  redirect('/admin/login');
}
