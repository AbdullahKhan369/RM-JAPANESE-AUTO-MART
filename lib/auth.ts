import 'server-only';
import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

/** Current user + profile row, or null if there is no session or no profile. */
export async function getSessionProfile(): Promise<{ user: User; profile: Profile } | null> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profileError || !profile) return null;

  return { user: userData.user, profile: profile as Profile };
}

/** Redirects to the matching login page unless the user has the role and is active. */
export async function requireRole(
  role: 'lister' | 'admin',
): Promise<{ user: User; profile: Profile }> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== role || !session.profile.is_active) {
    redirect(role === 'admin' ? '/admin/login' : '/lister/login');
  }
  return session;
}

/** For route handlers: returns a ready 401/403 JSON response when access is denied. */
export async function requireAdminApi(): Promise<
  | { ok: true; user: User; profile: Profile }
  | { ok: false; response: NextResponse }
> {
  const session = await getSessionProfile();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) };
  }
  if (session.profile.role !== 'admin' || !session.profile.is_active) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'You do not have permission to do this.' }, { status: 403 }),
    };
  }
  return { ok: true, user: session.user, profile: session.profile };
}
