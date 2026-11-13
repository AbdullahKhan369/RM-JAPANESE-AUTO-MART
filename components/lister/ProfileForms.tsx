'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, MapPin, Phone, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { describeError } from '@/lib/car-actions';
import { normalizePhone } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

interface ProfileFormProps {
  userId: string;
  email: string;
  initial: { full_name: string; phone: string; city: string };
}

export function ProfileForm({ userId, email, initial }: ProfileFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [city, setCity] = useState(initial.city);
  const [errors, setErrors] = useState<{ full_name?: string; phone?: string; city?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initial);

  const normalizedPhone = normalizePhone(phone);
  const changed =
    fullName.trim() !== saved.full_name || normalizedPhone !== saved.phone || city.trim() !== saved.city;

  async function submit() {
    setFormError(null);
    const next: typeof errors = {};
    if (fullName.trim().length < 2) next.full_name = 'Enter your full name (at least 2 characters).';
    else if (fullName.trim().length > 120) next.full_name = 'Name is too long (max 120 characters).';
    if (!PHONE_RE.test(normalizedPhone)) {
      next.phone = 'Enter your phone in international format, for example +923001234567.';
    }
    if (city.trim().length > 120) next.city = 'City is too long (max 120 characters).';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const values = { full_name: fullName.trim(), phone: normalizedPhone, city: city.trim() };
      const { data, error } = await supabase.from('profiles').update(values).eq('id', userId).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('not saved');
      setSaved(values);
      setPhone(values.phone);
      toast({ title: 'Profile updated', variant: 'success' });
      router.refresh();
    } catch (err) {
      const message = describeError(err, 'We could not save your profile. Please try again.');
      setFormError(message);
      toast({ title: 'Could not save your profile', description: message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="space-y-4"
          >
            <Field label="Full name" htmlFor="profile-name" required error={errors.full_name}>
              <Input
                id="profile-name"
                value={fullName}
                maxLength={120}
                invalid={Boolean(errors.full_name)}
                aria-invalid={Boolean(errors.full_name)}
                autoComplete="name"
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field
              label="Phone"
              htmlFor="profile-phone"
              required
              error={errors.phone}
              hint="International format with country code. Buyers use this number to call or WhatsApp you."
            >
              <Input
                id="profile-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                invalid={Boolean(errors.phone)}
                aria-invalid={Boolean(errors.phone)}
                autoComplete="tel"
                placeholder="+923001234567"
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="City" htmlFor="profile-city" error={errors.city}>
              <Input
                id="profile-city"
                value={city}
                maxLength={120}
                invalid={Boolean(errors.city)}
                aria-invalid={Boolean(errors.city)}
                autoComplete="address-level2"
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="profile-email" hint="Your email is your login. Ask the admin to change it.">
              <Input id="profile-email" value={email} readOnly disabled />
            </Field>
            {formError && (
              <p className="text-sm text-danger" role="alert">
                {formError}
              </p>
            )}
            <Button type="submit" loading={saving} disabled={!changed}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <aside aria-label="Contact card preview" className="space-y-2">
        <p className="text-sm font-semibold text-foreground">How buyers see your contact card</p>
        <Card>
          <CardContent>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact the seller</p>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-semibold">{fullName.trim() || 'Your name'}</span>
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {normalizedPhone || 'Your phone'}
              </li>
              <li className="flex items-center gap-2 break-all text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {email}
              </li>
              {city.trim() && (
                <li className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {city.trim()}
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">This card is shown on every car you publish.</p>
      </aside>
    </div>
  );
}

export function PasswordForm() {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setFormError(null);
    const next: typeof errors = {};
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (confirm !== password) next.confirm = 'The two passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('different')) throw new Error('different');
        if (msg.includes('weak') || msg.includes('at least')) throw new Error('weak');
        throw error;
      }
      setPassword('');
      setConfirm('');
      toast({ title: 'Password changed', description: 'Use your new password next time you sign in.', variant: 'success' });
    } catch (err) {
      const text = err instanceof Error ? err.message : '';
      const message =
        text === 'different'
          ? 'Choose a password that is different from your current one.'
          : text === 'weak'
            ? 'That password is too weak. Try a longer one with letters and numbers.'
            : describeError(err, 'We could not change your password. Please try again.');
      setFormError(message);
      toast({ title: 'Password not changed', description: message, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="max-w-md space-y-4"
        >
          <Field label="New password" htmlFor="new-password" required error={errors.password} hint="At least 8 characters.">
            <div className="relative">
              <Input
                id="new-password"
                type={show ? 'text' : 'password'}
                value={password}
                invalid={Boolean(errors.password)}
                aria-invalid={Boolean(errors.password)}
                autoComplete="new-password"
                className="pr-11"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ring-ring"
              >
                {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password" required error={errors.confirm}>
            <Input
              id="confirm-password"
              type={show ? 'text' : 'password'}
              value={confirm}
              invalid={Boolean(errors.confirm)}
              aria-invalid={Boolean(errors.confirm)}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {formError && (
            <p className="text-sm text-danger" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" loading={saving} disabled={!password && !confirm}>
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
