'use client';

import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={<CircleAlert className="h-8 w-8 text-danger" aria-hidden="true" />}
      title="This page could not be loaded"
      description="Something went wrong while loading your data. Check your connection and try again."
      action={
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
