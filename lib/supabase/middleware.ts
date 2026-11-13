import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isProtectedPath(path: string): boolean {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (clean === '/lister' || clean === '/lister/login') return false;
  if (clean === '/admin' || clean === '/admin/login') return false;
  return clean.startsWith('/lister/') || clean.startsWith('/admin/');
}

function loginPathFor(path: string): string {
  return path.startsWith('/admin') ? '/admin/login' : '/lister/login';
}

/**
 * Refreshes the Supabase session cookie and redirects visitors without a session
 * from protected /lister and /admin pages to the matching login page (?next=...).
 * Role and active checks are done by requireRole() in the portal layouts.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const path = request.nextUrl.pathname;
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));

  const redirectToLogin = (): NextResponse => {
    const target = request.nextUrl.clone();
    target.pathname = loginPathFor(path);
    target.search = '';
    target.searchParams.set('next', `${path}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  // Public visitors without any auth cookie: skip the network call to Supabase.
  if (!hasAuthCookie) {
    return isProtectedPath(path) ? redirectToLogin() : response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  if (!userId && isProtectedPath(path)) return redirectToLogin();
  return response;
}
