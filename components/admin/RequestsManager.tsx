'use client';

import { useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Mail, MapPin, Phone, RefreshCw, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { formatDate, timeAgo } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Profile, RequestStatus } from '@/types/database';
import { CreateUserModal } from './CreateUserModal';
import { CredentialsModal } from './CredentialsModal';
import { ErrorNotice } from './ErrorNotice';
import type { LoginCredentials, RequestRow } from './types';

const TABS: { value: RequestStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function RequestsManager({
  requests,
  counts,
  status,
  page,
  pageCount,
  loadError,
}: {
  requests: RequestRow[];
  counts: Record<RequestStatus, number>;
  status: RequestStatus;
  page: number;
  pageCount: number;
  loadError: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const noteId = useId();
  const [refreshing, startRefresh] = useTransition();
  const [approving, setApproving] = useState<RequestRow | null>(null);
  const [credentials, setCredentials] = useState<LoginCredentials | null>(null);
  const [rejecting, setRejecting] = useState<RequestRow | null>(null);
  const [note, setNote] = useState('');
  const [rejectBusy, setRejectBusy] = useState(false);
  const [deleting, setDeleting] = useState<RequestRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  function handleCreated(result: { user: Profile; password: string }) {
    setApproving(null);
    setCredentials({ role: 'lister', name: result.user.full_name, email: result.user.email, password: result.password, phone: result.user.phone });
    toast({ title: 'Lister created and request approved', variant: 'success' });
    router.refresh();
  }

  async function reject() {
    if (!rejecting) return;
    setRejectBusy(true);
    try {
      const { data, error } = await createClient()
        .from('lister_requests')
        .update({ status: 'rejected', admin_note: note.trim(), reviewed_at: new Date().toISOString() })
        .eq('id', rejecting.id)
        .select('id');
      if (error || !data || data.length === 0) throw new Error('The request could not be updated.');
      toast({ title: 'Request rejected', variant: 'success' });
      setRejecting(null);
      router.refresh();
    } catch (err) {
      toast({ title: 'Could not reject the request', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setRejectBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const { data, error } = await createClient().from('lister_requests').delete().eq('id', deleting.id).select('id');
      if (error || !data || data.length === 0) throw new Error('The request could not be deleted.');
      toast({ title: 'Request deleted', variant: 'success' });
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast({ title: 'Could not delete the request', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setDeleteBusy(false);
    }
  }

  const tabHref = (s: RequestStatus) => `/admin/requests?status=${s}`;
  const pageHref = (p: number) => `/admin/requests?status=${status}${p > 1 ? `&page=${p}` : ''}`;

  return (
    <>
      <PageHeader
        title="Requests"
        description="People who asked to list their cars. Approve to create a lister account."
        actions={
          <Button type="button" variant="outline" loading={refreshing} onClick={() => startRefresh(() => router.refresh())}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div role="tablist" aria-label="Request status" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-muted p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
            role="tab"
            aria-selected={status === tab.value}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              status === tab.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <Badge variant={tab.value === 'pending' && counts.pending > 0 ? 'warning' : 'muted'}>{counts[tab.value]}</Badge>
          </Link>
        ))}
      </div>

      {loadError ? (
        <ErrorNotice />
      ) : requests.length === 0 ? (
        <EmptyState title={`No ${status} requests`} description={status === 'pending' ? 'New requests from the website will show up here.' : undefined} />
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground" title={formatDate(r.created_at)} suppressHydrationWarning>
                    Received {timeAgo(r.created_at)}
                  </p>
                </div>
                <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'danger'}>
                  {r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : 'Rejected'}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Mail className="h-4 w-4" aria-hidden="true" />{r.email}</a>
                <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone className="h-4 w-4" aria-hidden="true" />{r.phone}</a>
                {(r.city || r.country) && (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{[r.city, r.country].filter(Boolean).join(', ')}</span>
                )}
              </div>
              {r.message && <p className="mt-3 whitespace-pre-line rounded-xl bg-muted p-3 text-sm">{r.message}</p>}
              {r.admin_note && <p className="mt-2 text-sm text-muted-foreground">Admin note: {r.admin_note}</p>}
              {r.status === 'approved' && (
                <p className="mt-2 text-sm">
                  Lister account:{' '}
                  {r.lister ? (
                    <Link href="/admin/listers" className="font-medium text-primary hover:underline">{r.lister.full_name || r.lister.email}</Link>
                  ) : (
                    <span className="text-muted-foreground">no longer exists</span>
                  )}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {r.status === 'pending' && (
                  <>
                    <Button type="button" size="sm" onClick={() => setApproving(r)}>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setNote(''); setRejecting(r); }}>
                      <X className="h-4 w-4" aria-hidden="true" />
                      Reject
                    </Button>
                  </>
                )}
                <Button type="button" size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setDeleting(r)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="mt-4">
          <Pagination page={page} pageCount={pageCount} buildHref={pageHref} />
        </div>
      )}

      <CreateUserModal
        open={Boolean(approving)}
        role="lister"
        requestId={approving?.id}
        initial={approving ? { full_name: approving.full_name, email: approving.email, phone: approving.phone, city: approving.city } : undefined}
        onClose={() => setApproving(null)}
        onCreated={handleCreated}
      />

      <CredentialsModal credentials={credentials} title="Lister created" showWhatsApp onClose={() => setCredentials(null)} />

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        dismissible={!rejectBusy}
        title="Reject request"
        description={rejecting ? `Reject the request from ${rejecting.full_name}? No message is sent to them.` : undefined}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setRejecting(null)} disabled={rejectBusy}>Cancel</Button>
            <Button type="button" variant="danger" onClick={() => void reject()} loading={rejectBusy}>Reject request</Button>
          </>
        }
      >
        <Field label="Note (optional)" htmlFor={noteId} hint="Only visible to admins.">
          <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this request?"
        description={deleting?.status === 'approved' ? 'The lister account stays. Only the request record is removed.' : 'This cannot be undone.'}
        confirmLabel="Delete request"
        danger
        loading={deleteBusy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
