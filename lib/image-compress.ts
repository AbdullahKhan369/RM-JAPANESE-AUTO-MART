/**
 * Browser-side image compression (canvas, no library).
 * Full image: max 1400 px, WebP 0.78 (target < 250 KB).
 * Thumbnail: max 480 px, WebP 0.72 (target < 40 KB).
 * Falls back to JPEG with the same sizes when WebP encoding is not supported.
 */

export const FULL_MAX_PX = 1400;
export const THUMB_MAX_PX = 480;
export const FULL_QUALITY = 0.78;
export const THUMB_QUALITY = 0.72;
export const FULL_TARGET_BYTES = 250 * 1024;
export const THUMB_TARGET_BYTES = 40 * 1024;
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;
/** The storage bucket rejects files above 2 MB. */
const BUCKET_LIMIT_BYTES = 2 * 1024 * 1024 - 1024;

export interface CompressedImage {
  full: Blob;
  thumb: Blob;
  /** File extension to use in storage: 'webp' normally, 'jpg' for the JPEG fallback. */
  ext: 'webp' | 'jpg';
  contentType: string;
  width: number;
  height: number;
}

/** crypto.randomUUID() with a fallback for very old browsers / non-secure contexts. */
export function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex
    .slice(8, 10)
    .join('')}-${hex.slice(10, 16).join('')}`;
}

/** Returns a readable error message, or null when the file is acceptable. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return `"${file.name}" is not an image file.`;
  if (file.size > MAX_INPUT_BYTES) return `"${file.name}" is larger than 15 MB.`;
  if (file.size === 0) return `"${file.name}" is empty.`;
  return null;
}

async function loadImage(file: File): Promise<{ img: HTMLImageElement; release: () => void }> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode'));
      img.src = url;
    });
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(`"${file.name}" could not be read. Try a JPG, PNG or WebP photo.`);
  }
  return { img, release: () => URL.revokeObjectURL(url) };
}

function drawScaled(img: HTMLImageElement, maxPx: number): HTMLCanvasElement {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const scale = Math.min(1, maxPx / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser cannot process images.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

async function encode(
  canvas: HTMLCanvasElement,
  startQuality: number,
  targetBytes: number,
  preferJpeg: boolean,
): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  let mime = preferJpeg ? 'image/jpeg' : 'image/webp';
  let quality = startQuality;
  let blob = await toBlob(canvas, mime, quality);
  if (!blob || blob.type !== mime) {
    // WebP encoding is not supported: use JPEG with the same dimensions.
    mime = 'image/jpeg';
    blob = await toBlob(canvas, mime, quality);
  }
  if (!blob) throw new Error('Your browser could not compress this photo.');
  let attempts = 0;
  while (blob.size > targetBytes && quality > 0.5 && attempts < 4) {
    quality -= 0.08;
    const next = await toBlob(canvas, mime, quality);
    if (!next) break;
    blob = next;
    attempts += 1;
  }
  return { blob, ext: mime === 'image/webp' ? 'webp' : 'jpg' };
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const invalid = validateImageFile(file);
  if (invalid) throw new Error(invalid);

  const { img, release } = await loadImage(file);
  try {
    const fullCanvas = drawScaled(img, FULL_MAX_PX);
    const full = await encode(fullCanvas, FULL_QUALITY, FULL_TARGET_BYTES, false);
    const thumbCanvas = drawScaled(img, THUMB_MAX_PX);
    const thumb = await encode(thumbCanvas, THUMB_QUALITY, THUMB_TARGET_BYTES, full.ext === 'jpg');
    if (full.blob.size > BUCKET_LIMIT_BYTES) {
      throw new Error(`"${file.name}" is too detailed to compress below 2 MB. Try a smaller photo.`);
    }
    return {
      full: full.blob,
      thumb: thumb.blob,
      ext: full.ext,
      contentType: full.blob.type,
      width: fullCanvas.width,
      height: fullCanvas.height,
    };
  } finally {
    release();
  }
}
