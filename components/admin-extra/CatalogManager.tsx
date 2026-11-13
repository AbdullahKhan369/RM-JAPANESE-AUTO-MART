'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { describeError } from '@/lib/car-actions';
import { slugify, cn } from '@/lib/utils';
import type { Make, Model } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type Dialog =
  | { kind: 'add-make' }
  | { kind: 'rename-make'; make: Make }
  | { kind: 'add-model'; makeId: string }
  | { kind: 'rename-model'; model: Model }
  | null;

type Pending = { kind: 'delete-make'; make: Make } | { kind: 'delete-model'; model: Model } | null;

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

function validateName(raw: string, noun: string): { name: string; slug: string } | { error: string } {
  const name = clean(raw);
  if (name.length < 1) return { error: `Enter the ${noun} name.` };
  if (name.length > 60) return { error: `The ${noun} name is too long (max 60 characters).` };
  const slug = slugify(name);
  if (!slug) return { error: 'Use letters or numbers in the name.' };
  return { name, slug };
}

interface NameDialogProps {
  open: boolean;
  title: string;
  label: string;
  hint?: string;
  initial: string;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

function NameDialog({ open, title, label, hint, initial, submitLabel, busy, error, onSubmit, onClose }: NameDialogProps) {
  const [name, setName] = useState(initial);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" loading={busy} onClick={() => onSubmit(name)}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(name);
        }}
      >
        <Field label={label} htmlFor="catalog-name" required error={error ?? undefined} hint={hint}>
          <Input
            id="catalog-name"
            value={name}
            maxLength={80}
            autoFocus
            invalid={Boolean(error)}
            aria-invalid={Boolean(error)}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <button type="submit" className="sr-only" tabIndex={-1}>
          {submitLabel}
        </button>
      </form>
    </Modal>
  );
}

export function CatalogManager({ makes: initialMakes, models: initialModels }: { makes: Make[]; models: Model[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const [makes, setMakes] = useState<Make[]>(initialMakes);
  const [models, setModels] = useState<Model[]>(initialModels);
  const [selectedId, setSelectedId] = useState<string | null>(initialMakes[0]?.id ?? null);
  const [makeSearch, setMakeSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const modelsRef = useRef<HTMLDivElement>(null);

  const selected = makes.find((m) => m.id === selectedId) ?? null;
  const countByMake = useMemo(() => {
    const map = new Map<string, number>();
    models.forEach((m) => map.set(m.make_id, (map.get(m.make_id) ?? 0) + 1));
    return map;
  }, [models]);

  const shownMakes = makes.filter((m) => !makeSearch.trim() || m.name.toLowerCase().includes(makeSearch.trim().toLowerCase()));
  const selectedModels = models.filter((m) => m.make_id === selectedId);
  const shownModels = selectedModels.filter(
    (m) => !modelSearch.trim() || m.name.toLowerCase().includes(modelSearch.trim().toLowerCase()),
  );

  function closeDialog() {
    if (busy) return;
    setDialog(null);
    setDialogError(null);
  }

  function selectMake(id: string) {
    setSelectedId(id);
    setModelSearch('');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      requestAnimationFrame(() => modelsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  /* ------------------------------- makes ------------------------------- */
  async function submitMake(raw: string, existing?: Make) {
    const v = validateName(raw, 'make');
    if ('error' in v) {
      setDialogError(v.error);
      return;
    }
    const clash = makes.find((m) => m.id !== existing?.id && (same(m.name, v.name) || m.slug === v.slug));
    if (clash) {
      setDialogError(`A make called "${clash.name}" already exists.`);
      return;
    }
    if (existing && existing.name === v.name) {
      closeDialog();
      return;
    }
    setBusy(true);
    setDialogError(null);
    try {
      if (existing) {
        const { data, error } = await supabase
          .from('makes')
          .update({ name: v.name, slug: v.slug })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (error) throw error;
        const updated = data as Make;
        setMakes((prev) => prev.map((m) => (m.id === updated.id ? updated : m)).sort(byName));
        toast({ title: 'Make renamed', description: updated.name, variant: 'success' });
      } else {
        const { data, error } = await supabase.from('makes').insert({ name: v.name, slug: v.slug }).select('*').single();
        if (error) throw error;
        const created = data as Make;
        setMakes((prev) => [...prev, created].sort(byName));
        setSelectedId(created.id);
        toast({ title: 'Make added', description: created.name, variant: 'success' });
      }
      setDialog(null);
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      setDialogError(
        code === '23505' ? 'A make with this name already exists.' : describeError(err, 'Could not save the make. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteMake(make: Make) {
    setBusy(true);
    try {
      const { data, error } = await supabase.from('makes').delete().eq('id', make.id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('none');
      setMakes((prev) => prev.filter((m) => m.id !== make.id));
      setModels((prev) => prev.filter((m) => m.make_id !== make.id));
      if (selectedId === make.id) setSelectedId(makes.find((m) => m.id !== make.id)?.id ?? null);
      toast({ title: 'Make deleted', description: make.name, variant: 'success' });
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      toast({
        title: 'Could not delete the make',
        description:
          code === '23503'
            ? 'This make is used by cars and cannot be deleted.'
            : describeError(err, 'You may not have permission, or it was already removed.'),
        variant: 'error',
      });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  /* ------------------------------- models ------------------------------- */
  async function submitModel(raw: string, makeId: string, existing?: Model) {
    const v = validateName(raw, 'model');
    if ('error' in v) {
      setDialogError(v.error);
      return;
    }
    const clash = models.find(
      (m) => m.make_id === makeId && m.id !== existing?.id && (same(m.name, v.name) || m.slug === v.slug),
    );
    if (clash) {
      setDialogError(`A model called "${clash.name}" already exists for this make.`);
      return;
    }
    if (existing && existing.name === v.name) {
      closeDialog();
      return;
    }
    setBusy(true);
    setDialogError(null);
    try {
      if (existing) {
        const { data, error } = await supabase
          .from('models')
          .update({ name: v.name, slug: v.slug })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (error) throw error;
        const updated = data as Model;
        setModels((prev) => prev.map((m) => (m.id === updated.id ? updated : m)).sort(byName));
        toast({ title: 'Model renamed', description: updated.name, variant: 'success' });
      } else {
        const { data, error } = await supabase
          .from('models')
          .insert({ make_id: makeId, name: v.name, slug: v.slug })
          .select('*')
          .single();
        if (error) throw error;
        const created = data as Model;
        setModels((prev) => [...prev, created].sort(byName));
        toast({ title: 'Model added', description: created.name, variant: 'success' });
      }
      setDialog(null);
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      setDialogError(
        code === '23505'
          ? 'A model with this name already exists for this make.'
          : describeError(err, 'Could not save the model. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteModel(model: Model) {
    setBusy(true);
    try {
      const { data, error } = await supabase.from('models').delete().eq('id', model.id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('none');
      setModels((prev) => prev.filter((m) => m.id !== model.id));
      toast({ title: 'Model deleted', description: model.name, variant: 'success' });
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      toast({
        title: 'Could not delete the model',
        description:
          code === '23503'
            ? 'This model is used by cars and cannot be deleted.'
            : describeError(err, 'You may not have permission, or it was already removed.'),
        variant: 'error',
      });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 ring-ring';

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Makes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Makes ({makes.length})</CardTitle>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setDialogError(null);
                setDialog({ kind: 'add-make' });
              }}
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={makeSearch}
              onChange={(e) => setMakeSearch(e.target.value)}
              placeholder="Search makes"
              aria-label="Search makes"
              className="pl-9"
            />
          </div>
          {makes.length === 0 ? (
            <EmptyState title="No makes yet" description="Add the first make to get started." />
          ) : shownMakes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No makes match your search.</p>
          ) : (
            <ul className="max-h-[32rem] space-y-1 overflow-y-auto pr-1">
              {shownMakes.map((m) => {
                const active = m.id === selectedId;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => selectMake(m.id)}
                      aria-pressed={active}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 ring-ring',
                        active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
                      )}
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className={cn('text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {countByMake.get(m.id) ?? 0} models
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Models */}
      <div ref={modelsRef} className="scroll-mt-20">
        <Card>
          <CardHeader>
            {selected ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Models of {selected.name}</CardTitle>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={iconBtn}
                    aria-label={`Rename ${selected.name}`}
                    title="Rename make"
                    onClick={() => {
                      setDialogError(null);
                      setDialog({ kind: 'rename-make', make: selected });
                    }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={cn(iconBtn, 'hover:bg-danger/10 hover:text-danger')}
                    aria-label={`Delete ${selected.name}`}
                    title="Delete make"
                    onClick={() => setPending({ kind: 'delete-make', make: selected })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setDialogError(null);
                      setDialog({ kind: 'add-model', makeId: selected.id });
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Add model
                  </Button>
                </div>
              </div>
            ) : (
              <CardTitle>Models</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <EmptyState title="Select a make" description="Choose a make on the left to see and manage its models." />
            ) : selectedModels.length === 0 ? (
              <EmptyState
                title="No models yet"
                description={`${selected.name} has no models. Add the first one.`}
              />
            ) : (
              <>
                {selectedModels.length > 8 && (
                  <div className="relative mb-3 max-w-sm">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      type="search"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search models"
                      aria-label="Search models"
                      className="pl-9"
                    />
                  </div>
                )}
                {shownModels.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No models match your search.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {shownModels.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.slug}</p>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            className={iconBtn}
                            aria-label={`Rename ${m.name}`}
                            onClick={() => {
                              setDialogError(null);
                              setDialog({ kind: 'rename-model', model: m });
                            }}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={cn(iconBtn, 'hover:bg-danger/10 hover:text-danger')}
                            aria-label={`Delete ${m.name}`}
                            onClick={() => setPending({ kind: 'delete-model', model: m })}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs (keyed so the input resets for each open) */}
      {dialog?.kind === 'add-make' && (
        <NameDialog
          key="add-make"
          open
          title="Add a make"
          label="Make name"
          initial=""
          submitLabel="Add make"
          busy={busy}
          error={dialogError}
          onSubmit={(name) => void submitMake(name)}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === 'rename-make' && (
        <NameDialog
          key={`rename-make-${dialog.make.id}`}
          open
          title="Rename make"
          label="Make name"
          hint="The web address (slug) of this make is updated too, so old filter links to it will stop matching."
          initial={dialog.make.name}
          submitLabel="Save"
          busy={busy}
          error={dialogError}
          onSubmit={(name) => void submitMake(name, dialog.make)}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === 'add-model' && (
        <NameDialog
          key={`add-model-${dialog.makeId}`}
          open
          title="Add a model"
          label="Model name"
          initial=""
          submitLabel="Add model"
          busy={busy}
          error={dialogError}
          onSubmit={(name) => void submitModel(name, dialog.makeId)}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === 'rename-model' && (
        <NameDialog
          key={`rename-model-${dialog.model.id}`}
          open
          title="Rename model"
          label="Model name"
          hint="The web address (slug) of this model is updated too."
          initial={dialog.model.name}
          submitLabel="Save"
          busy={busy}
          error={dialogError}
          onSubmit={(name) => void submitModel(name, dialog.model.make_id, dialog.model)}
          onClose={closeDialog}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'delete-make' ? `Delete ${pending.make.name}?` : pending ? `Delete ${pending.model.name}?` : ''}
        description={
          pending?.kind === 'delete-make'
            ? `This also deletes its ${countByMake.get(pending.make.id) ?? 0} models. If any car uses this make, it cannot be deleted.`
            : 'If any car uses this model, it cannot be deleted.'
        }
        confirmLabel="Delete"
        danger
        loading={busy}
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === 'delete-make') void deleteMake(pending.make);
          else void deleteModel(pending.model);
        }}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
      />
    </div>
  );
}
