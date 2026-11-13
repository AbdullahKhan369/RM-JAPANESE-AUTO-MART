-- =====================================================================
-- RM Japanese Auto Mart : Supabase schema
-- Free-plan safe: no Edge Functions, no Realtime, no pg_cron, no paid add-ons.
--
-- HOW TO RUN: Supabase Dashboard > SQL Editor > New query > paste this
-- WHOLE file > Run. Run it ONCE on a fresh project.
-- This file is the single source of truth for the database. If a column
-- changes, CONTEXT.md section 6 must change with it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Generic helper: keep updated_at fresh
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Profiles (one row per auth user: admins and listers)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'lister' check (role in ('admin', 'lister')),
  full_name   text not null default '',
  email       text not null default '',
  phone       text not null default '',
  city        text not null default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers (SECURITY DEFINER so policies can call them without recursion)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active
  );
$$;

create or replace function public.is_active_lister()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'lister' and p.is_active
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_active_lister();
$$;

create or replace function public.is_lister_active(lid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = lid and p.role = 'lister' and p.is_active
  );
$$;

-- Create the profile row automatically when an auth user is created.
-- Role comes from app_metadata (only the service role can set it).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, phone)
  values (
    new.id,
    case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin' else 'lister' end,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A normal user can edit their own name / phone / city but never role, status or email.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id := old.id;
    new.role := old.role;
    new.is_active := old.is_active;
    new.email := old.email;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------
-- 3. Makes and models (reference data used by car forms and filters)
-- ---------------------------------------------------------------------
create table public.makes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);
create unique index makes_name_lower_idx on public.makes (lower(name));

create table public.models (
  id          uuid primary key default gen_random_uuid(),
  make_id     uuid not null references public.makes (id) on delete cascade,
  name        text not null,
  slug        text not null,
  created_at  timestamptz not null default now(),
  unique (make_id, slug)
);
create unique index models_make_name_lower_idx on public.models (make_id, lower(name));
create index models_make_id_idx on public.models (make_id);

-- ---------------------------------------------------------------------
-- 4. Cars
-- ---------------------------------------------------------------------
create table public.cars (
  id             uuid primary key default gen_random_uuid(),
  lister_id      uuid not null references public.profiles (id) on delete cascade,
  title          text not null check (char_length(title) between 3 and 160),
  make_id        uuid not null references public.makes (id),
  model_id       uuid not null references public.models (id),
  version        text not null default '',
  year           int  not null check (year between 1970 and 2100),
  -- ALL prices are stored in EUR. Other currencies are converted in the UI.
  price_eur      numeric(12,2) not null check (price_eur >= 0 and price_eur < 100000000),
  mileage_km     int check (mileage_km >= 0),
  fuel_type      text not null check (fuel_type in ('petrol','diesel','hybrid','plug_in_hybrid','electric')),
  transmission   text not null check (transmission in ('automatic','manual')),
  engine_cc      int check (engine_cc >= 0),
  body_type      text not null check (body_type in ('sedan','hatchback','suv','crossover','coupe','wagon','minivan','van','pickup','kei','convertible')),
  color          text not null default '',
  drive_type     text check (drive_type in ('fwd','rwd','awd','4wd')),
  steering       text not null default 'right' check (steering in ('right','left')),
  auction_grade  text not null default '',
  doors          int check (doors between 1 and 7),
  seats          int check (seats between 1 and 20),
  deliver_to     text[] not null default array['ireland','uk','pakistan']::text[],
  features       text[] not null default '{}'::text[],
  description    text not null default '' check (char_length(description) <= 5000),
  status         text not null default 'draft' check (status in ('draft','published','sold')),
  is_featured    boolean not null default false,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint cars_deliver_to_valid check (
    deliver_to <@ array['ireland','uk','pakistan']::text[] and cardinality(deliver_to) >= 1
  )
);

create index cars_status_published_idx on public.cars (status, published_at desc);
create index cars_lister_idx   on public.cars (lister_id);
create index cars_make_idx     on public.cars (make_id);
create index cars_model_idx    on public.cars (model_id);
create index cars_year_idx     on public.cars (year);
create index cars_price_idx    on public.cars (price_eur);
create index cars_featured_idx on public.cars (is_featured) where is_featured;

create trigger cars_set_updated_at
  before update on public.cars
  for each row execute function public.set_updated_at();

-- Listers cannot feature cars or move them to another lister.
-- published_at is stamped the first time a car becomes published.
create or replace function public.prepare_car_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_featured := false;
    else
      new.is_featured := old.is_featured;
      new.lister_id := old.lister_id;
    end if;
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger cars_prepare_row
  before insert or update on public.cars
  for each row execute function public.prepare_car_row();

-- ---------------------------------------------------------------------
-- 5. Car images (files live in Storage bucket "car-images")
-- ---------------------------------------------------------------------
create table public.car_images (
  id            uuid primary key default gen_random_uuid(),
  car_id        uuid not null references public.cars (id) on delete cascade,
  storage_path  text not null,   -- full-size file path inside the bucket
  thumb_path    text not null,   -- thumbnail file path inside the bucket
  url           text not null,   -- public URL of the full-size file
  thumb_url     text not null,   -- public URL of the thumbnail
  position      int  not null default 0,
  is_cover      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index car_images_car_idx on public.car_images (car_id, position);

-- ---------------------------------------------------------------------
-- 6. Seller requests (public "List Your Car" form)
-- ---------------------------------------------------------------------
create table public.lister_requests (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null check (char_length(full_name) between 2 and 120),
  email        text not null check (char_length(email) between 5 and 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone        text not null check (char_length(phone) between 6 and 30),
  city         text not null default '' check (char_length(city) <= 120),
  country      text not null default '' check (char_length(country) <= 120),
  message      text not null default '' check (char_length(message) <= 2000),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note   text not null default '' check (char_length(admin_note) <= 2000),
  lister_id    uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);
create index lister_requests_status_idx on public.lister_requests (status, created_at desc);

-- ---------------------------------------------------------------------
-- 7. Exchange rates (single row, base EUR, refreshed by the server)
-- ---------------------------------------------------------------------
create table public.exchange_rates (
  id          int primary key default 1 check (id = 1),
  base        text not null default 'EUR',
  gbp         numeric(14,6) not null check (gbp > 0),
  pkr         numeric(14,6) not null check (pkr > 0),
  source      text not null default 'seed',
  updated_at  timestamptz not null default now()
);

insert into public.exchange_rates (id, base, gbp, pkr, source, updated_at)
values (1, 'EUR', 0.86, 325, 'seed', '2000-01-01T00:00:00Z')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 8. Editable website text (admin "Website Text" page)
-- ---------------------------------------------------------------------
create table public.site_content (
  key         text primary key,
  value       text not null default '',
  label       text not null,
  group_name  text not null,
  input_type  text not null default 'text' check (input_type in ('text','textarea')),
  sort_order  int  not null default 0,
  updated_at  timestamptz not null default now()
);

create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 9. Public view: only what buyers may see about a lister
-- ---------------------------------------------------------------------
create or replace view public.public_listers as
  select id, full_name, email, phone, city
  from public.profiles
  where role = 'lister' and is_active;

grant select on public.public_listers to anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.makes           enable row level security;
alter table public.models          enable row level security;
alter table public.cars            enable row level security;
alter table public.car_images      enable row level security;
alter table public.lister_requests enable row level security;
alter table public.exchange_rates  enable row level security;
alter table public.site_content    enable row level security;

-- profiles
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: admin read all" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update all" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- (no insert/delete policies: rows are created by trigger, deleted via auth user deletion by the service role)

-- makes / models
create policy "makes: public read" on public.makes
  for select to anon, authenticated using (true);
create policy "makes: staff insert" on public.makes
  for insert to authenticated with check (public.is_staff());
create policy "makes: admin update" on public.makes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "makes: admin delete" on public.makes
  for delete to authenticated using (public.is_admin());

create policy "models: public read" on public.models
  for select to anon, authenticated using (true);
create policy "models: staff insert" on public.models
  for insert to authenticated with check (public.is_staff());
create policy "models: admin update" on public.models
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "models: admin delete" on public.models
  for delete to authenticated using (public.is_admin());

-- cars
create policy "cars: public read published and sold" on public.cars
  for select to anon, authenticated
  using (status in ('published','sold') and public.is_lister_active(lister_id));
create policy "cars: lister read own" on public.cars
  for select to authenticated
  using (lister_id = auth.uid() and public.is_active_lister());
create policy "cars: lister insert own" on public.cars
  for insert to authenticated
  with check (lister_id = auth.uid() and public.is_active_lister());
create policy "cars: lister update own" on public.cars
  for update to authenticated
  using (lister_id = auth.uid() and public.is_active_lister())
  with check (lister_id = auth.uid() and public.is_active_lister());
create policy "cars: lister delete own" on public.cars
  for delete to authenticated
  using (lister_id = auth.uid() and public.is_active_lister());
create policy "cars: admin all" on public.cars
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- car_images (visibility follows the parent car's own RLS)
create policy "car_images: read if car visible" on public.car_images
  for select to anon, authenticated
  using (exists (select 1 from public.cars c where c.id = car_images.car_id));
create policy "car_images: lister insert own" on public.car_images
  for insert to authenticated
  with check (public.is_active_lister() and exists (
    select 1 from public.cars c where c.id = car_images.car_id and c.lister_id = auth.uid()));
create policy "car_images: lister update own" on public.car_images
  for update to authenticated
  using (public.is_active_lister() and exists (
    select 1 from public.cars c where c.id = car_images.car_id and c.lister_id = auth.uid()))
  with check (public.is_active_lister() and exists (
    select 1 from public.cars c where c.id = car_images.car_id and c.lister_id = auth.uid()));
create policy "car_images: lister delete own" on public.car_images
  for delete to authenticated
  using (public.is_active_lister() and exists (
    select 1 from public.cars c where c.id = car_images.car_id and c.lister_id = auth.uid()));
create policy "car_images: admin all" on public.car_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- lister_requests
create policy "lister_requests: anyone can submit" on public.lister_requests
  for insert to anon, authenticated
  with check (status = 'pending' and admin_note = '' and lister_id is null and reviewed_at is null);
create policy "lister_requests: admin all" on public.lister_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- exchange_rates (read-only for everyone; written only by the service role)
create policy "exchange_rates: public read" on public.exchange_rates
  for select to anon, authenticated using (true);

-- site_content
create policy "site_content: public read" on public.site_content
  for select to anon, authenticated using (true);
create policy "site_content: admin all" on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 11. Storage bucket "car-images" (public read, 2 MB per file, images only)
--     File path convention: {lister_id}/{car_id}/{uuid}.webp  and  {uuid}_thumb.webp
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-images', 'car-images', true, 2097152, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "car-images: staff read"   on storage.objects;
drop policy if exists "car-images: staff insert" on storage.objects;
drop policy if exists "car-images: staff update" on storage.objects;
drop policy if exists "car-images: staff delete" on storage.objects;

create policy "car-images: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'car-images');

create policy "car-images: staff insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'car-images'
    and (
      ((storage.foldername(name))[1] = auth.uid()::text and public.is_active_lister())
      or public.is_admin()
    )
  );

create policy "car-images: staff update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'car-images'
    and (
      ((storage.foldername(name))[1] = auth.uid()::text and public.is_active_lister())
      or public.is_admin()
    )
  );

create policy "car-images: staff delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'car-images'
    and (
      ((storage.foldername(name))[1] = auth.uid()::text and public.is_active_lister())
      or public.is_admin()
    )
  );

-- ---------------------------------------------------------------------
-- 12. Seed data
-- ---------------------------------------------------------------------
insert into public.makes (name, slug) values
  ('Toyota', 'toyota'),
  ('Honda', 'honda'),
  ('Nissan', 'nissan'),
  ('Suzuki', 'suzuki'),
  ('Mazda', 'mazda'),
  ('Subaru', 'subaru'),
  ('Mitsubishi', 'mitsubishi'),
  ('Daihatsu', 'daihatsu'),
  ('Lexus', 'lexus'),
  ('Isuzu', 'isuzu')
on conflict do nothing;

insert into public.models (make_id, name, slug)
select m.id, v.name, v.slug
from public.makes m
join (values
    ('toyota', 'Corolla', 'corolla'),
    ('toyota', 'Vitz', 'vitz'),
    ('toyota', 'Aqua', 'aqua'),
    ('toyota', 'Prius', 'prius'),
    ('toyota', 'Yaris', 'yaris'),
    ('toyota', 'Raize', 'raize'),
    ('toyota', 'Passo', 'passo'),
    ('toyota', 'Camry', 'camry'),
    ('toyota', 'Crown', 'crown'),
    ('toyota', 'Mark X', 'mark-x'),
    ('toyota', 'Harrier', 'harrier'),
    ('toyota', 'RAV4', 'rav4'),
    ('toyota', 'C-HR', 'c-hr'),
    ('toyota', 'Land Cruiser', 'land-cruiser'),
    ('toyota', 'Land Cruiser Prado', 'land-cruiser-prado'),
    ('toyota', 'Hilux', 'hilux'),
    ('toyota', 'Alphard', 'alphard'),
    ('toyota', 'Vellfire', 'vellfire'),
    ('toyota', 'Hiace', 'hiace'),
    ('toyota', 'Supra', 'supra'),
    ('toyota', 'Sienta', 'sienta'),
    ('toyota', 'Roomy', 'roomy'),
    ('toyota', 'Corolla Cross', 'corolla-cross'),
    ('honda', 'Civic', 'civic'),
    ('honda', 'City', 'city'),
    ('honda', 'Fit', 'fit'),
    ('honda', 'Vezel', 'vezel'),
    ('honda', 'Freed', 'freed'),
    ('honda', 'N-Box', 'n-box'),
    ('honda', 'N-One', 'n-one'),
    ('honda', 'CR-V', 'cr-v'),
    ('honda', 'Accord', 'accord'),
    ('honda', 'Insight', 'insight'),
    ('honda', 'Odyssey', 'odyssey'),
    ('honda', 'Stepwgn', 'stepwgn'),
    ('honda', 'Grace', 'grace'),
    ('honda', 'Shuttle', 'shuttle'),
    ('honda', 'Jade', 'jade'),
    ('honda', 'S660', 's660'),
    ('honda', 'Fit Shuttle', 'fit-shuttle'),
    ('nissan', 'Note', 'note'),
    ('nissan', 'Leaf', 'leaf'),
    ('nissan', 'Juke', 'juke'),
    ('nissan', 'X-Trail', 'x-trail'),
    ('nissan', 'Kicks', 'kicks'),
    ('nissan', 'Qashqai', 'qashqai'),
    ('nissan', 'Serena', 'serena'),
    ('nissan', 'Dayz', 'dayz'),
    ('nissan', 'Sunny', 'sunny'),
    ('nissan', 'March', 'march'),
    ('nissan', 'Skyline', 'skyline'),
    ('nissan', 'GT-R', 'gt-r'),
    ('nissan', 'Fairlady Z', 'fairlady-z'),
    ('nissan', 'Elgrand', 'elgrand'),
    ('nissan', 'Sylphy', 'sylphy'),
    ('nissan', 'Roox', 'roox'),
    ('suzuki', 'Alto', 'alto'),
    ('suzuki', 'Wagon R', 'wagon-r'),
    ('suzuki', 'Swift', 'swift'),
    ('suzuki', 'Cultus', 'cultus'),
    ('suzuki', 'Jimny', 'jimny'),
    ('suzuki', 'Every', 'every'),
    ('suzuki', 'Hustler', 'hustler'),
    ('suzuki', 'Spacia', 'spacia'),
    ('suzuki', 'Ignis', 'ignis'),
    ('suzuki', 'Vitara', 'vitara'),
    ('suzuki', 'Solio', 'solio'),
    ('suzuki', 'Lapin', 'lapin'),
    ('suzuki', 'Mehran', 'mehran'),
    ('suzuki', 'Baleno', 'baleno'),
    ('mazda', 'Demio', 'demio'),
    ('mazda', 'Mazda2', 'mazda2'),
    ('mazda', 'Axela', 'axela'),
    ('mazda', 'Mazda3', 'mazda3'),
    ('mazda', 'Atenza', 'atenza'),
    ('mazda', 'Mazda6', 'mazda6'),
    ('mazda', 'CX-3', 'cx-3'),
    ('mazda', 'CX-5', 'cx-5'),
    ('mazda', 'CX-30', 'cx-30'),
    ('mazda', 'CX-8', 'cx-8'),
    ('mazda', 'MX-5', 'mx-5'),
    ('mazda', 'RX-7', 'rx-7'),
    ('mazda', 'RX-8', 'rx-8'),
    ('subaru', 'Impreza', 'impreza'),
    ('subaru', 'Forester', 'forester'),
    ('subaru', 'Legacy', 'legacy'),
    ('subaru', 'XV', 'xv'),
    ('subaru', 'Levorg', 'levorg'),
    ('subaru', 'WRX STI', 'wrx-sti'),
    ('subaru', 'WRX S4', 'wrx-s4'),
    ('subaru', 'BRZ', 'brz'),
    ('subaru', 'Outback', 'outback'),
    ('subaru', 'Crosstrek', 'crosstrek'),
    ('mitsubishi', 'Lancer', 'lancer'),
    ('mitsubishi', 'Outlander', 'outlander'),
    ('mitsubishi', 'Pajero', 'pajero'),
    ('mitsubishi', 'Delica', 'delica'),
    ('mitsubishi', 'eK Wagon', 'ek-wagon'),
    ('mitsubishi', 'Colt', 'colt'),
    ('mitsubishi', 'ASX', 'asx'),
    ('mitsubishi', 'RVR', 'rvr'),
    ('mitsubishi', 'Mirage', 'mirage'),
    ('mitsubishi', 'Eclipse Cross', 'eclipse-cross'),
    ('daihatsu', 'Mira', 'mira'),
    ('daihatsu', 'Cuore', 'cuore'),
    ('daihatsu', 'Move', 'move'),
    ('daihatsu', 'Tanto', 'tanto'),
    ('daihatsu', 'Taft', 'taft'),
    ('daihatsu', 'Rocky', 'rocky'),
    ('daihatsu', 'Copen', 'copen'),
    ('daihatsu', 'Hijet', 'hijet'),
    ('daihatsu', 'Boon', 'boon'),
    ('daihatsu', 'Terios', 'terios'),
    ('lexus', 'IS', 'is'),
    ('lexus', 'GS', 'gs'),
    ('lexus', 'LS', 'ls'),
    ('lexus', 'RX', 'rx'),
    ('lexus', 'NX', 'nx'),
    ('lexus', 'UX', 'ux'),
    ('lexus', 'LX', 'lx'),
    ('lexus', 'CT', 'ct'),
    ('lexus', 'ES', 'es'),
    ('lexus', 'LC', 'lc'),
    ('isuzu', 'D-Max', 'd-max'),
    ('isuzu', 'Elf', 'elf'),
    ('isuzu', 'MU-X', 'mu-x'),
    ('isuzu', 'Bighorn', 'bighorn')
) as v (make_slug, name, slug) on v.make_slug = m.slug
on conflict do nothing;

insert into public.site_content (key, value, label, group_name, input_type, sort_order) values
  ('site_name', 'RM Japanese Auto Mart', 'Site name', 'Brand', 'text', 0),
  ('site_tagline', 'Japanese cars, delivered to Ireland, the UK and Pakistan', 'Tagline', 'Brand', 'text', 10),
  ('seo_title', 'RM Japanese Auto Mart – Japanese Cars Delivered to Ireland, UK and Pakistan', 'Browser title', 'SEO', 'text', 20),
  ('seo_description', 'Browse quality used Japanese cars with real photos and details. We ship from Japan to Ireland, the United Kingdom and Pakistan.', 'Search engine description', 'SEO', 'textarea', 30),
  ('contact_email', '', 'Contact email (leave empty to hide)', 'Contact', 'text', 40),
  ('contact_phone', '', 'Contact phone (leave empty to hide)', 'Contact', 'text', 50),
  ('contact_whatsapp', '', 'WhatsApp number, international format e.g. +923001234567 (leave empty to hide)', 'Contact', 'text', 60),
  ('contact_address', '', 'Address (leave empty to hide)', 'Contact', 'textarea', 70),
  ('contact_hours', '', 'Opening hours (leave empty to hide)', 'Contact', 'text', 80),
  ('nav_list_button', 'List Your Car', 'Header button: list your car', 'Navigation', 'text', 90),
  ('home_hero_title', 'Find your next Japanese car', 'Hero title', 'Home – Hero', 'text', 100),
  ('home_hero_subtitle', 'Hand-picked cars from Japan, shipped to Ireland, the UK and Pakistan.', 'Hero subtitle', 'Home – Hero', 'text', 110),
  ('home_search_button', 'Search cars', 'Search button text', 'Home – Hero', 'text', 120),
  ('home_delivery_title', 'We deliver to', 'Delivery strip title', 'Home – Hero', 'text', 130),
  ('home_featured_title', 'Featured cars', 'Featured section title', 'Home – Featured', 'text', 140),
  ('home_featured_subtitle', 'Fresh arrivals from our Japan team', 'Featured section subtitle', 'Home – Featured', 'text', 150),
  ('home_makes_title', 'Browse by make', 'Browse by make title', 'Home – Featured', 'text', 160),
  ('home_how_title', 'How it works', 'Section title', 'Home – How it works', 'text', 170),
  ('home_how_subtitle', 'From Japan to your door in four simple steps', 'Section subtitle', 'Home – How it works', 'text', 180),
  ('home_step1_title', 'Choose your car', 'Step 1 title', 'Home – How it works', 'text', 190),
  ('home_step1_text', 'Browse our stock and filter by make, model, price, year and more.', 'Step 1 text', 'Home – How it works', 'textarea', 200),
  ('home_step2_title', 'Contact our team', 'Step 2 title', 'Home – How it works', 'text', 210),
  ('home_step2_text', 'Call, WhatsApp or email the RM representative listed on the car.', 'Step 2 text', 'Home – How it works', 'textarea', 220),
  ('home_step3_title', 'We ship it', 'Step 3 title', 'Home – How it works', 'text', 230),
  ('home_step3_text', 'We handle the purchase, export paperwork and shipping from Japan.', 'Step 3 text', 'Home – How it works', 'textarea', 240),
  ('home_step4_title', 'Delivered to you', 'Step 4 title', 'Home – How it works', 'text', 250),
  ('home_step4_text', 'Receive your car in Ireland, the UK or Pakistan.', 'Step 4 text', 'Home – How it works', 'textarea', 260),
  ('home_why_title', 'Why RM Japanese Auto Mart', 'Section title', 'Home – Why us', 'text', 270),
  ('home_why1_title', 'Direct from Japan', 'Reason 1 title', 'Home – Why us', 'text', 280),
  ('home_why1_text', 'Cars sourced straight from Japanese auctions and dealers.', 'Reason 1 text', 'Home – Why us', 'textarea', 290),
  ('home_why2_title', 'Our own team', 'Reason 2 title', 'Home – Why us', 'text', 300),
  ('home_why2_text', 'Every listing is posted by our own staff, never by anonymous sellers.', 'Reason 2 text', 'Home – Why us', 'textarea', 310),
  ('home_why3_title', 'Three destinations', 'Reason 3 title', 'Home – Why us', 'text', 320),
  ('home_why3_text', 'Shipping to Ireland, the United Kingdom and Pakistan.', 'Reason 3 text', 'Home – Why us', 'textarea', 330),
  ('home_cta_title', 'Have a car to list?', 'Title', 'Home – Call to action', 'text', 340),
  ('home_cta_text', 'Send us your details and our team will set you up with a seller account.', 'Text', 'Home – Call to action', 'textarea', 350),
  ('cars_title', 'Japanese cars for sale', 'Page title', 'Cars page', 'text', 360),
  ('cars_subtitle', 'Search our current stock', 'Page subtitle', 'Cars page', 'text', 370),
  ('cars_empty_title', 'No cars match your search', 'No results title', 'Cars page', 'text', 380),
  ('cars_empty_text', 'Try removing a few filters or searching for a different make.', 'No results text', 'Cars page', 'textarea', 390),
  ('detail_contact_title', 'Contact the seller', 'Contact box title', 'Car detail page', 'text', 400),
  ('detail_disclaimer', 'Prices are shown in your selected currency using live exchange rates. The final price is confirmed by our team.', 'Price disclaimer', 'Car detail page', 'textarea', 410),
  ('list_form_title', 'List your car with us', 'Form title', 'List your car form', 'text', 420),
  ('list_form_text', 'Fill in your details. Our admin team will review your request and send you seller login details.', 'Form text', 'List your car form', 'textarea', 430),
  ('list_success_title', 'Request received', 'Success title', 'List your car form', 'text', 440),
  ('list_success_text', 'Thank you! Our team will contact you soon.', 'Success text', 'List your car form', 'textarea', 450),
  ('lister_landing_title', 'Seller portal', 'Seller landing title', 'Seller portal', 'text', 460),
  ('lister_landing_text', 'RM team members: sign in to add and manage your car listings.', 'Seller landing text', 'Seller portal', 'textarea', 470),
  ('lister_landing_button', 'I''m a Seller', 'Seller landing button', 'Seller portal', 'text', 480),
  ('about_title', 'About us', 'Page title', 'About page', 'text', 490),
  ('about_body', 'RM Japanese Auto Mart connects buyers in Ireland, the United Kingdom and Pakistan with quality used cars from Japan.

Every car on this website is listed by our own team, so you always deal directly with a real RM representative.

Browse the stock, pick a car and contact the representative shown on the listing. We take care of the rest.', 'Page text (blank line = new paragraph)', 'About page', 'textarea', 500),
  ('contact_title', 'Contact us', 'Page title', 'Contact page', 'text', 510),
  ('contact_text', 'Questions about a car or shipping? Get in touch with our team.', 'Page text', 'Contact page', 'textarea', 520),
  ('footer_about', 'Quality Japanese cars, delivered to Ireland, the UK and Pakistan.', 'Footer about text', 'Footer', 'textarea', 530),
  ('footer_copyright', '© {year} RM Japanese Auto Mart. All rights reserved.', 'Copyright line ({year} becomes the current year)', 'Footer', 'text', 540)
on conflict (key) do nothing;

-- =====================================================================
-- DONE. Next: follow SUPABASE_SETUP.md (disable signups, create first admin).
-- =====================================================================
