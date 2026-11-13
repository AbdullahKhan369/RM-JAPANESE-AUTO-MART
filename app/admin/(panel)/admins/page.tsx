import type { Metadata } from 'next';
import { ErrorNotice } from '@/components/admin/ErrorNotice';
import type { SearchParams } from '@/components/admin/params';
import { loadUsersPage } from '@/components/admin/users-loader';
import { UsersManager } from '@/components/admin/UsersManager';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admins' };

export default async function AdminAdminsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireRole('admin');
  const data = await loadUsersPage('admin', searchParams);
  return data.loadError && data.users.length === 0 && !data.q ? (
    <ErrorNotice />
  ) : (
    <UsersManager role="admin" currentUserId={user.id} {...data} />
  );
}
