export type SearchParams = Record<string, string | string[] | undefined>;

export const ADMIN_PAGE_SIZE = 25;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: string | string[] | undefined): number {
  const n = parseInt(firstParam(value) ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
