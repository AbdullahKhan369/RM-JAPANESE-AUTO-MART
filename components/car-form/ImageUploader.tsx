'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, DragEvent, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, RotateCcw, Star, Trash2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MAX_IMAGES } from '@/lib/constants';
import { compressImage, newUuid, validateImageFile } from '@/lib/image-compress';
import { AppError, describeError, removeStorageObjects } from '@/lib/car-actions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { FormImage } from './types';

const BUCKET = 'car-images';
const CONCURRENCY = 3;

interface Job {
  tempId: string;
  file: File;
  ownerId: string;
  carId: string;
  uuid: string;
}

interface ImageUploaderProps {
  images: FormImage[];
  setImages: Dispatch<SetStateAction<FormImage[]>>;
  coverId: string | null;
  onCoverChange: (tempId: string) => void;
  /** Called for images that are already stored (or done uploading); the parent decides how to remove them. */
  onRemove: (image: FormImage) => void;
  ownerId: string | null;
  carId: string;
  disabled?: boolean;
  error?: string;
}

export function ImageUploader({
  images,
  setImages,
  coverId,
  onCoverChange,
  onRemove,
  ownerId,
  carId,
  disabled,
  error,
}: ImageUploaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<FormImage[]>(images);
  imagesRef.current = images;

  const queueRef = useRef<Job[]>([]);
  const workersRef = useRef(0);
  const aliveRef = useRef(true);
  const cancelledRef = useRef<Set<string>>(new Set());
  const filesRef = useRef<Map<string, File>>(new Map());

  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const patch = useCallback(
    (tempId: string, changes: Partial<FormImage>) => {
      setImages((prev) => prev.map((img) => (img.tempId === tempId ? { ...img, ...changes } : img)));
    },
    [setImages],
  );

  const publicUrl = useCallback(
    (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
    [supabase],
  );

  const processJob = useCallback(
    async (job: Job) => {
      const { tempId, file, ownerId: owner, carId: car, uuid } = job;
      const uploaded: string[] = [];
      const dropped = () => !aliveRef.current || cancelledRef.current.has(tempId);
      const cleanup = async () => {
        if (uploaded.length) await removeStorageObjects(supabase, uploaded);
      };
      try {
        patch(tempId, { status: 'uploading', stage: 'compressing', progress: 10, error: undefined });
        let compressed: Awaited<ReturnType<typeof compressImage>>;
        try {
          compressed = await compressImage(file);
        } catch (e) {
          throw new AppError(e instanceof Error ? e.message : 'Could not process this photo.');
        }
        if (dropped()) return;

        const base = `${owner}/${car}/${uuid}`;
        const storagePath = `${base}.${compressed.ext}`;
        const thumbPath = `${base}_thumb.${compressed.ext}`;
        patch(tempId, {
          storage_path: storagePath,
          thumb_path: thumbPath,
          url: publicUrl(storagePath),
          thumb_url: publicUrl(thumbPath),
          stage: 'uploading',
          progress: 35,
        });

        const full = await supabase.storage.from(BUCKET).upload(storagePath, compressed.full, {
          contentType: compressed.contentType,
          cacheControl: '31536000',
          upsert: false,
        });
        if (full.error) throw full.error;
        uploaded.push(storagePath);
        if (dropped()) {
          await cleanup();
          return;
        }
        patch(tempId, { progress: 70 });

        const thumb = await supabase.storage.from(BUCKET).upload(thumbPath, compressed.thumb, {
          contentType: compressed.contentType,
          cacheControl: '31536000',
          upsert: false,
        });
        if (thumb.error) throw thumb.error;
        uploaded.push(thumbPath);
        if (dropped()) {
          await cleanup();
          return;
        }

        const preview = imagesRef.current.find((i) => i.tempId === tempId)?.previewUrl;
        if (preview) URL.revokeObjectURL(preview);
        filesRef.current.delete(tempId);
        patch(tempId, { status: 'done', stage: undefined, progress: 100, previewUrl: undefined });
      } catch (err) {
        await cleanup();
        if (dropped()) return;
        patch(tempId, {
          status: 'error',
          stage: undefined,
          progress: 0,
          error: describeError(err, 'Upload failed. Please try again.'),
        });
      }
    },
    [patch, publicUrl, supabase],
  );

  const startWorkers = useCallback(() => {
    while (workersRef.current < CONCURRENCY && queueRef.current.length > 0) {
      workersRef.current += 1;
      void (async () => {
        try {
          for (;;) {
            const job = queueRef.current.shift();
            if (!job) break;
            if (cancelledRef.current.has(job.tempId)) continue;
            await processJob(job);
          }
        } finally {
          workersRef.current -= 1;
        }
      })();
    }
  }, [processJob]);

  const enqueue = useCallback(
    (job: Job) => {
      queueRef.current.push(job);
      startWorkers();
    },
    [startWorkers],
  );

  function addFiles(fileList: FileList | File[]) {
    if (disabled) return;
    if (!ownerId || !carId) {
      toast({ title: 'Choose the car owner first', description: 'Go back to the Basics step.', variant: 'error' });
      return;
    }
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const slots = MAX_IMAGES - imagesRef.current.length;
    if (slots <= 0) {
      toast({ title: `Maximum ${MAX_IMAGES} photos`, description: 'Remove one to add another.', variant: 'error' });
      return;
    }

    const problems: string[] = [];
    const valid: File[] = [];
    for (const file of files) {
      const problem = validateImageFile(file);
      if (problem) problems.push(problem);
      else valid.push(file);
    }
    const accepted = valid.slice(0, slots);
    if (valid.length > slots) problems.push(`Only ${MAX_IMAGES} photos are allowed, so ${valid.length - slots} were skipped.`);
    if (problems.length) {
      toast({
        title: problems.length === 1 ? 'A photo was skipped' : `${problems.length} photos were skipped`,
        description: problems.slice(0, 3).join(' '),
        variant: 'error',
      });
    }
    if (accepted.length === 0) return;

    const jobs: Job[] = [];
    const items: FormImage[] = accepted.map((file) => {
      const tempId = newUuid();
      const uuid = newUuid();
      filesRef.current.set(tempId, file);
      jobs.push({ tempId, file, ownerId, carId, uuid });
      const guess = `${ownerId}/${carId}/${uuid}.webp`;
      return {
        tempId,
        storage_path: guess,
        thumb_path: `${ownerId}/${carId}/${uuid}_thumb.webp`,
        url: '',
        thumb_url: '',
        isNew: true,
        status: 'uploading',
        stage: 'compressing',
        progress: 2,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
      };
    });
    setImages((prev) => [...prev, ...items]);
    jobs.forEach(enqueue);
  }

  function retry(image: FormImage) {
    const file = filesRef.current.get(image.tempId);
    if (!file || !ownerId) {
      handleRemove(image);
      return;
    }
    const uuid = image.storage_path.split('/').pop()?.replace(/(_thumb)?\.(webp|jpg)$/, '') ?? newUuid();
    patch(image.tempId, { status: 'uploading', stage: 'compressing', progress: 2, error: undefined });
    enqueue({ tempId: image.tempId, file, ownerId, carId, uuid });
  }

  function handleRemove(image: FormImage) {
    if (image.status === 'uploading') {
      cancelledRef.current.add(image.tempId);
      if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
      filesRef.current.delete(image.tempId);
      setImages((prev) => prev.filter((i) => i.tempId !== image.tempId));
      return;
    }
    if (image.status === 'error') {
      if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
      filesRef.current.delete(image.tempId);
      setImages((prev) => prev.filter((i) => i.tempId !== image.tempId));
      return;
    }
    onRemove(image);
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    setImages((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    setImages((prev) => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');
  const effectiveCover = images.find((i) => i.tempId === coverId)?.tempId ?? images[0]?.tempId ?? null;
  const full = images.length >= MAX_IMAGES;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          if (!hasFiles(e) || disabled || full) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted',
          (disabled || full) && 'opacity-60',
        )}
      >
        <ImagePlus className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Drag and drop photos here</p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG or WebP up to 15 MB each. Photos are compressed in your browser before uploading.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || full || !ownerId}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" aria-hidden="true" /> Choose photos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose photos to upload"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {images.length} / {MAX_IMAGES} photos
        </p>
      </div>

      {!ownerId && (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground" role="status">
          Choose the car owner on the Basics step before adding photos.
        </p>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            The cover photo is shown first on listings. Drag photos to reorder, or use the arrows.
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, index) => {
              const isCover = img.tempId === effectiveCover;
              const src = img.status === 'done' ? img.thumb_url || img.url : img.previewUrl || img.thumb_url;
              return (
                <li
                  key={img.tempId}
                  draggable={img.status === 'done' && !disabled}
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', img.tempId);
                  }}
                  onDragOver={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    setOverIndex(index);
                  }}
                  onDrop={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    reorder(dragIndex, index);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={cn(
                    'overflow-hidden rounded-xl border bg-card',
                    isCover ? 'border-primary' : 'border-border',
                    overIndex === index && dragIndex !== null && dragIndex !== index && 'ring-2 ring-ring',
                    dragIndex === index && 'opacity-50',
                  )}
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={img.fileName ? `Photo ${index + 1}: ${img.fileName}` : `Car photo ${index + 1}`}
                        width={480}
                        height={360}
                        loading="lazy"
                        draggable={false}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    {isCover && img.status === 'done' && (
                      <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        Cover
                      </span>
                    )}
                    {img.status === 'uploading' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-end bg-background/70 p-2">
                        <p className="mb-1 text-xs font-medium text-foreground">
                          {img.stage === 'compressing' ? 'Compressing…' : 'Uploading…'}
                        </p>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${img.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {img.status === 'error' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85 p-2 text-center">
                        <p className="text-xs text-danger">{img.error ?? 'Upload failed'}</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => retry(img)}>
                          <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Retry
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 p-1.5">
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || disabled}
                        aria-label={`Move photo ${index + 1} earlier`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ring-ring disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === images.length - 1 || disabled}
                        aria-label={`Move photo ${index + 1} later`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ring-ring disabled:opacity-40"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => onCoverChange(img.tempId)}
                        disabled={isCover || img.status !== 'done' || disabled}
                        aria-label={`Set photo ${index + 1} as cover`}
                        title="Set as cover"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ring-ring disabled:opacity-40"
                      >
                        <Star className={cn('h-4 w-4', isCover && 'fill-current text-primary')} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(img)}
                        disabled={disabled}
                        aria-label={`Delete photo ${index + 1}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 ring-ring disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
