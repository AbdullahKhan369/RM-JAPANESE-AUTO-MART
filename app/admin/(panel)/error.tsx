'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AdminPanelError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
      title="Something went wrong"
      description="This page could not be loaded. Please try again."
      action={<Button type="button" onClick={reset}>Try again</Button>}
    />
  );
}
