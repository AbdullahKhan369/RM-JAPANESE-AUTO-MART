import { requireAdminApi } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { generatePassword } from '@/lib/utils';
import { firstZodMessage, getProfile, isUuid, jsonError, jsonOk, passwordBodySchema, readJson } from '../../../_lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = params;
  if (!isUuid(id)) return jsonError('User not found.', 404);

  const parsed = passwordBodySchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(firstZodMessage(parsed.error), 400);
  const password = parsed.data.password ?? generatePassword();

  try {
    const admin = createAdminClient();
    const target = await getProfile(admin, id);
    if (!target) return jsonError('User not found.', 404);

    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) {
      const rejected = error.status === 422;
      return jsonError(rejected ? error.message : 'Could not reset the password. Please try again.', rejected ? 400 : 500);
    }

    return jsonOk({ password });
  } catch {
    return jsonError('Something went wrong. Please try again.', 500);
  }
}
