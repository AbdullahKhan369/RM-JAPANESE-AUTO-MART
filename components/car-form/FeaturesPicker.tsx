'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { COMMON_FEATURES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const MAX_FEATURES = 60;
const MAX_LENGTH = 60;

interface FeaturesPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  error?: string;
}

export function FeaturesPicker({ value, onChange, disabled, error }: FeaturesPickerProps) {
  const [custom, setCustom] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  const has = (name: string) => value.some((v) => v.toLowerCase() === name.toLowerCase());
  const commonLower = COMMON_FEATURES.map((f) => f.toLowerCase());
  const customOnes = value.filter((v) => !commonLower.includes(v.toLowerCase()));

  function toggle(name: string) {
    if (has(name)) onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()));
    else if (value.length >= MAX_FEATURES) setCustomError(`You can add up to ${MAX_FEATURES} features.`);
    else onChange([...value, name]);
  }

  function addCustom() {
    const name = custom.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (name.length > MAX_LENGTH) {
      setCustomError(`Keep each feature under ${MAX_LENGTH} characters.`);
      return;
    }
    if (has(name)) {
      setCustomError('That feature is already added.');
      return;
    }
    if (value.length >= MAX_FEATURES) {
      setCustomError(`You can add up to ${MAX_FEATURES} features.`);
      return;
    }
    onChange([...value, name]);
    setCustom('');
    setCustomError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Common features">
        {COMMON_FEATURES.map((name) => {
          const selected = has(name);
          return (
            <button
              key={name}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => toggle(name)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 ring-ring disabled:opacity-60',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground hover:bg-muted',
              )}
            >
              {name}
            </button>
          );
        })}
      </div>

      {customOnes.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Your custom features">
          {customOnes.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 py-1 pl-3 pr-1 text-sm text-foreground"
            >
              {name}
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(name)}
                aria-label={`Remove ${name}`}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 ring-ring"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="custom-feature" className="mb-1.5 block text-sm font-medium text-foreground">
          Add your own feature
        </label>
        <div className="flex gap-2">
          <Input
            id="custom-feature"
            value={custom}
            disabled={disabled}
            maxLength={MAX_LENGTH + 10}
            placeholder="e.g. Rear entertainment screen"
            onChange={(e) => {
              setCustom(e.target.value);
              setCustomError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addCustom} disabled={disabled || !custom.trim()}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add
          </Button>
        </div>
        {(customError || error) && (
          <p className="mt-1.5 text-sm text-danger" role="alert">
            {customError ?? error}
          </p>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">{value.length} selected</p>
      </div>
    </div>
  );
}
