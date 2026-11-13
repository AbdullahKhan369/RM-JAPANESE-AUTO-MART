'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { normalizePhone } from '@/lib/format';
import { generatePassword } from '@/lib/utils';
import type { Profile } from '@/types/database';
import { adminFetch } from './api';
import { PasswordField } from './PasswordField';

export interface CreateUserInitial {
  full_name: string;
  email: string;
  phone: string;
  city: string;
}

type FieldErrors = Partial<Record<'full_name' | 'email' | 'phone' | 'password', string>>;

export function CreateUserModal({
  open,
  role,
  onClose,
  onCreated,
  initial,
  requestId,
}: {
  open: boolean;
  role: 'lister' | 'admin';
  onClose: () => void;
  onCreated: (result: { user: Profile; password: string }) => void;
  initial?: CreateUserInitial;
  requestId?: string;
}) {
  const formId = useId();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(initial?.full_name ?? '');
    setEmail(initial?.email ?? '');
    setPhone(initial?.phone ? normalizePhone(initial.phone) : '');
    setCity(initial?.city ?? '');
    setPassword(generatePassword());
    setErrors({});
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requestId]);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (fullName.trim().length < 2) next.full_name = 'Enter the full name (at least 2 characters).';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!/^\+[1-9]\d{6,14}$/.test(normalizePhone(phone))) next.phone = 'Use the international format, for example +353851234567.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setFormError(null);
    try {
      const result = await adminFetch<{ user: Profile; password: string }>('/api/admin/users', {
        method: 'POST',
        body: {
          role,
          email: email.trim(),
          full_name: fullName.trim(),
          phone: normalizePhone(phone),
          city: city.trim(),
          password,
          request_id: requestId,
        },
      });
      onCreated(result);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title={role === 'lister' ? 'Create lister' : 'Create admin'}
      description={requestId ? 'Prefilled from the request. Check the details, then create the account.' : 'The account is active immediately. No email is sent.'}
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form={formId} loading={saving}>{role === 'lister' ? 'Create lister' : 'Create admin'}</Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>
        )}
        <Field label="Full name" htmlFor={`${formId}-name`} error={errors.full_name} required>
          <Input id={`${formId}-name`} value={fullName} onChange={(e) => setFullName(e.target.value)} invalid={Boolean(errors.full_name)} autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor={`${formId}-email`} error={errors.email} required>
          <Input id={`${formId}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={Boolean(errors.email)} autoComplete="off" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor={`${formId}-phone`} error={errors.phone} hint="With country code" required>
            <Input id={`${formId}-phone`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} invalid={Boolean(errors.phone)} autoComplete="off" />
          </Field>
          <Field label="City" htmlFor={`${formId}-city`}>
            <Input id={`${formId}-city`} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <PasswordField id={`${formId}-password`} value={password} onChange={setPassword} error={errors.password} hint="Generated automatically. You can change it." />
      </form>
    </Modal>
  );
}
