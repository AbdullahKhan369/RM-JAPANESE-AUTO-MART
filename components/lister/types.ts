import type { CarStatus } from '@/types/database';

export interface ThumbSource {
  thumb_url: string;
  position: number;
  is_cover: boolean;
}

/** The light row shape used by the dashboard and the My Cars list. */
export interface ListCar {
  id: string;
  title: string;
  price_eur: number;
  year: number;
  status: CarStatus;
  updated_at: string;
  images: ThumbSource[];
}

/** PostgREST select used by those two screens. */
export const LIST_CAR_SELECT =
  'id, title, price_eur, year, status, updated_at, images:car_images(thumb_url, position, is_cover)';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
