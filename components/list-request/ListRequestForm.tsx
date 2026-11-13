'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/lib/format';
import { listRequestSchema, type ListRequestValues } from '@/lib/validators/list-request';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

const COOLDOWN_MS = 60_000;
const MIN_FILL_MS = 3_000;
const STORAGE_KEY = 'rm_list_request_at';

export interface ListRequestFormProps {
  /** Shown above the form. Pass an empty string to hide (the modal already has a title). */
  title?: string;
  text?: string;
  successTitle: string;
  successText: string;
  /** Called when the person presses "Close" on the success screen. */
  onDone?: () => void;
}

function readLastSubmit(): number {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function writeLastSubmit(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage can be blocked (private mode). The cooldown is only a convenience.
  }
}

export function ListRequestForm({ title, text, successTitle, successText, onDone }: ListRequestFormProps) {
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ListRequestValues>({
    resolver: zodResolver(listRequestSchema),
    defaultValues: { full_name: '', email: '', phone: '', city: '', country: '', message: '', website: '' },
  });

  async function onSubmit(values: ListRequestValues) {
    setFormError(null);

    // Bots: the honeypot is filled or the form was submitted unrealistically fast.
    // Pretend everything worked so they learn nothing.
    if (values.website.length > 0 || Date.now() - startedAt.current < MIN_FILL_MS) {
      setDone(true);
      return;
    }

    const wait = COOLDOWN_MS - (Date.now() - readLastSubmit());
    if (wait > 0) {
      setFormError(`Please wait ${Math.ceil(wait / 1000)} seconds before sending another request.`);
      return;
    }

    const supabase = createClient();
    // No .select(): anonymous visitors cannot read the table back.
    const { error } = await supabase.from('lister_requests').insert({
      full_name: values.full_name,
      email: values.email,
      phone: normalizePhone(values.phone),
      city: values.city,
      country: values.country,
      message: values.message,
    });

    if (error) {
      setFormError('We could not send your request. Please check your details and try again.');
      toast({ title: 'Request not sent', description: 'Please try again in a moment.', variant: 'error' });
      return;
    }

    writeLastSubmit();
    reset();
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center px-2 py-6 text-center" role="status">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">{successTitle}</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{successText}</p>
        {onDone ? (
          <Button className="mt-6" onClick={onDone}>
            Close
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {title || text ? (
        <div className="space-y-1">
          {title ? <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2> : null}
          {text ? <p className="text-sm text-muted-foreground">{text}</p> : null}
        </div>
      ) : null}

      <Field label="Full name" htmlFor="lr-name" error={errors.full_name?.message} required>
        <Input id="lr-name" autoComplete="name" invalid={!!errors.full_name} {...register('full_name')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="lr-email" error={errors.email?.message} required>
          <Input id="lr-email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field
          label="Phone / WhatsApp"
          htmlFor="lr-phone"
          error={errors.phone?.message}
          hint="International format, e.g. +923001234567"
          required
        >
          <Input
            id="lr-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+923001234567"
            invalid={!!errors.phone}
            {...register('phone')}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="lr-city" error={errors.city?.message} required>
          <Input id="lr-city" autoComplete="address-level2" invalid={!!errors.city} {...register('city')} />
        </Field>
        <Field label="Country" htmlFor="lr-country" error={errors.country?.message} required>
          <Input
            id="lr-country"
            list="lr-country-list"
            autoComplete="country-name"
            invalid={!!errors.country}
            {...register('country')}
          />
          <datalist id="lr-country-list">
            <option value="Pakistan" />
            <option value="Ireland" />
            <option value="United Kingdom" />
            <option value="Japan" />
            <option value="United Arab Emirates" />
          </datalist>
        </Field>
      </div>

      <Field
        label="Message"
        htmlFor="lr-message"
        error={errors.message?.message}
        hint="Optional. Tell us about the cars you want to list."
      >
        <Textarea id="lr-message" rows={4} invalid={!!errors.message} {...register('message')} />
      </Field>

      {/* Honeypot: hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lr-website">Website</label>
        <input id="lr-website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      {formError ? (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Send request
      </Button>
    </form>
  );
}
