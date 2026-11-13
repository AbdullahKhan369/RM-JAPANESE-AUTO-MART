import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Card, CardContent } from '@/components/ui/Card';
import { getSessionProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Seller sign in',
  robots: { index: false, follow: false },
};

export default async function ListerLoginPage() {
  const session = await getSessionProfile();
  if (session && session.profile.role === 'lister' && session.profile.is_active) {
    redirect('/lister/dashboard');
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>
        <Card>
          <CardContent>
            <h1 className="text-xl font-semibold">Seller sign in</h1>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">Sign in to manage your car listings.</p>
            <Suspense fallback={<div className="h-48" aria-hidden="true" />}>
              <LoginForm role="lister" redirectTo="/lister/dashboard" />
            </Suspense>
            <p className="mt-5 text-xs text-muted-foreground">
              Use the email and password given to you by the admin. Forgot it? Ask your admin to reset it.
            </p>
          </CardContent>
        </Card>
        <div className="text-center">
          <Link
            href="/lister"
            className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
          </Link>
        </div>
      </div>
    </main>
  );
}
