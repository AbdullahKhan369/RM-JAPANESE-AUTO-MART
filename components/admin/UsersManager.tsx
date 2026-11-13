'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, KeyRound, Pencil, Plus, Search, Trash2, UserCheck, UserX, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Table, TBody, THead, Td, Th, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/database';
import { adminFetch } from './api';
import { CreateUserModal } from './CreateUserModal';
import { CredentialsModal } from './CredentialsModal';
import { ErrorNotice } from './ErrorNotice';
import type { LoginCredentials, UserRow } from './types';
import { DeleteUserModal, EditUserModal, ResetPasswordModal } from './UserDialogs';

type Dialog =
  | { type: 'create' }
  | { type: 'edit'; user: UserRow }
  | { type: 'password'; user: UserRow }
  | { type: 'toggle'; user: UserRow }
  | { type: 'delete'; user: UserRow }
  | null;

export function UsersManager({
  role,
  currentUserId,
  users,
  total,
  page,
  pageCount,
  q,
  loadError,
}: {
  role: 'lister' | 'admin';
  currentUserId: string;
  users: UserRow[];
  total: number;
  page: number;
  pageCount: number;
  q: string;
  loadError: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [credentials, setCredentials] = useState<LoginCredentials | null>(null);
  const [credentialsTitle, setCredentialsTitle] = useState('');
  const [search, setSearch] = useState(q);
  const [toggling, setToggling] = useState(false);

  const isLister = role === 'lister';
  const base = isLister ? '/admin/listers' : '/admin/admins';
  const noun = isLister ? 'lister' : 'admin';

  function hrefFor(p: number, query = q): string {
    const sp = new URLSearchParams();
    if (query) sp.set('q', query);
    if (p > 1) sp.set('page', String(p));
    const s = sp.toString();
    return s ? `${base}?${s}` : base;
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(hrefFor(1, search.trim()));
  }

  function showCredentials(c: LoginCredentials, title: string) {
    setCredentials(c);
    setCredentialsTitle(title);
  }

  function handleCreated(result: { user: Profile; password: string }) {
    setDialog(null);
    showCredentials(
      { role, name: result.user.full_name, email: result.user.email, password: result.password, phone: result.user.phone },
      `${isLister ? 'Lister' : 'Admin'} created`,
    );
    toast({ title: `${isLister ? 'Lister' : 'Admin'} created`, variant: 'success' });
    router.refresh();
  }

  async function handleToggle(user: UserRow) {
    setToggling(true);
    try {
      await adminFetch(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { is_active: !user.is_active } });
      toast({ title: user.is_active ? 'Account disabled' : 'Account enabled', variant: 'success' });
      setDialog(null);
      router.refresh();
    } catch (err) {
      toast({ title: 'Could not update the account', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setToggling(false);
    }
  }

  function actions(user: UserRow, full: boolean): ReactNode {
    const isSelf = user.id === currentUserId;
    const iconCls = 'h-4 w-4';
    const mk = (label: string, icon: ReactNode, onClick: () => void, danger = false) =>
      full ? (
        <Button type="button" variant={danger ? 'danger' : 'outline'} size="sm" onClick={onClick}>
          {icon}
          {label}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          aria-label={label}
          title={label}
          className={danger ? 'text-danger hover:text-danger' : undefined}
        >
          {icon}
        </Button>
      );
    return (
      <div className={cn('flex flex-wrap items-center gap-1', !full && 'justify-end')}>
        {mk('Edit', <Pencil className={iconCls} aria-hidden="true" />, () => setDialog({ type: 'edit', user }))}
        {mk('Reset password', <KeyRound className={iconCls} aria-hidden="true" />, () => setDialog({ type: 'password', user }))}
        {!isSelf &&
          mk(
            user.is_active ? 'Disable' : 'Enable',
            user.is_active ? <UserX className={iconCls} aria-hidden="true" /> : <UserCheck className={iconCls} aria-hidden="true" />,
            () => (user.is_active ? setDialog({ type: 'toggle', user }) : void handleToggle(user)),
          )}
        {isLister && (
          <Link
            href={`/admin/cars?lister=${user.id}`}
            className={buttonVariants({ variant: full ? 'outline' : 'ghost', size: 'sm' })}
            aria-label="View cars"
            title="View cars"
          >
            <Car className={iconCls} aria-hidden="true" />
            {full && 'View cars'}
          </Link>
        )}
        {!isSelf && mk('Delete', <Trash2 className={iconCls} aria-hidden="true" />, () => setDialog({ type: 'delete', user }), true)}
      </div>
    );
  }

  const statusBadge = (user: UserRow) => (
    <Badge variant={user.is_active ? 'success' : 'muted'}>{user.is_active ? 'Active' : 'Disabled'}</Badge>
  );

  return (
    <>
      <PageHeader
        title={isLister ? 'Listers' : 'Admins'}
        description={isLister ? 'RM team members who can post and manage their own cars.' : 'People who can manage everything in this panel.'}
        actions={
          <Button type="button" onClick={() => setDialog({ type: 'create' })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create {noun}
          </Button>
        }
      />

      <form onSubmit={submitSearch} role="search" className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone or city"
            aria-label={`Search ${noun}s`}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">Search</Button>
        {q && (
          <Link href={base} className={buttonVariants({ variant: 'ghost' })} aria-label="Clear search">
            <X className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </form>

      {loadError ? (
        <ErrorNotice />
      ) : users.length === 0 ? (
        <EmptyState
          title={q ? 'No results' : `No ${noun}s yet`}
          description={q ? 'Try a different search.' : `Create the first ${noun} to get started.`}
          action={!q ? <Button type="button" onClick={() => setDialog({ type: 'create' })}>Create {noun}</Button> : undefined}
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">{total} {total === 1 ? noun : `${noun}s`}</p>

          <div className="hidden md:block">
            <Table>
              <THead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>City</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  {isLister && <Th>Cars</Th>}
                  <Th className="text-right">Actions</Th>
                </Tr>
              </THead>
              <TBody>
                {users.map((user) => (
                  <Tr key={user.id}>
                    <Td className="whitespace-nowrap font-medium">
                      {user.full_name || '–'}
                      {user.id === currentUserId && <Badge variant="info">You</Badge>}
                    </Td>
                    <Td>{user.email}</Td>
                    <Td className="whitespace-nowrap">{user.phone || '–'}</Td>
                    <Td>{user.city || '–'}</Td>
                    <Td>{statusBadge(user)}</Td>
                    <Td className="whitespace-nowrap">{formatDate(user.created_at)}</Td>
                    {isLister && <Td>{user.car_count ?? '–'}</Td>}
                    <Td>{actions(user, false)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {users.map((user) => (
              <li key={user.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {user.full_name || '–'} {user.id === currentUserId && <Badge variant="info">You</Badge>}
                    </p>
                    <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  {statusBadge(user)}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{user.phone || '–'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">City</dt><dd>{user.city || '–'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Created</dt><dd>{formatDate(user.created_at)}</dd></div>
                  {isLister && <div><dt className="text-xs text-muted-foreground">Cars</dt><dd>{user.car_count ?? '–'}</dd></div>}
                </dl>
                <div className="mt-3">{actions(user, true)}</div>
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <div className="mt-4">
              <Pagination page={page} pageCount={pageCount} buildHref={(p) => hrefFor(p)} />
            </div>
          )}
        </>
      )}

      <CreateUserModal open={dialog?.type === 'create'} role={role} onClose={() => setDialog(null)} onCreated={handleCreated} />

      <EditUserModal
        user={dialog?.type === 'edit' ? dialog.user : null}
        onClose={() => setDialog(null)}
        onSaved={() => {
          setDialog(null);
          toast({ title: 'Changes saved', variant: 'success' });
          router.refresh();
        }}
      />

      <ResetPasswordModal
        user={dialog?.type === 'password' ? dialog.user : null}
        onClose={() => setDialog(null)}
        onDone={(user, password) => {
          setDialog(null);
          showCredentials({ role, name: user.full_name, email: user.email, password, phone: user.phone }, 'Password reset');
          toast({ title: 'Password reset', variant: 'success' });
        }}
      />

      <DeleteUserModal
        user={dialog?.type === 'delete' ? dialog.user : null}
        role={role}
        onClose={() => setDialog(null)}
        onDeleted={() => {
          setDialog(null);
          toast({ title: `${isLister ? 'Lister' : 'Admin'} deleted`, variant: 'success' });
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={dialog?.type === 'toggle'}
        title="Disable this account?"
        description={
          dialog?.type === 'toggle'
            ? `${dialog.user.full_name || dialog.user.email} will be signed out and cannot log in.${isLister ? ' Their cars disappear from the website until you enable the account again.' : ''}`
            : undefined
        }
        confirmLabel="Disable"
        danger
        loading={toggling}
        onConfirm={() => {
          if (dialog?.type === 'toggle') void handleToggle(dialog.user);
        }}
        onCancel={() => setDialog(null)}
      />

      <CredentialsModal credentials={credentials} title={credentialsTitle} onClose={() => setCredentials(null)} />
    </>
  );
}
