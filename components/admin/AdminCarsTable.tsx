'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car as CarIcon, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Table, TBody, THead, Td, Th, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { deleteCar, setCarFeatured, setCarStatus } from '@/lib/car-actions';
import { CAR_STATUSES } from '@/lib/constants';
import { formatEur } from '@/lib/currency';
import { createClient } from '@/lib/supabase/client';
import type { CarStatus } from '@/types/database';
import type { AdminCarRow } from './types';

const statusVariant: Record<CarStatus, 'muted' | 'success' | 'info'> = {
  draft: 'muted',
  published: 'success',
  sold: 'info',
};

type Override = { status?: CarStatus; is_featured?: boolean };

function Thumb({ url, title }: { url: string | null; title: string }) {
  if (!url) {
    return (
      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
        <CarIcon className="h-5 w-5" />
      </div>
    );
  }
  return <img src={url} alt={title} width={64} height={48} loading="lazy" className="h-12 w-16 shrink-0 rounded-lg bg-muted object-cover" />;
}

export function AdminCarsTable({ rows }: { rows: AdminCarRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminCarRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setOverrides({}), [rows]);

  const statusOf = (r: AdminCarRow): CarStatus => overrides[r.id]?.status ?? r.status;
  const featuredOf = (r: AdminCarRow): boolean => overrides[r.id]?.is_featured ?? r.is_featured;

  function patch(id: string, value: Override | null) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value) next[id] = { ...next[id], ...value };
      else delete next[id];
      return next;
    });
  }

  async function changeStatus(row: AdminCarRow, status: CarStatus) {
    setBusy(row.id);
    patch(row.id, { status });
    try {
      await setCarStatus(createClient(), row.id, status);
      toast({ title: 'Status updated', variant: 'success' });
      router.refresh();
    } catch (err) {
      patch(row.id, { status: row.status });
      toast({ title: 'Could not update status', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function changeFeatured(row: AdminCarRow, featured: boolean) {
    setBusy(row.id);
    patch(row.id, { is_featured: featured });
    try {
      await setCarFeatured(createClient(), row.id, featured);
      toast({ title: featured ? 'Car featured' : 'Car no longer featured', variant: 'success' });
      router.refresh();
    } catch (err) {
      patch(row.id, { is_featured: row.is_featured });
      toast({ title: 'Could not update the car', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCar(createClient(), toDelete.id);
      toast({ title: 'Car deleted', variant: 'success' });
      setToDelete(null);
      router.refresh();
    } catch (err) {
      toast({ title: 'Could not delete the car', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  const statusSelect = (row: AdminCarRow) => (
    <Select
      value={statusOf(row)}
      onChange={(e) => void changeStatus(row, e.target.value as CarStatus)}
      disabled={busy === row.id}
      aria-label={`Status of ${row.title}`}
      className="h-9 py-1 text-sm"
    >
      {CAR_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </Select>
  );

  const viewLink = (row: AdminCarRow, full: boolean) =>
    statusOf(row) !== 'draft' && (
      <a
        href={`/cars/${row.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: full ? 'outline' : 'ghost', size: 'sm' })}
        aria-label="View on website"
        title="View on website"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        {full && 'View'}
      </a>
    );

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <THead>
            <Tr>
              <Th>Car</Th>
              <Th>Price</Th>
              <Th>Lister</Th>
              <Th>Status</Th>
              <Th>Featured</Th>
              <Th>Change status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <div className="flex min-w-[14rem] items-center gap-3">
                    <Thumb url={row.thumb_url} title={row.title} />
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">{row.year}</p>
                    </div>
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{formatEur(row.price_eur)}</Td>
                <Td>{row.lister_name}</Td>
                <Td><Badge variant={statusVariant[statusOf(row)]}>{CAR_STATUSES.find((s) => s.value === statusOf(row))?.label}</Badge></Td>
                <Td>
                  <div role="group" aria-label={`Featured: ${row.title}`}>
                    <Switch checked={featuredOf(row)} onChange={(v) => void changeFeatured(row, v)} disabled={busy === row.id} />
                  </div>
                </Td>
                <Td>{statusSelect(row)}</Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/cars/${row.id}/edit`} className={buttonVariants({ variant: 'ghost', size: 'sm' })} aria-label="Edit" title="Edit">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    {viewLink(row, false)}
                    <Button type="button" variant="ghost" size="sm" onClick={() => setToDelete(row)} aria-label="Delete" title="Delete" className="text-danger hover:text-danger">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex gap-3">
              <Thumb url={row.thumb_url} title={row.title} />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-semibold">{row.title}</p>
                <p className="text-sm text-muted-foreground">{formatEur(row.price_eur)} · {row.lister_name}</p>
              </div>
              <Badge variant={statusVariant[statusOf(row)]}>{CAR_STATUSES.find((s) => s.value === statusOf(row))?.label}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <Switch checked={featuredOf(row)} onChange={(v) => void changeFeatured(row, v)} disabled={busy === row.id} label="Featured" />
              <div className="w-36">{statusSelect(row)}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/admin/cars/${row.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
              {viewLink(row, true)}
              <Button type="button" variant="danger" size="sm" onClick={() => setToDelete(row)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this car?"
        description={toDelete ? `“${toDelete.title}” and all of its photos will be deleted permanently.` : undefined}
        confirmLabel="Delete car"
        danger
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
