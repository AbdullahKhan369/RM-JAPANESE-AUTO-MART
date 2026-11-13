import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizePhone } from '@/lib/format';
import type { Profile } from '@/types/database';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

export function jsonOk(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request.';
}

/* ----------------------------- zod schemas ----------------------------- */

const emailSchema = z
  .string({ required_error: 'Email is required.', invalid_type_error: 'Email must be text.' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(200, 'Email is too long.');

const fullNameSchema = z
  .string({ required_error: 'Full name is required.', invalid_type_error: 'Full name must be text.' })
  .trim()
  .min(2, 'Full name must be at least 2 characters.')
  .max(120, 'Full name is too long.');

const phoneSchema = z
  .string({ required_error: 'Phone number is required.', invalid_type_error: 'Phone must be text.' })
  .transform((value) => normalizePhone(value))
  .refine(
    (value) => /^\+[1-9]\d{6,14}$/.test(value),
    'Enter a valid phone number with country code, for example +353851234567.',
  );

const citySchema = z
  .string({ invalid_type_error: 'City must be text.' })
  .trim()
  .max(120, 'City is too long.');

const passwordSchema = z
  .string({ invalid_type_error: 'Password must be text.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.');

const uuidSchema = z.string().uuid();

export function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

export const createUserSchema = z.object({
  role: z.enum(['lister', 'admin'], { errorMap: () => ({ message: 'Role must be lister or admin.' }) }),
  email: emailSchema,
  full_name: fullNameSchema,
  phone: phoneSchema,
  city: citySchema.optional(),
  password: passwordSchema.optional(),
  request_id: z.string().uuid('Invalid request id.').optional(),
});

export const updateUserSchema = z
  .object({
    full_name: fullNameSchema.optional(),
    phone: phoneSchema.optional(),
    city: citySchema.optional(),
    is_active: z.boolean({ invalid_type_error: 'is_active must be true or false.' }).optional(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), 'Nothing to update.');

export const passwordBodySchema = z.object({ password: passwordSchema.optional() });

/* ------------------------------ db helpers ----------------------------- */

export async function getProfile(admin: SupabaseClient, id: string): Promise<Profile | null> {
  const { data, error } = await admin.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile | null) ?? null;
}

export async function countOtherActiveAdmins(admin: SupabaseClient, excludeId: string): Promise<number> {
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('is_active', true)
    .neq('id', excludeId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function isDuplicateEmailError(error: { message?: string; code?: string }): boolean {
  const message = (error.message ?? '').toLowerCase();
  return (
    error.code === 'email_exists' ||
    error.code === 'user_already_exists' ||
    message.includes('already been registered') ||
    message.includes('already registered') ||
    message.includes('already exists')
  );
}

/* --------------------------- storage clean-up -------------------------- */

const BUCKET = 'car-images';
type StorageApi = ReturnType<SupabaseClient['storage']['from']>;
interface ListedItem {
  name: string;
  id: string | null;
}

async function listAll(storage: StorageApi, prefix: string): Promise<ListedItem[]> {
  const out: ListedItem[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const { data, error } = await storage.list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    out.push(...batch);
    if (batch.length < limit) break;
  }
  return out;
}

interface ImagePathRow {
  storage_path: string;
  thumb_path: string;
}

async function fetchImagePathRows(
  admin: SupabaseClient,
  userId: string,
  mode: 'owned' | 'foreign',
): Promise<ImagePathRow[]> {
  const rows: ImagePathRow[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const base = admin.from('car_images').select('storage_path, thumb_path, cars!inner(lister_id)');
    const filtered =
      mode === 'owned'
        ? base.eq('cars.lister_id', userId)
        : base.like('storage_path', `${userId}/%`).neq('cars.lister_id', userId);
    const { data, error } = await filtered.order('id', { ascending: true }).range(from, from + size - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ImagePathRow[];
    rows.push(...batch);
    if (batch.length < size) break;
  }
  return rows;
}

/**
 * Every storage object that belongs to the user: everything under `car-images/{id}/` plus the photos of
 * cars they own that were stored elsewhere (after an owner change). Photos stored in the user's folder
 * but now belonging to cars of another lister are kept.
 */
export async function collectUserStoragePaths(admin: SupabaseClient, userId: string): Promise<string[]> {
  const storage = admin.storage.from(BUCKET);
  const paths = new Set<string>();

  const top = await listAll(storage, userId);
  for (const item of top) {
    if (item.id) {
      paths.add(`${userId}/${item.name}`);
      continue;
    }
    const inner = await listAll(storage, `${userId}/${item.name}`);
    for (const file of inner) {
      if (file.id) paths.add(`${userId}/${item.name}/${file.name}`);
    }
  }

  const owned = await fetchImagePathRows(admin, userId, 'owned');
  for (const row of owned) {
    paths.add(row.storage_path);
    paths.add(row.thumb_path);
  }

  const foreign = await fetchImagePathRows(admin, userId, 'foreign');
  for (const row of foreign) {
    paths.delete(row.storage_path);
    paths.delete(row.thumb_path);
  }

  return Array.from(paths).filter((path) => path.length > 0);
}

export async function removeStoragePaths(admin: SupabaseClient, paths: string[]): Promise<void> {
  const storage = admin.storage.from(BUCKET);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await storage.remove(paths.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
}
