import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Lowercase, only a-z, 0-9 and '-', no leading/trailing dashes. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function randomIndex(max: number): number {
  const limit = Math.floor(256 / max) * max;
  const buf = new Uint8Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** Random password without ambiguous characters (0 O o 1 l I). Always has upper, lower and a digit. */
export function generatePassword(length = 14): string {
  const size = Math.max(length, 8);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let out = '';
    for (let i = 0; i < size; i += 1) {
      out += PASSWORD_ALPHABET[randomIndex(PASSWORD_ALPHABET.length)];
    }
    if (/[A-Z]/.test(out) && /[a-z]/.test(out) && /\d/.test(out)) return out;
  }
  return `Rm${PASSWORD_ALPHABET.slice(0, size - 3)}7`;
}
