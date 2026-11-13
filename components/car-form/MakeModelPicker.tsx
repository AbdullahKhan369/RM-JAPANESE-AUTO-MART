'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import { describeError } from '@/lib/car-actions';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type { MakeOption, ModelOption } from './types';

interface MakeModelPickerProps {
  makeId: string;
  modelId: string;
  onMakeChange: (make: MakeOption | null) => void;
  onModelChange: (model: ModelOption | null) => void;
  makeError?: string;
  modelError?: string;
  disabled?: boolean;
}

const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ');
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

export function MakeModelPicker({
  makeId,
  modelId,
  onMakeChange,
  onModelChange,
  makeError,
  modelError,
  disabled,
}: MakeModelPickerProps) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const [makes, setMakes] = useState<MakeOption[]>([]);
  const [makesState, setMakesState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [modelsByMake, setModelsByMake] = useState<Record<string, ModelOption[]>>({});
  const [modelsState, setModelsState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const [addingMake, setAddingMake] = useState(false);
  const [newMake, setNewMake] = useState('');
  const [makeBusy, setMakeBusy] = useState(false);
  const [makeFormError, setMakeFormError] = useState<string | null>(null);

  const [addingModel, setAddingModel] = useState(false);
  const [newModel, setNewModel] = useState('');
  const [modelBusy, setModelBusy] = useState(false);
  const [modelFormError, setModelFormError] = useState<string | null>(null);

  const loadMakes = useCallback(async (): Promise<MakeOption[]> => {
    const { data, error } = await supabase.from('makes').select('id, name, slug').order('name');
    if (error) throw error;
    const list = ((data ?? []) as MakeOption[]).slice().sort(byName);
    setMakes(list);
    return list;
  }, [supabase]);

  const loadModels = useCallback(
    async (forMake: string): Promise<ModelOption[]> => {
      const { data, error } = await supabase
        .from('models')
        .select('id, make_id, name, slug')
        .eq('make_id', forMake)
        .order('name');
      if (error) throw error;
      const list = ((data ?? []) as ModelOption[]).slice().sort(byName);
      setModelsByMake((prev) => ({ ...prev, [forMake]: list }));
      return list;
    },
    [supabase],
  );

  const initMakes = useCallback(async () => {
    setMakesState('loading');
    try {
      await loadMakes();
      setMakesState('ready');
    } catch {
      setMakesState('error');
    }
  }, [loadMakes]);

  useEffect(() => {
    void initMakes();
  }, [initMakes]);

  const hasModels = makeId ? Boolean(modelsByMake[makeId]) : false;
  useEffect(() => {
    if (!makeId || hasModels) return;
    let cancelled = false;
    setModelsState('loading');
    loadModels(makeId)
      .then(() => {
        if (!cancelled) setModelsState('ready');
      })
      .catch(() => {
        if (!cancelled) setModelsState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [makeId, hasModels, loadModels]);

  const models = makeId ? modelsByMake[makeId] ?? [] : [];

  function handleMakeSelect(id: string) {
    const make = makes.find((m) => m.id === id) ?? null;
    onMakeChange(make);
    setAddingModel(false);
  }

  function handleModelSelect(id: string) {
    onModelChange(models.find((m) => m.id === id) ?? null);
  }

  async function submitMake() {
    const name = cleanName(newMake);
    setMakeFormError(null);
    if (name.length < 2) {
      setMakeFormError('Enter the make name (at least 2 characters).');
      return;
    }
    if (name.length > 60) {
      setMakeFormError('Make name is too long (max 60 characters).');
      return;
    }
    const slug = slugify(name);
    if (!slug) {
      setMakeFormError('Use letters or numbers in the name.');
      return;
    }
    const existing = makes.find((m) => sameName(m.name, name) || m.slug === slug);
    if (existing) {
      onMakeChange(existing);
      setAddingMake(false);
      setNewMake('');
      toast({ title: `${existing.name} already exists`, description: 'We selected it for you.', variant: 'info' });
      return;
    }
    setMakeBusy(true);
    try {
      const { data, error } = await supabase.from('makes').insert({ name, slug }).select('id, name, slug').single();
      if (error) {
        if (error.code === '23505') {
          const list = await loadMakes();
          const found = list.find((m) => sameName(m.name, name) || m.slug === slug);
          if (found) {
            onMakeChange(found);
            setAddingMake(false);
            setNewMake('');
            toast({ title: `${found.name} already exists`, description: 'We selected it for you.', variant: 'info' });
            return;
          }
        }
        throw error;
      }
      const created = data as MakeOption;
      setMakes((prev) => [...prev, created].sort(byName));
      setModelsByMake((prev) => ({ ...prev, [created.id]: [] }));
      onMakeChange(created);
      setAddingMake(false);
      setNewMake('');
      toast({ title: `${created.name} added`, variant: 'success' });
    } catch (err) {
      setMakeFormError(describeError(err, 'Could not add this make. Please try again.'));
    } finally {
      setMakeBusy(false);
    }
  }

  async function submitModel() {
    const name = cleanName(newModel);
    setModelFormError(null);
    if (!makeId) {
      setModelFormError('Choose a make first.');
      return;
    }
    if (name.length < 1) {
      setModelFormError('Enter the model name.');
      return;
    }
    if (name.length > 60) {
      setModelFormError('Model name is too long (max 60 characters).');
      return;
    }
    const slug = slugify(name);
    if (!slug) {
      setModelFormError('Use letters or numbers in the name.');
      return;
    }
    const existing = models.find((m) => sameName(m.name, name) || m.slug === slug);
    if (existing) {
      onModelChange(existing);
      setAddingModel(false);
      setNewModel('');
      toast({ title: `${existing.name} already exists`, description: 'We selected it for you.', variant: 'info' });
      return;
    }
    setModelBusy(true);
    try {
      const { data, error } = await supabase
        .from('models')
        .insert({ make_id: makeId, name, slug })
        .select('id, make_id, name, slug')
        .single();
      if (error) {
        if (error.code === '23505') {
          const list = await loadModels(makeId);
          const found = list.find((m) => sameName(m.name, name) || m.slug === slug);
          if (found) {
            onModelChange(found);
            setAddingModel(false);
            setNewModel('');
            toast({ title: `${found.name} already exists`, description: 'We selected it for you.', variant: 'info' });
            return;
          }
        }
        throw error;
      }
      const created = data as ModelOption;
      setModelsByMake((prev) => ({ ...prev, [makeId]: [...(prev[makeId] ?? []), created].sort(byName) }));
      onModelChange(created);
      setAddingModel(false);
      setNewModel('');
      toast({ title: `${created.name} added`, variant: 'success' });
    } catch (err) {
      setModelFormError(describeError(err, 'Could not add this model. Please try again.'));
    } finally {
      setModelBusy(false);
    }
  }

  const linkButton =
    'text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 ring-ring rounded disabled:opacity-60';

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* MAKE */}
      <div className="space-y-2">
        <Field label="Make" htmlFor="car-make" required error={makeError}>
          <div className="relative">
            <Select
              id="car-make"
              value={makeId}
              invalid={Boolean(makeError)}
              aria-invalid={Boolean(makeError)}
              disabled={disabled || makesState === 'loading'}
              onChange={(e) => handleMakeSelect(e.target.value)}
            >
              <option value="">{makesState === 'loading' ? 'Loading makes…' : 'Select make'}</option>
              {makes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
        </Field>
        {makesState === 'error' && (
          <p className="text-sm text-danger" role="alert">
            Could not load makes.{' '}
            <button type="button" className={linkButton} onClick={() => void initMakes()}>
              Try again
            </button>
          </p>
        )}
        {!addingMake ? (
          <button type="button" className={linkButton} disabled={disabled} onClick={() => setAddingMake(true)}>
            Can&apos;t find it? Add new make
          </button>
        ) : (
          <div className="space-y-2 rounded-xl border border-border bg-muted p-3">
            <label htmlFor="new-make" className="block text-sm font-medium text-foreground">
              New make
            </label>
            <Input
              id="new-make"
              value={newMake}
              maxLength={80}
              placeholder="e.g. Toyota"
              autoFocus
              onChange={(e) => {
                setNewMake(e.target.value);
                setMakeFormError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitMake();
                }
                if (e.key === 'Escape') setAddingMake(false);
              }}
            />
            {makeFormError && (
              <p className="text-sm text-danger" role="alert">
                {makeFormError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" loading={makeBusy} onClick={() => void submitMake()}>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add make
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={makeBusy}
                onClick={() => {
                  setAddingMake(false);
                  setMakeFormError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODEL */}
      <div className="space-y-2">
        <Field label="Model" htmlFor="car-model" required error={modelError}>
          <Select
            id="car-model"
            value={modelId}
            invalid={Boolean(modelError)}
            aria-invalid={Boolean(modelError)}
            disabled={disabled || !makeId || modelsState === 'loading'}
            onChange={(e) => handleModelSelect(e.target.value)}
          >
            <option value="">
              {!makeId ? 'Select a make first' : modelsState === 'loading' ? 'Loading models…' : 'Select model'}
            </option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        {modelsState === 'loading' && makeId && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner className="h-3.5 w-3.5" /> Loading models…
          </p>
        )}
        {modelsState === 'error' && makeId && (
          <p className="text-sm text-danger" role="alert">
            Could not load models.{' '}
            <button
              type="button"
              className={linkButton}
              onClick={() => {
                setModelsState('loading');
                loadModels(makeId)
                  .then(() => setModelsState('ready'))
                  .catch(() => setModelsState('error'));
              }}
            >
              Try again
            </button>
          </p>
        )}
        {!addingModel ? (
          <button
            type="button"
            className={linkButton}
            disabled={disabled || !makeId}
            onClick={() => setAddingModel(true)}
          >
            Can&apos;t find it? Add new model
          </button>
        ) : (
          <div className="space-y-2 rounded-xl border border-border bg-muted p-3">
            <label htmlFor="new-model" className="block text-sm font-medium text-foreground">
              New model
            </label>
            <Input
              id="new-model"
              value={newModel}
              maxLength={80}
              placeholder="e.g. Corolla"
              autoFocus
              onChange={(e) => {
                setNewModel(e.target.value);
                setModelFormError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitModel();
                }
                if (e.key === 'Escape') setAddingModel(false);
              }}
            />
            {modelFormError && (
              <p className="text-sm text-danger" role="alert">
                {modelFormError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" loading={modelBusy} onClick={() => void submitModel()}>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add model
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={modelBusy}
                onClick={() => {
                  setAddingModel(false);
                  setModelFormError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
