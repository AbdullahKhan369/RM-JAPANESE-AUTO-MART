import type { ComponentProps, ReactNode } from 'react';
import type { Metadata } from 'next';
import { PortalShell } from '@/components/layout/PortalShell';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Seller Portal',
  robots: { index: false, follow: false },
};

const NAV: ComponentProps<typeof PortalShell>['nav'] = [
  { href: '/lister/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/lister/cars', label: 'My Cars', icon: 'cars' },
  { href: '/lister/cars/new', label: 'Add Car', icon: 'add' },
  { href: '/lister/profile', label: 'Profile', icon: 'profile' },
];

export default async function ListerPortalLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireRole('lister');
  return (
    <PortalShell
      title="Seller Portal"
      nav={NAV}
      user={{ name: profile.full_name || profile.email, email: profile.email }}
      signOutRedirect="/lister/login"
    >
      {children}
    </PortalShell>
  );
}
