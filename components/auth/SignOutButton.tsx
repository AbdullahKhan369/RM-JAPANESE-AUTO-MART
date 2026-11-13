'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

export function SignOutButton({
  redirectTo,
  className,
  children,
}: {
  redirectTo: string;
  className?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace(redirectTo);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
        className,
      )}
    >
      {loading ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
      {children ?? 'Sign out'}
    </button>
  );
}
