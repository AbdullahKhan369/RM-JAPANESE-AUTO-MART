import { Car as CarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThumbSource } from './types';

/** Cover thumbnail if there is one, otherwise the first image by position. */
export function pickThumb(images: ThumbSource[] | null | undefined): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const cover = sorted.find((i) => i.is_cover) ?? sorted[0];
  return cover?.thumb_url || null;
}

interface CarThumbProps {
  images: ThumbSource[] | null | undefined;
  alt: string;
  className?: string;
}

export function CarThumb({ images, alt, className }: CarThumbProps) {
  const src = pickThumb(images);
  return (
    <div className={cn('relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} width={480} height={360} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground" role="img" aria-label="No photo">
          <CarIcon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
