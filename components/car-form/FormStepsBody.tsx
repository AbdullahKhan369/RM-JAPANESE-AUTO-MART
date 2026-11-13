'use client';

import type { Dispatch, SetStateAction } from 'react';
import { STEP_BASICS, STEP_DETAILS, STEP_PHOTOS, STEP_SPECS } from '@/lib/validators/car';
import { StepBasics, StepDetails, StepSpecs } from './FormSteps';
import { ImageUploader } from './ImageUploader';
import type { FormImage, MakeOption, ModelOption, StepProps } from './types';

interface FormStepsBodyProps extends StepProps {
  step: number;
  mode: 'create' | 'edit';
  needsOwner: boolean;
  listers: { id: string; full_name: string; email: string }[];
  ownerLocked: boolean;
  titleTouched: boolean;
  onTitleEdit: (title: string) => void;
  onTitleReset: () => void;
  onMakeChange: (make: MakeOption | null) => void;
  onModelChange: (model: ModelOption | null) => void;
  images: FormImage[];
  setImages: Dispatch<SetStateAction<FormImage[]>>;
  coverId: string | null;
  onCoverChange: (tempId: string) => void;
  onRemoveImage: (image: FormImage) => void;
  ownerId: string | null;
  carId: string;
}

/** Renders the body of wizard steps 1 to 4 (the Review step has its own component). */
export function FormStepsBody(props: FormStepsBodyProps) {
  const { step, values, errors, set, disabled } = props;
  switch (step) {
    case STEP_BASICS:
      return (
        <StepBasics
          values={values}
          errors={errors}
          set={set}
          disabled={disabled}
          needsOwner={props.needsOwner}
          listers={props.listers}
          ownerLocked={props.ownerLocked}
          titleTouched={props.titleTouched}
          onTitleEdit={props.onTitleEdit}
          onTitleReset={props.onTitleReset}
          onMakeChange={props.onMakeChange}
          onModelChange={props.onModelChange}
        />
      );
    case STEP_SPECS:
      return <StepSpecs values={values} errors={errors} set={set} disabled={disabled} />;
    case STEP_PHOTOS:
      return (
        <ImageUploader
          images={props.images}
          setImages={props.setImages}
          coverId={props.coverId}
          onCoverChange={props.onCoverChange}
          onRemove={props.onRemoveImage}
          ownerId={props.ownerId}
          carId={props.carId}
          disabled={disabled}
          error={errors.images}
        />
      );
    case STEP_DETAILS:
      return <StepDetails values={values} errors={errors} set={set} disabled={disabled} mode={props.mode} />;
    default:
      return null;
  }
}
