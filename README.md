# RM Japanese Auto Mart: Foundation + Public website (Account A)

Next.js 14 (App Router), TypeScript, Tailwind 3.4, Supabase (free plan).
This package contains the foundation (config, shared libs, UI kit, layout) and every public page.

## 1. Local setup

```bash
npm install
cp .env.example .env.local      # then fill in the 4 values (see section 2)
npm run dev                     # http://localhost:3000
```

Put the owner's logo at `public/logo.png`.

### App icon (one manual step)
Binary files cannot be generated here. Copy a **square crop of the logo** to `app/icon.png`
(for example 512 x 512). Next.js picks it up automatically as the favicon. No code references it.

## 2. Environment variables

| Name | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Secret. Never commit, never prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | browser + server | Public URL, used for sitemap, share links, Open Graph |

## 3. Supabase setup (summary, full steps in SUPABASE_SETUP.md)
1. Create a free project. 2. Run `schema.sql` once in the SQL Editor.
3. Turn OFF "Allow new users to sign up". 4. Copy the keys into the env vars above.
5. Create the first admin in Authentication > Users, then set `role = 'admin'` in `public.profiles`.

## 4. Deploy
- Build command: `npm run build`   Start command: `npm run start`   Node 18.18+ (20 recommended).
- Add the 4 environment variables in the host's dashboard.
- **Hosting terms:** Vercel's free *Hobby* plan is for non-commercial use only. This is a business website,
  so check your host's terms before launching. Netlify and Cloudflare Pages are alternatives.
- The code has no host-specific parts. All public pages are rendered on demand (`force-dynamic`).

## 5. How things work
- **Currency:** prices are stored in EUR. The buyer picks PKR / GBP / EUR on the first visit (cookie `rm_currency`).
  Rates come from open.er-api.com, refreshed at most every 6 hours by `getRates()` in the root layout.
- **Site text:** every marketing string comes from `site_content` (editable in the admin panel) with defaults in
  `lib/site-content-defaults.ts` (55 keys).
- **Listing filters:** all filters live in the URL (`/cars?make=toyota&min_eur=5000...`). Prices in the URL are EUR.
- **List Your Car:** inserts into `lister_requests` with the anon key (no `.select()`), honeypot + minimum fill time + 60 s cooldown.
- **Free plan:** a free Supabase project pauses after about a week without activity. Visit the site regularly.

## 6. Post-deploy checklist
1. Set `NEXT_PUBLIC_SITE_URL` to your real domain (then redeploy).
2. Create the first admin with the SQL in `SUPABASE_SETUP.md` (step 6), then log in at `/admin/login`.
3. Fill in contact details in **Admin > Website Text** (empty values are hidden on the site).
4. Add a favicon file at `app/icon.png` (for example a square crop of the logo).
5. Note: Vercel Hobby is for non-commercial use only. Use a paid plan or another Node host for a business site.
