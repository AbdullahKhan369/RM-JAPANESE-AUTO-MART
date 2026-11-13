import type { CarFormValues, FieldErrors } from '@/lib/validators/car';

export interface FormImage {
  tempId: string;
  /** car_images row id once the image is stored in the database */
  id?: string;
  storage_path: string;
  thumb_path: string;
  url: string;
  thumb_url: string;
  isNew: boolean;
  status: 'uploading' | 'done' | 'error';
  stage?: 'compressing' | 'uploading';
  /** 0 to 100 */
  progress: number;
  error?: string;
  /** local object URL shown while the file uploads */
  previewUrl?: string;
  fileName?: string;
}

export interface MakeOption {
  id: string;
  name: string;
  slug: string;
}

export interface ModelOption {
  id: string;
  make_id: string;
  name: string;
  slug: string;
}

export interface StepProps {
  values: CarFormValues;
  errors: FieldErrors;
  set: <K extends keyof CarFormValues>(key: K, value: CarFormValues[K]) => void;
  disabled: boolean;
}
