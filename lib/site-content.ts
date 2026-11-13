import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { cacheRequest } from '@/lib/server-cache';
import { SITE_CONTENT_DEFAULTS } from '@/lib/site-content-defaults';

/** DB values merged over the defaults. An empty-string DB value stays empty (hides the item). */
export const getSiteContent = cacheRequest(async (): Promise<Record<string, string>> => {
  const merged: Record<string, string> = { ...SITE_CONTENT_DEFAULTS };
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('site_content').select('key,value');
    if (!error && data) {
      for (const row of data as { key: string; value: string | null }[]) {
        if (typeof row.key === 'string') merged[row.key] = row.value ?? '';
      }
    }
  } catch {
    // Database not reachable: serve the defaults.
  }
  return merged;
});

export function t(content: Record<string, string>, key: string): string {
  return content[key] ?? SITE_CONTENT_DEFAULTS[key] ?? '';
}
