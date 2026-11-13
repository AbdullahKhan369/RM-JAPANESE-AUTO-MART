'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';

/** Only follows ?next= when it is a path inside the matching area (no open redirect). */
function safeNext(role: 'lister' | 'admin', fallback: string): string {
  try {
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith(`/${role}`) && !next.startsWith('//')) return next;
  } catch {
    // ignore
  }
  return fallback;
}

export function LoginForm({ role, redirectTo }: { role: 'lister' | 'admin'; redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !data.user) {
        setError('Incorrect email or password.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role,is_active')
        .eq('id', data.user.id)
        .maybeSingle();
      const row = profile as Pick<Profile, 'role' | 'is_active'> | null;

      if (!row || row.role !== role || !row.is_active) {
        await supabase.auth.signOut();
        setError('This account cannot sign in here.');
        return;
      }

      router.replace(safeNext(role, redirectTo));
      router.refresh();
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" htmlFor={`${role}-email`} required>
        <Input
          id={`${role}-email`}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={!!error}
        />
      </Field>

      <Field label="Password" htmlFor={`${role}-password`} required>
        <div className="relative">
          <Input
            id={`${role}-password`}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!error}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </Field>

      {error ? (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Sign in
      </Button>
    </form>
  );
}
