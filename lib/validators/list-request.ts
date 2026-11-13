import { z } from 'zod';
import { normalizePhone } from '@/lib/format';

const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

export const listRequestSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Please enter your full name.')
    .max(120, 'Name is too long.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.')
    .max(200, 'Email is too long.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required.')
    .refine((value) => PHONE_PATTERN.test(normalizePhone(value)), {
      message: 'Use international format, for example +923001234567.',
    }),
  city: z.string().trim().min(2, 'Please enter your city.').max(120, 'City is too long.'),
  country: z.string().trim().min(2, 'Please enter your country.').max(120, 'Country is too long.'),
  message: z.string().trim().max(2000, 'Message must be 2000 characters or fewer.'),
  // Honeypot: real people never fill this field.
  website: z.string().max(200),
});

export type ListRequestValues = z.infer<typeof listRequestSchema>;
