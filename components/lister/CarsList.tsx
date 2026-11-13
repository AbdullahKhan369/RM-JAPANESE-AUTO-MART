'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car as CarIcon, CheckCircle2, Eye, EyeOff, ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { deleteCar, describeError, setCarStatus } from '@/lib/car-actions';
import { formatEur } from '@/lib/currency';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CarStatus } from '@/types/database';
import { Button, buttonVariants } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { ActionMenu } from './ActionMenu';
import type { ActionMenuItem } from './ActionMenu';
import { CarThumb } from './CarThumb';
import { StatusBadge } from './StatusBadge';
import type { ListCar } from './types';

export type StatusFilter = 'all' | CarStatus;

interface CarsListProps {
  cars: ListCar[];
  total: number;
  page: number;
  pageCount: number;
  q: string;
  status: StatusFilter;
}

const TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'sold', label: 'Sold' },
];

function buildHref(q: string, status: StatusFilter, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status !== 'all') params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/lister/cars?${qs}` : '/lister/cars';
}

export function CarsList({ cars, total, page, pageCount, q, status }: CarsListProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const [rows, setRows] = useState<ListCar[]>(cars);
  const [search, setSearch] = useState(q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ListCar | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setRows(cars), [cars]);
  useEffect(() => setSearch(q), [q]);

  async function changeStatus(car: ListCar, next: CarStatus, doneTitle: string) {
    if (busyId) return;
    const previous = rows;
    setBusyId(car.id);
    setRows((r) => r.map((x) => (x.id === car.id ? { ...x, status: next } : x)));
    try {
      await setCarStatus(supabase, car.id, next);
      toast({ title: doneTitle, description: car.title, variant: 'success' });
      router.refresh();
    } catch (err) {
      setRows(previous);
      toast({
        title: 'Could not update the car',
        description: describeError(err, 'Please try again.'),
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const car = toDelete;
    const previous = rows;
    setDeleting(true);
    setRows((r) => r.filter((x) => x.id !== car.id));
    try {
      await deleteCar(supabase, car.id);
      toast({ title: 'Car deleted', description: car.title, variant: 'success' });
      setToDelete(null);
      router.refresh();
    } catch (err) {
      setRows(previous);
      toast({
        title: 'Could not delete the car',
        description: describeError(err, 'Please try again.'),
        variant: 'error',
      });
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  function menuItems(car: ListCar): ActionMenuItem[] {
    const items: ActionMenuItem[] = [];
    if (car.status === 'published') {
      items.push({
        key: 'unpublish',
        label: 'Unpublish (move to draft)',
        icon: <EyeOff className="h-4 w-4" aria-hidden="true" />,
        onSelect: () => void changeStatus(car, 'draft', 'Car unpublished'),
      });
    } else {
      items.push({
        key: 'publish',
        label: 'Publish',
        icon: <Eye className="h-4 w-4" aria-hidden="true" />,
        onSelect: () => void changeStatus(car, 'published', 'Car published'),
      });
    }
    if (car.status !== 'sold') {
      items.push({
        key: 'sold',
        label: 'Mark as sold',
        icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
        onSelect: () => void changeStatus(car, 'sold', 'Car marked as sold'),
      });
    }
    if (car.status !== 'draft') {
      items.push({
        key: 'view',
        label: 'View on website',
        icon: <ExternalLink className="h-4 w-4" aria-hidden="true" />,
        href: `/cars/${car.id}`,
        external: true,
      });
    }
    items.push({
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
      danger: true,
      onSelect: () => setToDelete(car),
    });
    return items;
  }

  const filtered = q !== '' || status !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = tab.value === status;
            return (
              <Link
                key={tab.value}
                href={buildHref(q, tab.value, 1)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 ring-ring',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(buildHref(search.trim(), status, 1));
          }}
          className="flex w-full gap-2 lg:max-w-sm"
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title"
              aria-label="Search your cars by title"
              className="pl-9"
              maxLength={80}
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<CarIcon className="h-8 w-8" aria-hidden="true" />}
          title={filtered ? 'No cars match your filters' : 'You have not added any cars yet'}
          description={
            filtered
              ? 'Try a different search or switch to another tab.'
              : 'Add your first car to start building your stock.'
          }
          action={
            filtered ? (
              <Link href="/lister/cars" className={buttonVariants({ variant: 'outline' })}>
                Clear filters
              </Link>
            ) : (
              <Link href="/lister/cars/new" className={buttonVariants({ variant: 'primary' })}>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add a car
              </Link>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? 'car' : 'cars'}
          </p>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <Tr>
                  <Th>Car</Th>
                  <Th>Price</Th>
                  <Th>Year</Th>
                  <Th>Status</Th>
                  <Th>Updated</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </Tr>
              </THead>
              <TBody>
                {rows.map((car) => (
                  <Tr key={car.id} className={cn(busyId === car.id && 'opacity-60')}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <CarThumb images={car.images} alt="" className="w-20 shrink-0" />
                        <Link
                          href={`/lister/cars/${car.id}/edit`}
                          className="line-clamp-2 font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 ring-ring rounded"
                        >
                          {car.title}
                        </Link>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">{formatEur(Number(car.price_eur))}</Td>
                    <Td>{car.year}</Td>
                    <Td>
                      <StatusBadge status={car.status} />
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{timeAgo(car.updated_at)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/lister/cars/${car.id}/edit`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          <Pencil className="mr-1 h-4 w-4" aria-hidden="true" /> Edit
                        </Link>
                        <ActionMenu label="More" items={menuItems(car)} disabled={busyId === car.id} />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((car) => (
              <li
                key={car.id}
                className={cn('rounded-2xl border border-border bg-card p-3', busyId === car.id && 'opacity-60')}
              >
                <div className="flex gap-3">
                  <CarThumb images={car.images} alt="" className="w-24 shrink-0 self-start" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/lister/cars/${car.id}/edit`}
                      className="line-clamp-2 font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 ring-ring rounded"
                    >
                      {car.title}
                    </Link>
                    <p className="mt-0.5 text-sm font-medium text-foreground">{formatEur(Number(car.price_eur))}</p>
                    <p className="text-xs text-muted-foreground">
                      {car.year} · {timeAgo(car.updated_at)}
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge status={car.status} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Link
                    href={`/lister/cars/${car.id}/edit`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    <Pencil className="mr-1 h-4 w-4" aria-hidden="true" /> Edit
                  </Link>
                  <ActionMenu label="More" items={menuItems(car)} disabled={busyId === car.id} />
                </div>
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <Pagination page={page} pageCount={pageCount} buildHref={(p) => buildHref(q, status, p)} />
          )}
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this car?"
        description={
          toDelete
            ? `"${toDelete.title}" and all its photos will be permanently deleted. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete car"
        danger
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
