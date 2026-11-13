'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buildCarTitle } from '@/lib/format';
import { describeError, removeStorageObjects, AppError } from '@/lib/car-actions';
import { newUuid } from '@/lib/image-compress';
import {
  CAR_FORM_STEPS,
  FIELD_STEP,
  STEP_PHOTOS,
  STEP_REVIEW,
  emptyCarFormValues,
  toCarPayload,
  validateAll,
  validateStep,
  valuesFromCar,
} from '@/lib/validators/car';
import type { CarFieldName, CarFormValues, FieldErrors } from '@/lib/validators/car';
import type { CarStatus, CarWithRelations } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { FormStepsBody } from './FormStepsBody';
import { ReviewStep } from './ReviewStep';
import { StepIndicator } from './StepIndicator';
import type { FormImage, MakeOption, ModelOption } from './types';

export interface CarFormProps {
  mode: 'create' | 'edit';
  actor: 'lister' | 'admin';
  car?: CarWithRelations;
  listerId?: string;
  listers?: { id: string; full_name: string; email: string }[];
  afterSaveHref: string;
  cancelHref: string;
}

interface Persisted {
  position: number;
  is_cover: boolean;
}

function imagesFromCar(car?: CarWithRelations): FormImage[] {
  if (!car) return [];
  return [...(car.images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((img) => ({
      tempId: img.id,
      id: img.id,
      storage_path: img.storage_path,
      thumb_path: img.thumb_path,
      url: img.url,
      thumb_url: img.thumb_url,
      isNew: false,
      status: 'done' as const,
      progress: 100,
    }));
}

function withoutStep(errors: FieldErrors, step: number): FieldErrors {
  const out: FieldErrors = {};
  (Object.keys(errors) as (CarFieldName | 'images')[]).forEach((key) => {
    if (FIELD_STEP[key] !== step) out[key] = errors[key];
  });
  return out;
}

interface Action {
  key: string;
  label: string;
  target: CarStatus;
  confirm?: 'sold' | 'draft';
}

export function CarForm({ mode, actor, car, listerId, listers = [], afterSaveHref, cancelHref }: CarFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const editing = mode === 'edit' && Boolean(car);
  const needsOwner = actor === 'admin' && mode === 'create';

  const [carId] = useState<string>(() => car?.id ?? newUuid());
  const [values, setValues] = useState<CarFormValues>(() => (car ? valuesFromCar(car) : emptyCarFormValues()));
  const [makeName, setMakeName] = useState(car?.make?.name ?? '');
  const [modelName, setModelName] = useState(car?.model?.name ?? '');
  const [titleTouched, setTitleTouched] = useState<boolean>(() =>
    car ? car.title !== buildCarTitle(car.year, car.make?.name ?? '', car.model?.name ?? '', car.version ?? '') : false,
  );
  const [images, setImages] = useState<FormImage[]>(() => imagesFromCar(car));
  const [removed, setRemoved] = useState<FormImage[]>([]);
  const [coverId, setCoverId] = useState<string | null>(() => {
    if (!car) return null;
    const cover = car.images?.find((i) => i.is_cover);
    return cover?.id ?? imagesFromCar(car)[0]?.tempId ?? null;
  });
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(editing ? STEP_REVIEW : 0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState<CarStatus | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const imagesRef = useRef<FormImage[]>(images);
  imagesRef.current = images;
  const carExistsRef = useRef<boolean>(mode === 'edit');
  const doneRef = useRef(false);
  const persistedRef = useRef<Map<string, Persisted>>(
    new Map((car?.images ?? []).map((i) => [i.id, { position: i.position, is_cover: i.is_cover }])),
  );

  const ownerId: string | null = car?.lister_id ?? listerId ?? (values.owner_id || null);
  const ownerLabel = needsOwner
    ? (() => {
        const l = listers.find((x) => x.id === values.owner_id);
        return l ? `${l.full_name || l.email}` : '';
      })()
    : undefined;

  const doneImages = images.filter((i) => i.status === 'done');
  const uploading = images.some((i) => i.status === 'uploading');
  const failed = images.some((i) => i.status === 'error');
  const effectiveCover = images.find((i) => i.tempId === coverId)?.tempId ?? doneImages[0]?.tempId ?? null;

  /* ------------------------------ dirty tracking ------------------------------ */
  const snapshot = JSON.stringify({
    values,
    images: images.map((i) => i.tempId),
    cover: effectiveCover,
    removed: removed.length,
  });
  const baselineRef = useRef<string | null>(null);
  if (baselineRef.current === null) baselineRef.current = snapshot;
  const dirty = snapshot !== baselineRef.current;

  useEffect(() => {
    if (!dirty || doneRef.current) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  /* Best-effort removal of uploaded files that never reached the database. */
  useEffect(
    () => () => {
      if (doneRef.current) return;
      const orphans = imagesRef.current.filter((i) => !i.id && i.status === 'done');
      if (orphans.length > 0) {
        void removeStorageObjects(
          supabase,
          orphans.flatMap((i) => [i.storage_path, i.thumb_path]),
        );
      }
    },
    [supabase],
  );

  /* ------------------------------ auto title ------------------------------ */
  useEffect(() => {
    if (titleTouched) return;
    const y = Number(values.year);
    if (!makeName || !modelName || !Number.isFinite(y) || y <= 0) return;
    const auto = buildCarTitle(y, makeName, modelName, values.version.trim());
    setValues((v) => (v.title === auto ? v : { ...v, title: auto }));
  }, [titleTouched, values.year, values.version, makeName, modelName]);

  /* ------------------------------ helpers ------------------------------ */
  const set = useCallback(<K extends keyof CarFormValues>(key: K, value: CarFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  function handleMakeChange(make: MakeOption | null) {
    setMakeName(make?.name ?? '');
    setModelName('');
    setValues((v) => ({ ...v, make_id: make?.id ?? '', model_id: '' }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.make_id;
      delete next.model_id;
      return next;
    });
  }

  function handleModelChange(model: ModelOption | null) {
    setModelName(model?.name ?? '');
    setValues((v) => ({ ...v, model_id: model?.id ?? '' }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.model_id;
      return next;
    });
  }

  function handleRemoveImage(img: FormImage) {
    setImages((prev) => prev.filter((i) => i.tempId !== img.tempId));
    if (img.id) setRemoved((prev) => [...prev, img]);
    else void removeStorageObjects(supabase, [img.storage_path, img.thumb_path]);
    setErrors((prev) => {
      if (!prev.images) return prev;
      const next = { ...prev };
      delete next.images;
      return next;
    });
  }

  function focusFirstError() {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  }

  function goTo(index: number) {
    setStep(index);
    setMaxStep((m) => Math.max(m, index));
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const ctx = { imageCount: doneImages.length, needsOwner };

  function photosBlocked(): boolean {
    if (uploading) {
      toast({ title: 'Photos are still uploading', description: 'Please wait a moment.', variant: 'info' });
      return true;
    }
    if (failed) {
      toast({
        title: 'Some photos failed to upload',
        description: 'Retry or delete them before continuing.',
        variant: 'error',
      });
      return true;
    }
    return false;
  }

  function next() {
    if (step === STEP_PHOTOS && photosBlocked()) return;
    const errs = validateStep(step, values, ctx);
    if (Object.keys(errs).length > 0) {
      setErrors((prev) => ({ ...withoutStep(prev, step), ...errs }));
      focusFirstError();
      return;
    }
    setErrors((prev) => withoutStep(prev, step));
    goTo(Math.min(step + 1, STEP_REVIEW));
  }

  function back() {
    goTo(Math.max(step - 1, 0));
  }

  function requestCancel() {
    if (dirty) setConfirmCancel(true);
    else router.push(cancelHref);
  }

  /* ------------------------------ saving ------------------------------ */
  async function save(target: CarStatus) {
    if (saving) return;
    setFormError(null);
    if (photosBlocked()) {
      goTo(STEP_PHOTOS);
      return;
    }
    const { errors: errs, firstStep } = validateAll(values, ctx, target === 'draft' ? 'draft' : 'publish');
    if (firstStep !== null) {
      setErrors(errs);
      goTo(firstStep);
      focusFirstError();
      toast({
        title: target === 'draft' ? 'Please fix the highlighted fields' : 'Complete the required fields first',
        description: target === 'draft' ? undefined : 'Publishing needs all required details and at least one photo.',
        variant: 'error',
      });
      return;
    }
    if (!ownerId) {
      setFormError('The owner of this car is not known. Please go back and choose one.');
      return;
    }

    setSaving(target);
    try {
      const ordered = doneImages;
      const coverTemp = ordered.find((i) => i.tempId === coverId)?.tempId ?? ordered[0]?.tempId ?? null;
      const payload = toCarPayload(values, target);

      // 1. car row
      let finalizeStatus = false;
      if (!carExistsRef.current) {
        // New car: store as draft first when it has photos, so buyers never see a car without its images.
        const insertStatus: CarStatus = ordered.length > 0 ? 'draft' : target;
        finalizeStatus = insertStatus !== target;
        const { error } = await supabase
          .from('cars')
          .insert({ id: carId, lister_id: ownerId, ...payload, status: insertStatus });
        if (error) throw error;
        carExistsRef.current = true;
      } else {
        const { data, error } = await supabase.from('cars').update(payload).eq('id', carId).select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new AppError('This car could not be saved. It may have been removed or you may not have permission.');
        }
      }

      // 2. new images
      const insertedIds = new Map<string, string>();
      const toInsert = ordered.filter((i) => !i.id);
      if (toInsert.length > 0) {
        const rows = toInsert.map((img) => ({
          car_id: carId,
          storage_path: img.storage_path,
          thumb_path: img.thumb_path,
          url: img.url,
          thumb_url: img.thumb_url,
          position: ordered.indexOf(img),
          is_cover: img.tempId === coverTemp,
        }));
        const { data, error } = await supabase.from('car_images').insert(rows).select('id, storage_path');
        if (error) throw error;
        for (const row of (data ?? []) as { id: string; storage_path: string }[]) {
          const img = toInsert.find((i) => i.storage_path === row.storage_path);
          if (!img) continue;
          insertedIds.set(img.tempId, row.id);
          persistedRef.current.set(row.id, { position: ordered.indexOf(img), is_cover: img.tempId === coverTemp });
        }
        setImages((prev) =>
          prev.map((i) => (insertedIds.has(i.tempId) ? { ...i, id: insertedIds.get(i.tempId), isNew: false } : i)),
        );
      }

      // 3. removed images (rows first, files only after the database succeeded)
      const toDelete = removed.filter((r) => r.id);
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('car_images')
          .delete()
          .in('id', toDelete.map((r) => r.id as string));
        if (error) throw error;
        toDelete.forEach((r) => persistedRef.current.delete(r.id as string));
        setRemoved([]);
      }

      // 4. position / cover of the images that already existed
      const updates: { id: string; position: number; is_cover: boolean }[] = [];
      for (const img of ordered) {
        if (!img.id || insertedIds.has(img.tempId)) continue;
        const position = ordered.indexOf(img);
        const is_cover = img.tempId === coverTemp;
        const prev = persistedRef.current.get(img.id);
        if (!prev || prev.position !== position || prev.is_cover !== is_cover) {
          updates.push({ id: img.id, position, is_cover });
        }
      }
      await Promise.all(
        updates.map(async (u) => {
          const { error } = await supabase
            .from('car_images')
            .update({ position: u.position, is_cover: u.is_cover })
            .eq('id', u.id);
          if (error) throw error;
          persistedRef.current.set(u.id, { position: u.position, is_cover: u.is_cover });
        }),
      );

      // 5. final status for new cars with photos
      if (finalizeStatus) {
        const { error } = await supabase.from('cars').update({ status: target }).eq('id', carId);
        if (error) throw error;
      }

      // 6. only now remove the files of deleted images
      if (toDelete.length > 0) {
        await removeStorageObjects(
          supabase,
          toDelete.flatMap((r) => [r.storage_path, r.thumb_path]),
        );
      }

      doneRef.current = true;
      toast({
        title: target === 'published' ? 'Car published' : target === 'sold' ? 'Car marked as sold' : 'Draft saved',
        description: values.title.trim(),
        variant: 'success',
      });
      router.push(afterSaveHref);
      router.refresh();
    } catch (err) {
      const message = describeError(err, 'We could not save the car. Please try again.');
      setFormError(message);
      toast({ title: 'Could not save the car', description: message, variant: 'error' });
      setSaving(null);
    }
  }

  /* ------------------------------ buttons ------------------------------ */
  const actions: Action[] = [];
  if (!editing || car?.status === 'draft') {
    actions.push({ key: 'draft', label: 'Save as draft', target: 'draft' });
  } else {
    actions.push({ key: 'unpublish', label: 'Unpublish', target: 'draft', confirm: 'draft' });
  }
  actions.push({
    key: 'publish',
    label: editing && car?.status === 'published' ? 'Save changes' : 'Publish',
    target: 'published',
  });
  if (editing && car?.status !== 'sold') {
    actions.push({ key: 'sold', label: 'Mark as sold', target: 'sold', confirm: 'sold' });
  }
  if (editing && car?.status === 'sold') {
    actions.push({ key: 'keep-sold', label: 'Save as sold', target: 'sold' });
  }

  function runAction(action: Action) {
    if (action.confirm) setPendingAction(action);
    else void save(action.target);
  }

  const quickSaveTarget: CarStatus = editing ? values.status : 'draft';
  const errorSteps = Array.from(new Set((Object.keys(errors) as (CarFieldName | 'images')[]).map((k) => FIELD_STEP[k])));
  const busy = saving !== null;
  const isLast = step === STEP_REVIEW;
  const meta = CAR_FORM_STEPS[step];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <StepIndicator
        steps={CAR_FORM_STEPS}
        current={step}
        maxReached={maxStep}
        onSelect={goTo}
        errorSteps={errorSteps}
      />

      {formError && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground" role="alert">
          {formError}
        </p>
      )}

      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.defaultPrevented || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
          const el = e.target as HTMLElement;
          if (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'file' && !isLast) {
            e.preventDefault();
            next();
          }
        }}
        className="space-y-4"
      >
        <Card>
          <CardContent>
            <div className="mb-5">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-semibold text-foreground focus:outline-none"
              >
                {meta.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
            </div>

            {step === STEP_REVIEW ? (
              <ReviewStep
                values={values}
                makeName={makeName}
                modelName={modelName}
                ownerLabel={ownerLabel}
                images={images}
                coverId={effectiveCover}
                errors={errors}
                onEdit={goTo}
              />
            ) : (
              <FormStepsBody
                step={step}
                mode={mode}
                values={values}
                errors={errors}
                set={set}
                disabled={busy}
                needsOwner={needsOwner}
                listers={listers}
                ownerLocked={images.length > 0}
                titleTouched={titleTouched}
                onTitleEdit={(title) => {
                  setTitleTouched(true);
                  set('title', title);
                }}
                onTitleReset={() => setTitleTouched(false)}
                onMakeChange={handleMakeChange}
                onModelChange={handleModelChange}
                images={images}
                setImages={setImages}
                coverId={effectiveCover}
                onCoverChange={setCoverId}
                onRemoveImage={handleRemoveImage}
                ownerId={ownerId}
                carId={carId}
              />
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          <div>
            {step === 0 ? (
              <Button type="button" variant="ghost" onClick={requestCancel} disabled={busy}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={back} disabled={busy}>
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Back
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isLast ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  loading={saving === quickSaveTarget}
                  disabled={busy}
                  onClick={() => void save(quickSaveTarget)}
                >
                  {editing ? 'Save changes' : 'Save as draft'}
                </Button>
                <Button type="button" onClick={next} disabled={busy}>
                  Next <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            ) : (
              actions.map((action) => (
                <Button
                  key={action.key}
                  type="button"
                  variant={action.target === values.status ? 'primary' : 'outline'}
                  loading={saving === action.target}
                  disabled={busy}
                  onClick={() => runAction(action)}
                >
                  {action.label}
                </Button>
              ))
            )}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmCancel}
        title="Discard your changes?"
        description="You have unsaved changes. If you leave now they will be lost and any photos you uploaded will be removed."
        confirmLabel="Discard and leave"
        danger
        onConfirm={() => {
          setConfirmCancel(false);
          router.push(cancelHref);
        }}
        onCancel={() => setConfirmCancel(false)}
      />

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction?.confirm === 'sold' ? 'Mark this car as sold?' : 'Unpublish this car?'}
        description={
          pendingAction?.confirm === 'sold'
            ? 'Buyers will still see the car, but with a SOLD badge. Your other changes on this form are saved too.'
            : 'The car will move back to drafts and disappear from the website. Your other changes on this form are saved too.'
        }
        confirmLabel={pendingAction?.confirm === 'sold' ? 'Mark as sold' : 'Unpublish'}
        loading={busy}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action) void save(action.target);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
