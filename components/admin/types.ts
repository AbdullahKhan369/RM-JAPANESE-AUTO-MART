import type { CarStatus, ListerRequest, Profile } from '@/types/database';

export interface UserRow
  extends Pick<Profile, 'id' | 'full_name' | 'email' | 'phone' | 'city' | 'is_active' | 'created_at'> {
  car_count: number | null;
}

export interface AdminCarRow {
  id: string;
  title: string;
  year: number;
  price_eur: number;
  status: CarStatus;
  is_featured: boolean;
  lister_name: string;
  thumb_url: string | null;
}

export interface RequestRow extends ListerRequest {
  lister: { id: string; full_name: string; email: string } | null;
}

export interface LoginCredentials {
  role: 'lister' | 'admin';
  name: string;
  email: string;
  password: string;
  phone: string;
}
