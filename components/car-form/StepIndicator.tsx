'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: readonly { id: string; title: string }[];
  current: number;
  /** highest step the user may jump to */
  maxReached: number;
  onSelect: (index: number) => void;
  /** steps that currently contain validation errors */
  errorSteps?: number[];
}

export function StepIndicator({ steps, current, maxReached, onSelect, errorSteps = [] }: StepIndicatorProps) {
  const percent = Math.round(((current + 1) / steps.length) * 100);
  return (
    <nav aria-label="Progress" className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium text-foreground">
          Step {current + 1} of {steps.length}
          <span className="text-muted-foreground"> · {steps[current]?.title}</span>
        </p>
        <p className="text-muted-foreground">{percent}%</p>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Form progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-200 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="grid grid-cols-5 gap-1 sm:gap-2">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= maxReached;
          const hasError = errorSteps.includes(i);
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                disabled={!reachable}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 ring-ring',
                  reachable ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                    active && 'border-primary bg-primary text-primary-foreground',
                    done && !hasError && 'border-success bg-success text-primary-foreground',
                    hasError && 'border-danger bg-danger text-primary-foreground',
                    !active && !done && !hasError && 'border-border bg-card',
                  )}
                >
                  {done && !hasError ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                </span>
                <span className="hidden truncate sm:block">{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
