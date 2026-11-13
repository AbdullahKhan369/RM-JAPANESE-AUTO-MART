'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { normalizePhone } from '@/lib/format';
import { generatePassword } from '@/lib/utils';
import { adminFetch } from './api';
import { PasswordField } from './PasswordField';
import type { UserRow } from './types';

export function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [errors, setErrors] = useState<{ full_name?: string; phone?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name);
    setPhone(user.phone);
    setCity(user.city);
    setErrors({});
    setFormError(null);
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const next: { full_name?: string; phone?: string } = {};
    if (fullName.trim().length < 2) next.full_name = 'Enter the full name (at least 2 characters).';
    if (!/^\+[1-9]\d{6,14}$/.test(normalizePhone(phone))) next.phone = 'Use the international format, for example +353851234567.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    setFormError(null);
    try {
      await adminFetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: { full_name: fullName.trim(), phone: normalizePhone(phone), city: city.trim() },
      });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      dismissible={!saving}
      title="Edit user"
      description={user?.email}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form={formId} loading={saving}>Save changes</Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>
        )}
        <Field label="Full name" htmlFor={`${formId}-name`} error={errors.full_name} required>
          <Input id={`${formId}-name`} value={fullName} onChange={(e) => setFullName(e.target.value)} invalid={Boolean(errors.full_name)} />
        </Field>
        <Field label="Phone" htmlFor={`${formId}-phone`} error={errors.phone} required>
          <Input id={`${formId}-phone`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} invalid={Boolean(errors.phone)} />
        </Field>
        <Field label="City" htmlFor={`${formId}-city`}>
          <Input id={`${formId}-city`} value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

export function ResetPasswordModal({
  user,
  onClose,
  onDone,
}: {
  user: UserRow | null;
  onClose: () => void;
  onDone: (user: UserRow, password: string) => void;
}) {
  const formId = useId();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPassword(generatePassword());
    setError(undefined);
    setFormError(null);
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(undefined);
    setSaving(true);
    setFormError(null);
    try {
      const result = await adminFetch<{ password: string }>(`/api/admin/users/${user.id}/password`, {
        method: 'POST',
        body: { password },
      });
      onDone(user, result.password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      dismissible={!saving}
      title="Reset password"
      description={user ? `Set a new password for ${user.full_name || user.email}. Their old password stops working immediately.` : undefined}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form={formId} loading={saving}>Reset password</Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>
        )}
        <PasswordField id={`${formId}-password`} value={password} onChange={setPassword} error={error} label="New password" hint="Generated automatically. Type your own or generate another." />
      </form>
    </Modal>
  );
}

export function DeleteUserModal({
  user,
  role,
  onClose,
  onDeleted,
}: {
  user: UserRow | null;
  role: 'lister' | 'admin';
  onClose: () => void;
  onDeleted: () => void;
}) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTyped('');
    setFormError(null);
  }, [user]);

  const matches = Boolean(user) && typed.trim().toLowerCase() === user?.email.toLowerCase();

  async function handleDelete() {
    if (!user || !matches) return;
    setDeleting(true);
    setFormError(null);
    try {
      await adminFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      dismissible={!deleting}
      title={role === 'lister' ? 'Delete lister' : 'Delete admin'}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button type="button" variant="danger" onClick={handleDelete} loading={deleting} disabled={!matches}>Delete permanently</Button>
        </>
      }
    >
      {user && (
        <div className="space-y-4">
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {role === 'lister'
              ? `This permanently deletes ${user.full_name || user.email}, all of their cars and all of their photos. This cannot be undone.`
              : `This permanently deletes the admin account of ${user.full_name || user.email}. This cannot be undone.`}
          </p>
          {formError && (
            <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>
          )}
          <Field label={`Type ${user.email} to confirm`} htmlFor={inputId}>
            <Input id={inputId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
        </div>
      )}
    </Modal>
  );
}
