import type { SupabaseClient } from '@supabase/supabase-js';
import type { CarStatus } from '@/types/database';

const BUCKET = 'car-images';

/** An error whose message is already written for end users. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

interface ErrorLike {
  message?: unknown;
  code?: unknown;
}

/** Turns any Supabase / network error into a readable sentence (never a raw code). */
export function describeError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof AppError) return err.message;
  if (!err || typeof err !== 'object') return fallback;
  const e = err as ErrorLike;
  const code = typeof e.code === 'string' ? e.code : '';
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : '';

  if (code === '23505') return 'That already exists.';
  if (code === '23503') return 'This item is still used by other records, so it cannot be removed.';
  if (code === '23514') return 'Some values are outside the allowed range. Please check the form.';
  if (code === '23502') return 'A required value is missing.';
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to do that.';
  }
  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  ) {
    return 'Network problem. Check your internet connection and try again.';
  }
  if (msg.includes('jwt') || msg.includes('not authenticated') || msg.includes('refresh token')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (msg.includes('payload too large') || msg.includes('maximum allowed size')) {
    return 'That file is too large.';
  }
  if (msg.includes('mime type') || msg.includes('not supported')) return 'That file type is not allowed.';
  if (msg.includes('bucket not found')) return 'Photo storage is not set up yet. Please contact the admin.';
  return fallback;
}

/** Best-effort removal of storage objects (never throws). */
export async function removeStorageObjects(supabase: SupabaseClient, paths: string[]): Promise<void> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  for (let i = 0; i < unique.length; i += 100) {
    try {
      await supabase.storage.from(BUCKET).remove(unique.slice(i, i + 100));
    } catch {
      // Orphaned files are harmless; the database is the source of truth.
    }
  }
}

/**
 * Deletes a car. The row is deleted first (its images cascade); the storage objects are removed afterwards so a
 * failed delete never leaves a car without its photos.
 */
export async function deleteCar(supabase: SupabaseClient, carId: string): Promise<void> {
  const { data: imgs, error: imgErr } = await supabase
    .from('car_images')
    .select('storage_path, thumb_path')
    .eq('car_id', carId);
  if (imgErr) throw new AppError(describeError(imgErr, 'Could not load the car photos.'));

  const { data: deleted, error } = await supabase.from('cars').delete().eq('id', carId).select('id');
  if (error) throw new AppError(describeError(error, 'Could not delete this car.'));
  if (!deleted || deleted.length === 0) {
    throw new AppError('This car could not be deleted. It may already be gone, or you may not have permission.');
  }

  const rows = (imgs ?? []) as { storage_path: string; thumb_path: string }[];
  await removeStorageObjects(
    supabase,
    rows.flatMap((r) => [r.storage_path, r.thumb_path]),
  );
}

interface PublishCheckRow {
  id: string;
  mileage_km: number | null;
  deliver_to: string[] | null;
  images: { id: string }[] | null;
}

export async function setCarStatus(supabase: SupabaseClient, carId: string, status: CarStatus): Promise<void> {
  if (status === 'published') {
    const { data, error } = await supabase
      .from('cars')
      .select('id, mileage_km, deliver_to, images:car_images(id)')
      .eq('id', carId)
      .maybeSingle();
    if (error) throw new AppError(describeError(error, 'Could not check this car before publishing.'));
    const row = data as PublishCheckRow | null;
    if (!row) throw new AppError('Car not found.');
    const missing: string[] = [];
    if (row.mileage_km === null) missing.push('the mileage');
    if (!row.images || row.images.length === 0) missing.push('at least one photo');
    if (!row.deliver_to || row.deliver_to.length === 0) missing.push('a delivery country');
    if (missing.length > 0) {
      throw new AppError(`Open the car and add ${missing.join(', ')} before publishing it.`);
    }
  }

  const { data: updated, error } = await supabase.from('cars').update({ status }).eq('id', carId).select('id');
  if (error) throw new AppError(describeError(error, 'Could not change the car status.'));
  if (!updated || updated.length === 0) {
    throw new AppError('The status could not be changed. You may not have permission for this car.');
  }
}

/** Admin only: the database silently ignores this for listers, so the result is verified. */
export async function setCarFeatured(supabase: SupabaseClient, carId: string, featured: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('cars')
    .update({ is_featured: featured })
    .eq('id', carId)
    .select('id, is_featured');
  if (error) throw new AppError(describeError(error, 'Could not update the featured flag.'));
  const row = (data ?? [])[0] as { id: string; is_featured: boolean } | undefined;
  if (!row) throw new AppError('The car could not be updated. It may be gone or you may not have permission.');
  if (row.is_featured !== featured) throw new AppError('Only admins can feature cars.');
}
