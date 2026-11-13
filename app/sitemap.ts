import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/cars`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/list-your-car`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('cars')
      .select('id,updated_at')
      .in('status', ['published', 'sold'])
      .order('updated_at', { ascending: false })
      .limit(1000);
    for (const car of (data ?? []) as { id: string; updated_at: string }[]) {
      entries.push({
        url: `${base}/cars/${car.id}`,
        lastModified: new Date(car.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch {
    // Serve the static pages only when the database cannot be reached.
  }

  return entries;
}
