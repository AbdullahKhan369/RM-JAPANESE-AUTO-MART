import { Badge } from '@/components/ui/Badge';
import { CAR_STATUSES } from '@/lib/constants';
import { optionLabel } from '@/lib/format';
import type { CarStatus } from '@/types/database';

const VARIANT: Record<CarStatus, 'warning' | 'success' | 'info'> = {
  draft: 'warning',
  published: 'success',
  sold: 'info',
};

export function StatusBadge({ status }: { status: CarStatus }) {
  return <Badge variant={VARIANT[status] ?? 'muted'}>{optionLabel(CAR_STATUSES, status)}</Badge>;
}
