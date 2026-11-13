import { requireAdminApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/types/database';
import {
  collectUserStoragePaths,
  countOtherActiveAdmins,
  firstZodMessage,
  getProfile,
  isUuid,
  jsonError,
  jsonOk,
  readJson,
  removeStoragePaths,
  updateUserSchema,
} from '../../_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = params;
  if (!isUuid(id)) return jsonError('User not found.', 404);

  const parsed = updateUserSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);
  const { full_name, phone, city, is_active } = parsed.data;

  try {
    const admin = createAdminClient();
    const target = await getProfile(admin, id);
    if (!target) return jsonError('User not found.', 404);

    if (is_active === false) {
      if (id === auth.user.id) return jsonError('You cannot deactivate your own account.', 400);
      if (target.is_active && target.role === 'admin' && (await countOtherActiveAdmins(admin, id)) === 0) {
        return jsonError('You cannot deactivate the last active admin.', 409);
      }
    }

    const patch: Record<string, string | boolean> = {};
    if (full_name !== undefined) patch.full_name = full_name;
    if (phone !== undefined) patch.phone = phone;
    if (city !== undefined) patch.city = city;
    if (is_active !== undefined) patch.is_active = is_active;

    if (is_active !== undefined) {
      const { error: banError } = await admin.auth.admin.updateUserById(id, {
        ban_duration: is_active ? 'none' : '876000h',
      });
      if (banError) return jsonError('Could not update the account status. Please try again.', 500);
    }

    const { data, error } = await admin.from('profiles').update(patch).eq('id', id).select('*').single();
    if (error || !data) {
      if (is_active !== undefined) {
        await admin.auth.admin.updateUserById(id, { ban_duration: target.is_active ? 'none' : '876000h' });
      }
      return jsonError('Could not update the user. Please try again.', 500);
    }

    return jsonOk({ user: data as Profile });
  } catch {
    return jsonError('Something went wrong. Please try again.', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = params;
  if (!isUuid(id)) return jsonError('User not found.', 404);

  try {
    const admin = createAdminClient();
    const target = await getProfile(admin, id);
    if (!target) return jsonError('User not found.', 404);

    if (id === auth.user.id) return jsonError('You cannot delete your own account.', 400);
    if (target.role === 'admin' && target.is_active && (await countOtherActiveAdmins(admin, id)) === 0) {
      return jsonError('You cannot delete the last active admin.', 409);
    }

    let paths: string[];
    try {
      paths = await collectUserStoragePaths(admin, id);
      await removeStoragePaths(admin, paths);
    } catch {
      return jsonError('Could not delete the photos of this user. The account was not deleted.', 500);
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return jsonError('Could not delete the user. Please try again.', 500);

    return jsonOk({ ok: true });
  } catch {
    return jsonError('Something went wrong. Please try again.', 500);
  }
}
