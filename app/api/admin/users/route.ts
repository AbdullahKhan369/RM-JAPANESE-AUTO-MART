import { requireAdminApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { generatePassword } from '@/lib/utils';
import type { Profile } from '@/types/database';
import { createUserSchema, firstZodMessage, isDuplicateEmailError, jsonError, jsonOk, readJson } from '../_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = createUserSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);

  const { role, email, full_name, phone, request_id } = parsed.data;
  const city = parsed.data.city ?? '';
  const password = parsed.data.password ?? generatePassword();

  try {
    const admin = createAdminClient();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone },
      app_metadata: { role },
    });

    if (createError || !created?.user) {
      if (createError && isDuplicateEmailError(createError)) {
        return jsonError('A user with this email already exists.', 409);
      }
      const weakPassword = createError?.status === 422;
      return jsonError(
        weakPassword ? createError.message : 'Could not create the user. Please try again.',
        weakPassword ? 400 : 500,
      );
    }

    const userId = created.user.id;

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .update({ city })
      .eq('id', userId)
      .select('*')
      .single();

    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(userId);
      return jsonError('Could not finish creating the user. Nothing was saved.', 500);
    }

    if (request_id) {
      await admin
        .from('lister_requests')
        .update({ status: 'approved', lister_id: userId, reviewed_at: new Date().toISOString() })
        .eq('id', request_id)
        .eq('status', 'pending');
    }

    return jsonOk({ user: profile as Profile, password }, 201);
  } catch {
    return jsonError('Something went wrong. Please try again.', 500);
  }
}
