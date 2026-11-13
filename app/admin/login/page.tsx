import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/layout/Logo';
import { getSessionProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Admin sign in',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getSessionProfile();
  if (session && session.profile.role === 'admin' && session.profile.is_active) {
    redirect('/admin/dashboard');
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage cars, sellers and website content.</p>
          <div className="mt-6">
            <Suspense fallback={null}>
              <LoginForm role="admin" redirectTo="/admin/dashboard" />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
