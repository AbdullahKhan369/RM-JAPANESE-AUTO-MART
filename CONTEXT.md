# CONTEXT.md: RM Japanese Auto Mart (shared contract)

> **This file is law.** Three different AI accounts (A, B, C) build three parts of ONE website. Nobody can see the others' code. The only thing keeping the parts compatible is this file and `schema.sql`. If something is not written here, do NOT invent a shared name: keep it private inside your own files.

---

## 0. Rules for every account

1. Read this whole file and `schema.sql` before writing anything.
2. **Only create files you own** (section 4). Never create, overwrite or "improve" a file owned by another account, even if you think it is missing. Assume it exists exactly as described in section 7.
3. If you need something from another account that is not in this contract, do not guess. Add it to a file called `NEEDS.md` (what, why, suggested signature) and keep going with a private workaround inside your own folders.
4. **No new dependencies.** Use only the packages in section 3. No shadcn CLI, Radix, framer-motion, swiper, axios, date-fns, etc. Write small helpers yourself.
5. **Supabase FREE plan only** (section 3.2). Do not use any paid or premium feature.
6. Every data screen needs: loading state, empty state, error state. Every form needs validation and clear error messages. Every destructive action needs a confirm dialog.
7. Mobile-first, fully responsive, accessible (labels, focus rings, keyboard, `aria-*`, alt text), light + dark mode via the design tokens (section 10). Never hard-code colors like `bg-white` or `text-gray-900`; use token classes (`bg-background`, `text-foreground`, ...).
8. TypeScript strict. No `any` unless unavoidable (then comment why). No `console.log`. No TODO, no placeholder, no "implement later", no lorem ipsum. Everything must work.
9. UI language: English. Names in code: English.
10. Output format: section 18.

---

## 1. Product summary

**RM Japanese Auto Mart** is a car marketplace, inspired by PakWheels in layout and filters, but different in business model:

- Cars are **Japanese used cars**, delivered to **Ireland, the UK and Pakistan**.
- **Buyers** browse with **no sign up and no sign in**. They see photos, details and the seller's contact info (phone + email).
- **Listers** are NOT the public. They are RM employees. A person who wants to list sends the **"List Your Car"** form; an **admin** reviews it, creates a lister account (email + password) and sends the credentials. The lister then opens `/lister`, clicks **"I'm a Seller"**, logs in and manages their own cars.
- **Admins** control everything: all cars, all listers, passwords, requests, website text, makes/models, exchange rates.
- **Currency:** prices are stored in **EUR only**. Buyers choose **PKR / GBP / EUR** in a modal on first visit; every price is then shown converted at a live rate. They can switch any time from the header.
- **Dark / light mode** toggle. **Default is light.**
- Logo file: `public/logo.png` (provided by the owner: black background, white line-art of 3 sports cars, a globe centred on Japan and shipping containers). Brand name text: **RM Japanese Auto Mart**.

---

## 2. Roles and permissions

| Capability | Buyer (anon) | Lister | Admin |
|---|---|---|---|
| Browse published/sold cars, see lister contact | yes | yes | yes |
| Submit "List Your Car" request | yes | yes | yes |
| Create / edit / delete **own** cars (incl. drafts, mark sold) | no | yes | yes |
| Edit / delete **any** car, feature a car, reassign owner | no | no | yes |
| Create cars on behalf of a lister | no | no | yes |
| Edit own name / phone / city, change own password | no | yes | yes |
| Create listers and admins, reset any password, disable/enable/delete users | no | no | yes |
| Approve / reject requests | no | no | yes |
| Edit website text, makes/models | no | no | yes |
| Add a new make/model while creating a car | no | yes | yes |

There can be several admins. A disabled user (`is_active = false`) cannot log in or manage anything.

---

## 3. Tech stack (pinned) and free-plan guardrails

### 3.1 Stack

- Next.js **14.2.x App Router** (NOT 15: `cookies()` / `params` are synchronous here), React 18.3, TypeScript 5, Tailwind CSS **3.4**, `next/font/google` (Inter).
- Supabase (Postgres + Auth + Storage) with `@supabase/supabase-js` and `@supabase/ssr`. **No ORM.**
- Deploy target: any Node host (Vercel / Netlify / Cloudflare). No host-specific code.

**Allowed dependencies (this is the complete list):**

```
dependencies:    next, react, react-dom, @supabase/supabase-js, @supabase/ssr, next-themes,
                 lucide-react, clsx, tailwind-merge, zod, react-hook-form, @hookform/resolvers, server-only
devDependencies: typescript, @types/node, @types/react, @types/react-dom, tailwindcss, postcss,
                 autoprefixer, eslint, eslint-config-next
```

Only account A writes `package.json`.

### 3.2 Free-plan guardrails (forbidden list)

- NO Edge Functions, NO Realtime, NO pg_cron, NO Vault, NO database webhooks, NO branching, NO point-in-time-recovery assumptions.
- NO Storage image transformations (`transform` option) and no `next/image` optimizer: set `images: { unoptimized: true }` in `next.config.mjs`. We compress images **in the browser before upload**.
- NO emails sent from Supabase Auth (free built-in SMTP is tiny). Therefore: no "forgot password" email, no email confirmation, no magic links, no invite emails. Admin sets passwords and shares them manually.
- NO public sign-up. Sign-ups are disabled in the Supabase dashboard; accounts are created only by the admin via the service-role key.
- Server-only secret `SUPABASE_SERVICE_ROLE_KEY` is used ONLY in `lib/supabase/admin.ts` and the code that imports it (server components / route handlers). Never in a `'use client'` file, never prefixed `NEXT_PUBLIC_`.
- Keep queries light: paginate (24 per page), select only needed columns, never fetch all cars.
- Storage budget is ~1 GB: image limits in section 14 are mandatory.

### 3.3 Environment variables (`.env.example` is written by A)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 4. Folder structure and ownership

Legend: **[A]** = Foundation + Public site, **[B]** = Lister portal + CarForm + two admin helper pages, **[C]** = Admin panel + admin API. Repo root = project root (no `src/` folder). Path alias `@/*` points to the repo root.

```
package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs,
.eslintrc.json, .env.example, .gitignore, README.md, middleware.ts ............. [A]
public/logo.png ................................................ provided by owner (do not create)
supabase/schema.sql ............................................ provided (do not create)
types/database.ts .............................................. [A]

lib/
  supabase/client.ts, server.ts, admin.ts, middleware.ts ......... [A]
  auth.ts, constants.ts, currency.ts, format.ts, rates.ts ......... [A]
  site-content.ts, site-content-defaults.ts, utils.ts ............. [A]
  validators/list-request.ts ...................................... [A]
  validators/car.ts ............................................... [B]
  car-actions.ts, image-compress.ts ............................... [B]

components/
  providers/ThemeProvider.tsx, CurrencyProvider.tsx ............... [A]
  ui/*  (section 7.5) ............................................. [A]
  layout/Header.tsx, Footer.tsx, Logo.tsx, ThemeToggle.tsx,
         CurrencySwitcher.tsx, CurrencyModal.tsx, PortalShell.tsx .. [A]
  auth/LoginForm.tsx, SignOutButton.tsx ........................... [A]
  cars/*  (public cards, filters, gallery, contact box...) ........ [A]
  list-request/*  ................................................. [A]
  car-form/*  ..................................................... [B]
  lister/*  ....................................................... [B]
  admin-extra/*  (content editor, catalog manager) ................ [B]
  admin/*  ........................................................ [C]

app/
  layout.tsx, globals.css, not-found.tsx, error.tsx, icon.png,
  sitemap.ts, robots.ts ........................................... [A]
  (public)/layout.tsx, page.tsx ................................... [A]
  (public)/cars/page.tsx, cars/loading.tsx, cars/[id]/page.tsx .... [A]
  (public)/list-your-car/page.tsx, about/page.tsx, contact/page.tsx [A]

  lister/page.tsx, lister/login/page.tsx .......................... [B]
  lister/(portal)/layout.tsx, dashboard/page.tsx, cars/page.tsx,
                  cars/new/page.tsx, cars/[id]/edit/page.tsx,
                  profile/page.tsx ................................ [B]

  admin/page.tsx, admin/login/page.tsx ............................ [C]
  admin/(panel)/layout.tsx, dashboard/page.tsx, cars/page.tsx,
                 cars/new/page.tsx, cars/[id]/edit/page.tsx,
                 listers/page.tsx, admins/page.tsx,
                 requests/page.tsx, rates/page.tsx ................. [C]
  admin/(panel)/content/page.tsx, catalog/page.tsx ................ [B]
  api/admin/** (route handlers, section 12) ....................... [C]
```

If a page needs a sub-component, it goes in that account's own `components/<folder>/`.

---

## 5. Routes

| URL | Who can open | Owner | Notes |
|---|---|---|---|
| `/` | everyone | A | Home |
| `/cars` | everyone | A | Listing + filters |
| `/cars/[id]` | everyone | A | Detail. `id` = car uuid. Sold cars still open (with SOLD badge); drafts 404 |
| `/list-your-car` | everyone | A | Same form as the header modal |
| `/about`, `/contact` | everyone | A | Text comes from site content |
| `/lister` | everyone | B | Landing with **"I'm a Seller"** button -> `/lister/login` |
| `/lister/login` | everyone | B | Uses `LoginForm role="lister"` |
| `/lister/dashboard` | lister | B | |
| `/lister/cars` | lister | B | Own cars list |
| `/lister/cars/new` | lister | B | CarForm create |
| `/lister/cars/[id]/edit` | lister (owner) | B | CarForm edit |
| `/lister/profile` | lister | B | Edit name/phone/city, change password |
| `/admin` | admin | C | Redirect: logged-in admin -> `/admin/dashboard`, else `/admin/login` |
| `/admin/login` | everyone | C | Uses `LoginForm role="admin"` |
| `/admin/dashboard` | admin | C | |
| `/admin/cars` | admin | C | All cars, filters, actions |
| `/admin/cars/new` | admin | C | Pick lister + CarForm |
| `/admin/cars/[id]/edit` | admin | C | CarForm + owner reassign |
| `/admin/listers` | admin | C | |
| `/admin/admins` | admin | C | |
| `/admin/requests` | admin | C | |
| `/admin/rates` | admin | C | |
| `/admin/content` | admin | **B** | Website text editor |
| `/admin/catalog` | admin | **B** | Makes and models manager |

Public pages are `export const dynamic = 'force-dynamic'` (no stale caches: admin text edits and new cars show immediately).
Lister and admin pages: `metadata.robots = { index: false, follow: false }`.

---

## 6. Database

`schema.sql` is the truth. Summary (all tables in schema `public`):

- `profiles` (id = auth user id, role `admin|lister`, full_name, email, phone, city, is_active)
- `makes` (id, name, slug), `models` (id, make_id, name, slug)
- `cars` (see types below). **`price_eur` is EUR.** `deliver_to text[]`, `features text[]`
- `car_images` (car_id, storage_path, thumb_path, url, thumb_url, position, is_cover)
- `lister_requests` (full_name, email, phone, city, country, message, status, admin_note, lister_id, reviewed_at)
- `exchange_rates` (single row id=1: gbp, pkr per 1 EUR, source, updated_at)
- `site_content` (key, value, label, group_name, input_type, sort_order)
- View `public_listers` (id, full_name, email, phone, city): the only way buyers read lister contact data. `profiles` itself is NOT publicly readable.
- Storage bucket `car-images` (public read). Paths: `{lister_id}/{car_id}/{uuid}.webp` and `{lister_id}/{car_id}/{uuid}_thumb.webp`.

Important RLS facts everyone must respect:
- Buyers (anon key) can only read cars with `status in ('published','sold')` whose lister is active.
- When inserting into `lister_requests` from the browser, call `.insert(...)` **without** `.select()` (anon cannot read the table back).
- Listers can never change `is_featured` or `lister_id` (DB trigger silently keeps the old values). Only admins can.
- A lister updating their own `profiles` row cannot change role/email/is_active (trigger).
- `exchange_rates` is writable only with the service-role key.
- Deleting a make/model that cars use fails with a foreign-key error: show a friendly message.

### 6.1 `types/database.ts` (written by A, exactly these exports; B and C import them)

```ts
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
```

Standard PostgREST select used everywhere to load a car with relations:

```ts
export const CAR_SELECT =
  '*, make:makes(id,name,slug), model:models(id,name,slug,make_id), images:car_images(*)';
```
(A exports it from `lib/constants.ts`. Sort `images` client-side by `position`; cover = `is_cover` image, else first.)

---

## 7. Shared code: exact contract (all written by A)

B and C **import** these. Signatures must not change.

### 7.1 `lib/supabase/*`

```ts
// client.ts      (browser)           export function createClient(): SupabaseClient
// server.ts      (server components, route handlers; uses next/headers cookies())
//                                    export function createClient(): SupabaseClient
// admin.ts       (import 'server-only'; service role, bypasses RLS)
//                                    export function createAdminClient(): SupabaseClient
// middleware.ts                      export async function updateSession(request: NextRequest): Promise<NextResponse>
```

### 7.2 `lib/auth.ts` (server only)

```ts
export async function getSessionProfile(): Promise<{ user: User; profile: Profile } | null>;
// null if no session OR no profile row.

export async function requireRole(role: 'lister' | 'admin'): Promise<{ user: User; profile: Profile }>;
// Redirects (next/navigation redirect) to '/lister/login' or '/admin/login' when: no session,
// profile.role !== role, or !profile.is_active. Otherwise returns the session + profile.

export async function requireAdminApi(): Promise<
  | { ok: true; user: User; profile: Profile }
  | { ok: false; response: NextResponse }   // 401 or 403 JSON { error: string }
>;
```

### 7.3 `lib/constants.ts`

```ts
export const SITE_NAME = 'RM Japanese Auto Mart';
export const PAGE_SIZE = 24;
export const MAX_IMAGES = 12;
export const CURRENCY_COOKIE = 'rm_currency';
export const CAR_SELECT: string;                       // see 6.1
export const FALLBACK_RATES: Rates;                    // { EUR: 1, GBP: 0.86, PKR: 325 }
type Opt<T extends string = string> = { value: T; label: string };
export const CURRENCIES: { code: Currency; symbol: string; name: string }[];
//   PKR: 'Rs' / 'Pakistani Rupee',  GBP: '£' / 'British Pound',  EUR: '€' / 'Euro'
export const FUEL_TYPES: Opt<FuelType>[];
//   petrol 'Petrol', diesel 'Diesel', hybrid 'Hybrid', plug_in_hybrid 'Plug-in Hybrid', electric 'Electric'
export const TRANSMISSIONS: Opt<Transmission>[];      // automatic 'Automatic', manual 'Manual'
export const BODY_TYPES: Opt<BodyType>[];
//   sedan 'Sedan', hatchback 'Hatchback', suv 'SUV', crossover 'Crossover', coupe 'Coupe', wagon 'Wagon',
//   minivan 'Minivan', van 'Van', pickup 'Pickup', kei 'Kei car', convertible 'Convertible'
export const DRIVE_TYPES: Opt<DriveType>[];           // fwd 'FWD', rwd 'RWD', awd 'AWD', 4wd '4WD'
export const STEERING_OPTIONS: Opt<Steering>[];       // right 'Right-hand drive', left 'Left-hand drive'
export const COLORS: Opt[];
//   white, black, silver, grey, red, blue, green, brown, beige, gold, orange, yellow, other   (labels capitalised)
export const AUCTION_GRADES: string[];                // ['S','6','5','4.5','4','3.5','3','R','RA']   ('' = not graded)
export const DELIVER_TO_OPTIONS: Opt<DeliverTo>[];    // ireland 'Ireland', uk 'United Kingdom', pakistan 'Pakistan'
export const CAR_STATUSES: Opt<CarStatus>[];          // draft 'Draft', published 'Published', sold 'Sold'
export const SORT_OPTIONS: Opt[];
//   newest 'Newest first', price_asc 'Price: low to high', price_desc 'Price: high to low',
//   year_desc 'Year: newest', mileage_asc 'Mileage: lowest'
export const COMMON_FEATURES: string[];               // ~28 suggestions: 'Air conditioning','Climate control',
//   'Leather seats','Heated seats','Sunroof','Navigation','Reverse camera','360° camera','Cruise control',
//   'Adaptive cruise control','Lane assist','Keyless entry','Push start','LED headlights','Alloy wheels',
//   'Bluetooth','Apple CarPlay / Android Auto','Parking sensors','Power windows','Power tailgate',
//   'Sliding doors','Turbo','ABS','Airbags','Dash cam','ETC card','Tow bar','Rear spoiler'
export const MIN_YEAR = 1990;  export const maxYear = (): number;   // current year + 1
```

### 7.4 Pure helpers

```ts
// lib/utils.ts
export function cn(...inputs: ClassValue[]): string;            // clsx + tailwind-merge
export function slugify(input: string): string;                 // lowercase, a-z0-9 and '-', trimmed
export function generatePassword(length?: number): string;      // default 14, no ambiguous chars (0 O o 1 l I)

// lib/format.ts
export function buildCarTitle(year: number, make: string, model: string, version?: string): string; // '2018 Toyota Vitz RS'
export function formatKm(km: number | null): string;            // '110,000 km' or '–'
export function formatCc(cc: number | null): string;            // '1,000 cc' or '–'
export function timeAgo(iso: string): string;                   // 'Updated 3 minutes ago' style short: '3 minutes ago'
export function formatDate(iso: string): string;                // '12 Nov 2026'
export function optionLabel(options: { value: string; label: string }[], value: string | null): string;
export function coverImage(images: CarImage[]): CarImage | null;
export function sortedImages(images: CarImage[]): CarImage[];
export function whatsappLink(phone: string, text?: string): string;  // https://wa.me/<digits>?text=...
export function normalizePhone(input: string): string;          // strips spaces/dashes/brackets, keeps leading +

// lib/currency.ts  (pure, works on server and client)
export function convertFromEur(amountEur: number, currency: Currency, rates: Rates): number;
export function convertToEur(amount: number, currency: Currency, rates: Rates): number;
export function formatMoney(amount: number, currency: Currency, opts?: { style?: 'full' | 'short' }): string;
export function formatEur(amountEur: number): string;           // '€12,450'
export function convertAndFormat(amountEur: number, currency: Currency, rates: Rates,
                                 opts?: { style?: 'full' | 'short' }): string;
```

Money formatting rules (A implements, others only call):
- EUR `€12,450`, GBP `£10,830`: rounded to whole units, thousands separators.
- PKR `full`: `PKR 3,850,000` rounded to nearest 1,000. PKR `short` (used on cards, PakWheels style): under 100,000 -> `PKR 85,000`; 100,000 to 9,999,999 -> `PKR 38.5 lacs` (1 decimal, trailing zero trimmed); 10,000,000 and above -> `PKR 1.85 crore` (2 decimals, trimmed).

```ts
// lib/rates.ts  (server only)
export async function getRates(): Promise<{ rates: Rates; updatedAt: string; source: string }>;
//   Reads exchange_rates row 1. If older than 6 h, tries to refresh (see 9). Never throws: falls back to the
//   stored row, then to FALLBACK_RATES.
export async function refreshRates(): Promise<{ rates: Rates; updatedAt: string; source: string }>;
//   Forces a refresh from the API and upserts row 1 using the admin client. Throws on API failure.

// lib/site-content.ts  (server only)
export async function getSiteContent(): Promise<Record<string, string>>; // DB values merged over defaults; empty-string DB value stays empty
export function t(content: Record<string, string>, key: string): string; // content[key] ?? SITE_CONTENT_DEFAULTS[key] ?? ''
// lib/site-content-defaults.ts
export const SITE_CONTENT_DEFAULTS: Record<string, string>;              // exactly the table in section 16
```

### 7.5 Components written by A

**Providers (client)**

```ts
// components/providers/CurrencyProvider.tsx
export function CurrencyProvider(props: { initialCurrency: Currency | null; rates: Rates; children: ReactNode }): JSX.Element;
export function useCurrency(): {
  currency: Currency;                       // 'EUR' when none chosen yet
  hasChosen: boolean;                       // false until the buyer picks (drives the modal)
  setCurrency: (c: Currency) => void;       // writes cookie rm_currency (1 year, path=/, SameSite=Lax) + state
  rates: Rates;
  convert: (eur: number) => number;         // EUR -> selected currency
  toEur: (amount: number) => number;        // selected currency -> EUR
  format: (eur: number, opts?: { style?: 'full' | 'short' }) => string; // EUR amount shown in selected currency
};
// components/providers/ThemeProvider.tsx   export function ThemeProvider({children}) // next-themes, attribute="class", defaultTheme="light", enableSystem={false}
```
The root layout reads cookie `rm_currency` on the server and passes `initialCurrency`; therefore the first paint already has the right currency (no flicker).

**Layout**

```ts
// Logo.tsx           Logo(props: { size?: 'sm'|'md'|'lg'; showName?: boolean; name?: string; href?: string | null; className?: string })
//                    Draws /logo.png inside a black rounded tile (the logo has a black background) + the name text.
// ThemeToggle.tsx    ThemeToggle(props: { className?: string })
// CurrencySwitcher   CurrencySwitcher(props: { className?: string })
// CurrencyModal      CurrencyModal()   // shown only in the (public) layout when !hasChosen; cannot be dismissed without choosing
// PortalShell.tsx    (client) PortalShell(props: {
//                      title: 'Seller Portal' | 'Admin Panel';
//                      nav: { href: string; label: string; icon: PortalIcon; badge?: number }[];
//                      user: { name: string; email: string };
//                      signOutRedirect: string;        // '/lister/login' or '/admin/login'
//                      children: ReactNode })
//                    type PortalIcon = 'dashboard'|'cars'|'add'|'users'|'shield'|'requests'|'content'|'catalog'|'rates'|'profile';
//                    Sidebar on desktop, slide-in drawer on mobile, ThemeToggle, "View website" link to '/', user menu with sign out.
```

**Auth**

```ts
// LoginForm.tsx  LoginForm(props: { role: 'lister' | 'admin'; redirectTo: string })
//   email + password, show/hide password, loading state. Uses supabase.auth.signInWithPassword, then reads the
//   profile; if role mismatch or !is_active -> signs out and shows "This account cannot sign in here."
//   Wrong credentials -> "Incorrect email or password." On success: router.replace(searchParams.next ?? redirectTo) + router.refresh().
// SignOutButton.tsx  SignOutButton(props: { redirectTo: string; className?: string; children?: ReactNode })
```

**UI primitives (`components/ui/*`, one file each, named exports)**

| File | Export and key props |
|---|---|
| `Button.tsx` | `Button({variant?: 'primary'\|'secondary'\|'outline'\|'ghost'\|'danger', size?: 'sm'\|'md'\|'lg', loading?: boolean, ...button props})`, `buttonVariants({variant,size,className}): string` (to style `<Link>`) |
| `Input.tsx` | `Input` (forwardRef, input props, `invalid?: boolean`) |
| `Textarea.tsx` | `Textarea` (forwardRef, `invalid?`) |
| `Select.tsx` | `Select` (forwardRef, native `<select>` styled, `invalid?`, children = options) |
| `Field.tsx` | `Field({label: string; htmlFor?: string; error?: string; hint?: string; required?: boolean; children})` |
| `Checkbox.tsx` | `Checkbox({checked, onChange(checked: boolean), label?: ReactNode, id?, disabled?})` |
| `Switch.tsx` | `Switch({checked, onChange(checked: boolean), label?: string, disabled?})` |
| `Badge.tsx` | `Badge({variant?: 'default'\|'success'\|'warning'\|'danger'\|'info'\|'muted', children})` |
| `Card.tsx` | `Card({className?, children})`, `CardHeader`, `CardTitle`, `CardContent` |
| `Modal.tsx` | `Modal({open, onClose, title?: string, description?: string, size?: 'sm'\|'md'\|'lg'\|'xl', footer?: ReactNode, dismissible?: boolean (default true), children})`. Focus trap, ESC, scroll lock |
| `ConfirmDialog.tsx` | `ConfirmDialog({open, title, description?, confirmLabel?, danger?: boolean, loading?: boolean, onConfirm(), onCancel()})` |
| `Spinner.tsx` | `Spinner({className?})` |
| `Skeleton.tsx` | `Skeleton({className?})` |
| `EmptyState.tsx` | `EmptyState({icon?: ReactNode, title: string, description?: string, action?: ReactNode})` |
| `Toast.tsx` | `ToastProvider({children})` (in root layout), `useToast(): { toast(t: { title: string; description?: string; variant?: 'success'\|'error'\|'info' }): void }` |
| `Table.tsx` | `Table`, `THead`, `TBody`, `Tr`, `Th`, `Td` (Table wraps in an `overflow-x-auto` container) |
| `Pagination.tsx` | `Pagination({page: number; pageCount: number; buildHref: (page: number) => string})` (server-friendly links) |
| `PageHeader.tsx` | `PageHeader({title: string; description?: string; actions?: ReactNode})` |
| `StatCard.tsx` | `StatCard({label: string; value: string \| number; hint?: string; icon?: ReactNode})` |

---

## 8. Constants for the public URL query (listing filters), owned by A

`/cars?...` (all optional, shareable links). **Prices in the URL are always EUR**, so a link behaves the same in every currency:

`q` keyword, `make` (make slug), `model` (model slug), `min_eur`, `max_eur`, `year_min`, `year_max`, `km_max`, `cc_min`, `cc_max`, `fuel`, `transmission`, `body`, `color`, `drive`, `steering`, `grade`, `deliver_to` (ireland|uk|pakistan), `include_sold` (`1`), `sort` (SORT_OPTIONS value, default `newest`), `view` (`grid`|`list`, default `grid`), `page` (1-based).

The filter UI shows the price inputs in the buyer's selected currency and converts with `toEur` (round min down, max up) when building the URL.

---

## 9. Currency and exchange-rate rules

1. DB stores EUR only (`cars.price_eur`). Lister/admin screens always show and edit prices in **EUR** (`formatEur`), with an optional live "≈ £ / ≈ PKR" preview using `useCurrency().rates`.
2. Public screens show prices in the buyer's chosen currency via `useCurrency().format(...)`, with a small "listed price €X" line on the car detail page.
3. Rates source (free, no key): `GET https://open.er-api.com/v6/latest/EUR`, JSON `{ result: 'success', rates: { GBP, PKR, ... } }`. Use a 5 s timeout, validate that GBP and PKR are finite numbers > 0 and within sane bounds (GBP 0.3 to 2, PKR 100 to 1000), then upsert row id=1 `{ gbp, pkr, source: 'open.er-api.com', updated_at: now }` via the admin client.
4. `getRates()` refreshes at most once per 6 hours (check `updated_at`); on any failure it silently serves the stored row. The footer shows a small credit "Exchange rates by ExchangeRate-API" linking to https://www.exchangerate-api.com (required by the free API terms).
5. Currency is stored in cookie `rm_currency` (`PKR|GBP|EUR`). No cookie = show the **Select your currency** modal (3 big option cards: symbol, code, name). Choosing closes it. The header `CurrencySwitcher` lets the buyer change later.

---

## 10. Design system

- Brand feel: premium, clean, modern; inspired by PakWheels' structure (sidebar filters, list/grid cards, trust badges) but more refined. Accent colour **Japan red**. The logo is black and white, so the UI is neutral with one red accent.
- Font: **Inter** via `next/font/google`, variable `--font-sans`.
- Radius: cards `rounded-2xl`, buttons/inputs `rounded-xl`, chips `rounded-full`. Soft shadows. Subtle transitions (150 to 200 ms); respect `prefers-reduced-motion`.
- Tokens are CSS variables holding **space-separated RGB triplets** and mapped in `tailwind.config.ts` as `rgb(var(--x) / <alpha-value>)`. Dark mode = `class` strategy (`.dark` on `<html>`).

| Token (Tailwind name) | Light | Dark |
|---|---|---|
| `background` | 255 255 255 | 11 13 18 |
| `card` | 255 255 255 | 18 21 28 |
| `muted` (subtle surface) | 245 246 248 | 26 30 39 |
| `border` | 229 231 235 | 38 43 54 |
| `foreground` | 11 13 18 | 243 244 246 |
| `muted-foreground` | 91 100 114 | 154 163 178 |
| `primary` | 200 16 46 | 225 29 63 |
| `primary-hover` | 165 13 38 | 244 63 94 |
| `primary-foreground` | 255 255 255 | 255 255 255 |
| `success` | 22 163 74 | 34 197 94 |
| `warning` | 217 119 6 | 245 158 11 |
| `danger` | 220 38 38 | 239 68 68 |
| `info` | 37 99 235 | 96 165 250 |
| `ring` | = primary | = primary |

Usage examples: `bg-background text-foreground`, `bg-card border border-border`, `text-muted-foreground`, `bg-primary text-primary-foreground hover:bg-primary-hover`, `focus-visible:ring-2 ring-ring`.

Layout widths: public pages `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`; portals use `PortalShell` (content `max-w-6xl`).

---

## 11. Auth and middleware

- `middleware.ts` (A): calls `updateSession` (refreshes the Supabase cookie). If the path starts with `/lister` (except exactly `/lister` and `/lister/login`) or `/admin` (except exactly `/admin` and `/admin/login`) and there is no user, redirect to the matching login page with `?next=<original path>`. Matcher excludes `_next/static`, `_next/image`, images and `favicon`. Role/active checks are done in the portal layouts through `requireRole`.
- `/api/admin/*` is protected by `requireAdminApi()` inside each handler (middleware does not cover API role checks).
- Pages that mutate data use the **browser** Supabase client from client components, then `router.refresh()`. Anything needing the service role goes through `/api/admin/*`.

---

## 12. Admin API (written by C; B does not call it; A does not call it except `refreshRates`)

All handlers: `export const runtime = 'nodejs'`, call `requireAdminApi()` first, validate the body with zod, return JSON. Errors: `{ "error": "Readable message" }` with a proper status (400 validation, 401/403 auth, 404, 409 conflict, 500).

| Method + path | Body | Success response |
|---|---|---|
| `POST /api/admin/users` | `{ role: 'lister'\|'admin', email, full_name, phone, city?, password?, request_id? }` | `{ user: Profile, password: string }` (`password` = the one used, generated by `generatePassword()` when omitted; shown once in UI). Creates the auth user with `email_confirm: true`, `user_metadata: { full_name, phone }`, `app_metadata: { role }`, then updates `profiles.city`. If `request_id` is given: mark that request `approved`, set `lister_id`, `reviewed_at`. Duplicate email -> 409 |
| `PATCH /api/admin/users/[id]` | `{ full_name?, phone?, city?, is_active? }` | `{ user: Profile }`. Changing `is_active` also bans/unbans in Auth (`ban_duration: '876000h'` / `'none'`). Admin cannot deactivate themselves; cannot deactivate the last active admin |
| `POST /api/admin/users/[id]/password` | `{ password?: string }` (min 8) | `{ password: string }` (generated if omitted) |
| `DELETE /api/admin/users/[id]` | none | `{ ok: true }`. First deletes all storage files under `car-images/{id}/` (list folders two levels deep, then `remove`), then deletes the auth user (cars cascade). Cannot delete self or the last admin |
| `POST /api/admin/rates/refresh` | none | `{ rates: Rates, updatedAt: string, source: string }` via `refreshRates()` |

Phone numbers are stored normalised: `+` followed by 7 to 15 digits (validate with `^\+[1-9]\d{6,14}$` after `normalizePhone`).

---

## 13. `CarForm` and car actions (written by B; C imports them)

```ts
// components/car-form/CarForm.tsx   (client)
export function CarForm(props: {
  mode: 'create' | 'edit';
  actor: 'lister' | 'admin';
  car?: CarWithRelations;                      // required when mode === 'edit'
  listerId?: string;                           // required when actor === 'lister' (= own id)
  listers?: { id: string; full_name: string; email: string }[]; // required when actor === 'admin' && mode === 'create' (renders an "Owner" select)
  afterSaveHref: string;                       // router.push target after a successful save
  cancelHref: string;
}): JSX.Element;

// lib/car-actions.ts  (browser Supabase client passed in)
export async function deleteCar(supabase: SupabaseClient, carId: string): Promise<void>;
//   loads the car_images rows, removes storage objects (storage_path + thumb_path), then deletes the car row. Throws Error with readable message.
export async function setCarStatus(supabase: SupabaseClient, carId: string, status: CarStatus): Promise<void>;
export async function setCarFeatured(supabase: SupabaseClient, carId: string, featured: boolean): Promise<void>; // admin only (DB ignores it for listers)
```

CarForm behaviour (B implements): multi-step wizard (Basics, Specs, Photos, Details and delivery, Review), per-step validation, "Save as draft" and "Publish" (and "Mark as sold" in edit), live price preview in GBP and PKR, make then model cascading selects with inline **"Can't find it? Add new make / model"** (inserts into `makes` / `models` with `slugify`; on unique conflict it selects the existing one), auto-generated editable title (`buildCarTitle`), drag-and-drop image upload with client compression (section 14), reorder, cover selection, delete, unsaved-changes warning. Required for publishing: make, model, year, price, mileage, fuel, transmission, body type, at least 1 image, at least 1 delivery country. Drafts can be saved with only make, model, year, price and title.

---

## 14. Images (storage budget rules, mandatory)

- Compress **in the browser** before upload (canvas, no library) in `lib/image-compress.ts` (B): full image max 1400 px on the long side, WebP, quality 0.78 (target under 250 KB); thumbnail max 480 px, WebP, quality 0.72 (target under 40 KB). If WebP encoding is unsupported, fall back to JPEG with the same sizes.
- Reject files that are not images, or larger than 15 MB before compression.
- **Max 12 images per car** (`MAX_IMAGES`).
- Upload to bucket `car-images` at `{listerId}/{carId}/{uuid}.webp` and `{listerId}/{carId}/{uuid}_thumb.webp` (`listerId` = the car's owner, also when an admin uploads). Get URLs with `getPublicUrl` (no transform options). `carId` for a new car is generated in the browser with `crypto.randomUUID()` and used as the new row's `id`.
- Cards and lists use `thumb_url`; the detail gallery uses `url`.
- Plain `<img>` with `loading="lazy"`, explicit `width/height` or `aspect-ratio` to prevent layout shift, and a neutral placeholder when there is no image.

---

## 15. Navigation definitions

**Lister portal nav (B passes to `PortalShell`, title `Seller Portal`)**
`Dashboard /lister/dashboard (dashboard)`, `My Cars /lister/cars (cars)`, `Add Car /lister/cars/new (add)`, `Profile /lister/profile (profile)`. `signOutRedirect = '/lister/login'`.

**Admin panel nav (C passes to `PortalShell`, title `Admin Panel`)**
`Dashboard /admin/dashboard (dashboard)`, `Cars /admin/cars (cars)`, `Add Car /admin/cars/new (add)`, `Listers /admin/listers (users)`, `Admins /admin/admins (shield)`, `Requests /admin/requests (requests, badge = pending count)`, `Website Text /admin/content (content)`, `Makes & Models /admin/catalog (catalog)`, `Exchange Rates /admin/rates (rates)`. `signOutRedirect = '/admin/login'`.

**Public header nav (A):** Home `/`, Cars `/cars`, About `/about`, Contact `/contact`; right side: `CurrencySwitcher`, `ThemeToggle`, primary button **"List Your Car"** (text from `nav_list_button`) which opens a modal with the request form (and the page `/list-your-car` shows the same form). Footer has a small "Seller login" link to `/lister`. There is NO public link to `/admin`.

---

## 16. Editable website text (table `site_content`)

Every user-visible marketing string on public pages comes from `getSiteContent()` using these keys. The table below is exactly what `schema.sql` seeds and what `lib/site-content-defaults.ts` (A) must contain, key for key, text for text (⏎ = line break). Empty contact values mean "hide that item". Use `{year}` replacement in `footer_copyright`.

| # | Group | Key | Type | Default value |
|---|---|---|---|---|
| 1 | Brand | `site_name` | text | RM Japanese Auto Mart |
| 2 | Brand | `site_tagline` | text | Japanese cars, delivered to Ireland, the UK and Pakistan |
| 3 | SEO | `seo_title` | text | RM Japanese Auto Mart – Japanese Cars Delivered to Ireland, UK and Pakistan |
| 4 | SEO | `seo_description` | textarea | Browse quality used Japanese cars with real photos and details. We ship from Japan to Ireland, the United Kingdom and Pakistan. |
| 5 | Contact | `contact_email` | text | *(empty)* |
| 6 | Contact | `contact_phone` | text | *(empty)* |
| 7 | Contact | `contact_whatsapp` | text | *(empty)* |
| 8 | Contact | `contact_address` | textarea | *(empty)* |
| 9 | Contact | `contact_hours` | text | *(empty)* |
| 10 | Navigation | `nav_list_button` | text | List Your Car |
| 11 | Home – Hero | `home_hero_title` | text | Find your next Japanese car |
| 12 | Home – Hero | `home_hero_subtitle` | text | Hand-picked cars from Japan, shipped to Ireland, the UK and Pakistan. |
| 13 | Home – Hero | `home_search_button` | text | Search cars |
| 14 | Home – Hero | `home_delivery_title` | text | We deliver to |
| 15 | Home – Featured | `home_featured_title` | text | Featured cars |
| 16 | Home – Featured | `home_featured_subtitle` | text | Fresh arrivals from our Japan team |
| 17 | Home – Featured | `home_makes_title` | text | Browse by make |
| 18 | Home – How it works | `home_how_title` | text | How it works |
| 19 | Home – How it works | `home_how_subtitle` | text | From Japan to your door in four simple steps |
| 20 | Home – How it works | `home_step1_title` | text | Choose your car |
| 21 | Home – How it works | `home_step1_text` | textarea | Browse our stock and filter by make, model, price, year and more. |
| 22 | Home – How it works | `home_step2_title` | text | Contact our team |
| 23 | Home – How it works | `home_step2_text` | textarea | Call, WhatsApp or email the RM representative listed on the car. |
| 24 | Home – How it works | `home_step3_title` | text | We ship it |
| 25 | Home – How it works | `home_step3_text` | textarea | We handle the purchase, export paperwork and shipping from Japan. |
| 26 | Home – How it works | `home_step4_title` | text | Delivered to you |
| 27 | Home – How it works | `home_step4_text` | textarea | Receive your car in Ireland, the UK or Pakistan. |
| 28 | Home – Why us | `home_why_title` | text | Why RM Japanese Auto Mart |
| 29 | Home – Why us | `home_why1_title` | text | Direct from Japan |
| 30 | Home – Why us | `home_why1_text` | textarea | Cars sourced straight from Japanese auctions and dealers. |
| 31 | Home – Why us | `home_why2_title` | text | Our own team |
| 32 | Home – Why us | `home_why2_text` | textarea | Every listing is posted by our own staff, never by anonymous sellers. |
| 33 | Home – Why us | `home_why3_title` | text | Three destinations |
| 34 | Home – Why us | `home_why3_text` | textarea | Shipping to Ireland, the United Kingdom and Pakistan. |
| 35 | Home – Call to action | `home_cta_title` | text | Have a car to list? |
| 36 | Home – Call to action | `home_cta_text` | textarea | Send us your details and our team will set you up with a seller account. |
| 37 | Cars page | `cars_title` | text | Japanese cars for sale |
| 38 | Cars page | `cars_subtitle` | text | Search our current stock |
| 39 | Cars page | `cars_empty_title` | text | No cars match your search |
| 40 | Cars page | `cars_empty_text` | textarea | Try removing a few filters or searching for a different make. |
| 41 | Car detail page | `detail_contact_title` | text | Contact the seller |
| 42 | Car detail page | `detail_disclaimer` | textarea | Prices are shown in your selected currency using live exchange rates. The final price is confirmed by our team. |
| 43 | List your car form | `list_form_title` | text | List your car with us |
| 44 | List your car form | `list_form_text` | textarea | Fill in your details. Our admin team will review your request and send you seller login details. |
| 45 | List your car form | `list_success_title` | text | Request received |
| 46 | List your car form | `list_success_text` | textarea | Thank you! Our team will contact you soon. |
| 47 | Seller portal | `lister_landing_title` | text | Seller portal |
| 48 | Seller portal | `lister_landing_text` | textarea | RM team members: sign in to add and manage your car listings. |
| 49 | Seller portal | `lister_landing_button` | text | I'm a Seller |
| 50 | About page | `about_title` | text | About us |
| 51 | About page | `about_body` | textarea | RM Japanese Auto Mart connects buyers in Ireland, the United Kingdom and Pakistan with quality used cars from Japan. ⏎⏎ Every car on this website is listed by our own team, so you always deal directly with a real RM representative. ⏎⏎ Browse the stock, pick a car and contact the representative shown on the listing. We take care of the rest. |
| 52 | Contact page | `contact_title` | text | Contact us |
| 53 | Contact page | `contact_text` | textarea | Questions about a car or shipping? Get in touch with our team. |
| 54 | Footer | `footer_about` | textarea | Quality Japanese cars, delivered to Ireland, the UK and Pakistan. |
| 55 | Footer | `footer_copyright` | text | © {year} RM Japanese Auto Mart. All rights reserved. |

Rules: A reads keys with `t(content, 'key')`; never hard-code these strings in JSX. The admin editor (B, `/admin/content`) is generic: it lists rows grouped by `group_name`, ordered by `sort_order`, edits `value`, and offers "Reset to default" using `SITE_CONTENT_DEFAULTS`.

---

## 17. Quality bar ("top notch")

- Visual polish: consistent spacing scale, clear hierarchy, hover/focus/active states, smooth but quick transitions, no layout jumps, skeletons while loading.
- Public car card (A): cover thumbnail, image count chip, FEATURED / SOLD ribbons, title, price in selected currency, a row of year / mileage / fuel / transmission / engine cc, "Deliver to" country chips, relative time. Grid and list variants.
- Everything works one-handed on a 360 px wide phone.
- Forms: inline errors, disabled submit while loading, success toasts, no lost input on error.
- No dead buttons or links. Every link in this contract resolves to a real page.

---

## 18. Output format and delivery (for A, B, C)

1. Build in small batches (about 8 to 12 files per message). When the reply limit is reached, stop and wait; the owner will say "continue". Do not skip or summarise files; every file must be complete.
2. If you can create files and a zip, produce `A-foundation-public.zip`, `B-lister-portal.zip` or `C-admin-panel.zip` containing ONLY the files you own, with paths relative to the repo root (e.g. `app/lister/login/page.tsx`).
3. If you cannot create files, print each file as a heading `### FILE: path/to/file.tsx` followed by one code block. The owner will paste them to the integrator.
4. At the very end, print `MANIFEST` : the list of every file you created, plus (a) every export you import from other accounts, (b) anything you could not do, (c) the contents of `NEEDS.md` if any.
5. Do your own final review: imports resolve against section 7, all token classes exist, no forbidden dependency, no `any`, no secrets in client code, every route in your section 5 rows exists.
