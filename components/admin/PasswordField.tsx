'use client';

import { useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { generatePassword } from '@/lib/utils';

const iconButton =
  'rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function PasswordField({
  id,
  value,
  onChange,
  error,
  label = 'Password',
  hint,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(true);
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          invalid={Boolean(error)}
          autoComplete="new-password"
          spellCheck={false}
          className="pr-20 font-mono"
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          <button
            type="button"
            className={iconButton}
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            title={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={() => onChange(generatePassword())}
            aria-label="Generate a new password"
            title="Generate a new password"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Field>
  );
}
