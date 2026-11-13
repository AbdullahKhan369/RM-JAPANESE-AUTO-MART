export type Role = 'admin' | 'lister';
export type Currency = 'PKR' | 'GBP' | 'EUR';
export type CarStatus = 'draft' | 'published' | 'sold';
export type DeliverTo = 'ireland' | 'uk' | 'pakistan';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'plug_in_hybrid' | 'electric';
export type Transmission = 'automatic' | 'manual';
export type BodyType = 'sedan' | 'hatchback' | 'suv' | 'crossover' | 'coupe' | 'wagon'
  | 'minivan' | 'van' | 'pickup' | 'kei' | 'convertible';
export type DriveType = 'fwd' | 'rwd' | 'awd' | '4wd';
export type Steering = 'right' | 'left';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string; role: Role; full_name: string; email: string; phone: string; city: string;
  is_active: boolean; created_at: string; updated_at: string;
}
export interface PublicLister { id: string; full_name: string; email: string; phone: string; city: string; }
export interface Make { id: string; name: string; slug: string; created_at: string; }
export interface Model { id: string; make_id: string; name: string; slug: string; created_at: string; }

export interface Car {
  id: string; lister_id: string; title: string; make_id: string; model_id: string; version: string;
  year: number; price_eur: number; mileage_km: number | null; fuel_type: FuelType;
  transmission: Transmission; engine_cc: number | null; body_type: BodyType; color: string;
  drive_type: DriveType | null; steering: Steering; auction_grade: string;
  doors: number | null; seats: number | null; deliver_to: DeliverTo[]; features: string[];
  description: string; status: CarStatus; is_featured: boolean; published_at: string | null;
  created_at: string; updated_at: string;
}
export interface CarImage {
  id: string; car_id: string; storage_path: string; thumb_path: string;
  url: string; thumb_url: string; position: number; is_cover: boolean; created_at: string;
}
export interface CarWithRelations extends Car {
  make: Pick<Make, 'id' | 'name' | 'slug'>;
  model: Pick<Model, 'id' | 'name' | 'slug' | 'make_id'>;
  images: CarImage[];
}
export interface ListerRequest {
  id: string; full_name: string; email: string; phone: string; city: string; country: string;
  message: string; status: RequestStatus; admin_note: string; lister_id: string | null;
  created_at: string; reviewed_at: string | null;
}
export interface SiteContentRow {
  key: string; value: string; label: string; group_name: string;
  input_type: 'text' | 'textarea'; sort_order: number; updated_at: string;
}
export interface ExchangeRates { id: 1; base: 'EUR'; gbp: number; pkr: number; source: string; updated_at: string; }
export type Rates = { EUR: 1; GBP: number; PKR: number };
