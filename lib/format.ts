import type { CarImage } from '@/types/database';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function num(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function buildCarTitle(year: number, make: string, model: string, version?: string): string {
  return [String(year), make, model, version]
    .map((part) => (part ?? '').toString().trim())
    .filter(Boolean)
    .join(' ');
}

export function formatKm(km: number | null): string {
  return km === null || km === undefined || !Number.isFinite(km) ? '–' : `${num(km)} km`;
}

export function formatCc(cc: number | null): string {
  return cc === null || cc === undefined || !Number.isFinite(cc) ? '–' : `${num(cc)} cc`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function optionLabel(
  options: { value: string; label: string }[],
  value: string | null,
): string {
  if (value === null || value === undefined || value === '') return '–';
  return options.find((o) => o.value === value)?.label ?? value;
}

export function sortedImages(images: CarImage[]): CarImage[] {
  return [...(images ?? [])].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return (a.created_at ?? '').localeCompare(b.created_at ?? '');
  });
}

export function coverImage(images: CarImage[]): CarImage | null {
  if (!images || images.length === 0) return null;
  return images.find((img) => img.is_cover) ?? sortedImages(images)[0] ?? null;
}

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** Strips spaces, dashes, dots and brackets. Keeps a leading '+'. '00' prefix becomes '+'. */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  return digits;
}
