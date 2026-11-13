import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PortalShell } from '@/components/layout/PortalShell';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Admin Panel', template: '%s | Admin Panel' },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireRole('admin');
  const supabase = createClient();
  const { count } = await supabase
    .from('lister_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  const pending = count ?? 0;

  return (
    <PortalShell
      title="Admin Panel"
      nav={[
        { href: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { href: '/admin/cars', label: 'Cars', icon: 'cars' },
        { href: '/admin/cars/new', label: 'Add Car', icon: 'add' },
        { href: '/admin/listers', label: 'Listers', icon: 'users' },
        { href: '/admin/admins', label: 'Admins', icon: 'shield' },
        { href: '/admin/requests', label: 'Requests', icon: 'requests', badge: pending > 0 ? pending : undefined },
        { href: '/admin/content', label: 'Website Text', icon: 'content' },
        { href: '/admin/catalog', label: 'Makes & Models', icon: 'catalog' },
        { href: '/admin/rates', label: 'Exchange Rates', icon: 'rates' },
      ]}
      user={{ name: profile.full_name || profile.email, email: profile.email }}
      signOutRedirect="/admin/login"
    >
      {children}
    </PortalShell>
  );
}
