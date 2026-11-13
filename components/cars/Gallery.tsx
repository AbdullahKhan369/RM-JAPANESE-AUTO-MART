'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Car as CarIcon, ChevronLeft, ChevronRight, Expand, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GalleryImage {
  id: string;
  url: string;
  thumb_url: string;
}

export function Gallery({ images, title, badge }: { images: GalleryImage[]; title: string; badge?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState(1);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  const go = useCallback(
    (delta: number) => {
      if (count === 0) return;
      setIndex((i) => (i + delta + count) % count);
      setZoom(1);
    },
    [count],
  );

  useEffect(() => {
    if (!lightbox) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(false);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(3, z + 1));
      else if (e.key === '-') setZoom((z) => Math.max(1, z - 1));
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [lightbox, go]);

  if (count === 0) {
    return (
      <div className="relative flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
        <CarIcon className="h-16 w-16 opacity-50" aria-hidden="true" />
        <span className="sr-only">No photos available</span>
        {badge}
      </div>
    );
  }

  const current = images[Math.min(index, count - 1)];

  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  }

  return (
    <div className="space-y-3" onKeyDown={(e) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    }}>
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          onClick={() => setLightbox(true)}
          aria-label="Open photo fullscreen"
          className="absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src={current.url} alt={`${title} – photo ${index + 1}`} className="h-full w-full object-cover" width={1400} height={1050} />
        </button>
        {badge}
        {count > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-hero/70 text-hero-foreground backdrop-blur transition-colors hover:bg-hero focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-hero/70 text-hero-foreground backdrop-blur transition-colors hover:bg-hero focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-hero/75 px-2.5 py-1 text-xs font-semibold text-hero-foreground backdrop-blur">
          <Expand className="h-3.5 w-3.5" aria-hidden="true" />
          {index + 1} / {count}
        </span>
      </div>

      {count > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" aria-label="Photo thumbnails">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIndex(i);
                  setZoom(1);
                }}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'block h-16 w-20 overflow-hidden rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-20 sm:w-28',
                  i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <img src={img.thumb_url} alt="" loading="lazy" width={112} height={80} className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {lightbox
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex flex-col bg-hero/95 text-hero-foreground"
              role="dialog"
              aria-modal="true"
              aria-label={`${title} photos`}
            >
              <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
                <span className="rounded-full bg-hero-foreground/10 px-3 py-1 text-sm font-semibold">
                  {index + 1} / {count}
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 1))} disabled={zoom === 1} aria-label="Zoom out" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-hero-foreground/10 hover:bg-hero-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
                    <ZoomOut className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 1))} disabled={zoom === 3} aria-label="Zoom in" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-hero-foreground/10 hover:bg-hero-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
                    <ZoomIn className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => setLightbox(false)} autoFocus aria-label="Close fullscreen" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-hero-foreground/10 hover:bg-hero-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div
                className="relative flex min-h-0 flex-1 overflow-auto"
                onTouchStart={(e) => {
                  touchX.current = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  if (zoom === 1) onTouchEnd(e);
                  else touchX.current = null;
                }}
              >
                <img
                  src={current.url}
                  alt={`${title} – photo ${index + 1}`}
                  onClick={() => setZoom((z) => (z >= 3 ? 1 : z + 1))}
                  style={zoom === 1 ? undefined : { width: `${zoom * 100}%`, maxWidth: 'none' }}
                  className={cn('m-auto select-none', zoom === 1 ? 'max-h-full max-w-full cursor-zoom-in object-contain' : 'h-auto cursor-zoom-out')}
                  draggable={false}
                />
              </div>
              {count > 1 ? (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-hero-foreground/10 hover:bg-hero-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:left-4">
                    <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-hero-foreground/10 hover:bg-hero-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-4">
                    <ChevronRight className="h-6 w-6" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
