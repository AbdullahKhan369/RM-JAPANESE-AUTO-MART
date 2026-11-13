# Supabase setup (free plan), do this once

1. **Create project** at supabase.com (free plan). Pick the region closest to your buyers (e.g. London / Frankfurt). Save the database password.
2. **Run the schema**: Dashboard > SQL Editor > New query > paste the whole `schema.sql` > Run. It creates tables, security rules, the `car-images` storage bucket, makes/models and the editable website text. Run it only once.
3. **Disable public sign-ups**: Authentication > Sign In / Providers (or Settings) > turn OFF "Allow new users to sign up". Accounts are created only by the admin from the admin panel.
4. **Email confirmations**: not needed (the admin creates confirmed users). Do not enable custom SMTP or email templates. The site never sends emails.
5. **Copy the keys**: Project Settings > API: copy `Project URL`, `anon public` key and `service_role` key into `.env.local` (and later into your hosting provider's environment variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...        # secret, never share, never commit
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   ```
6. **Create the first admin**: Authentication > Users > Add user > Create new user (email + password, tick "Auto Confirm User"). Then SQL Editor:
   ```sql
   update public.profiles
   set role = 'admin', full_name = 'Your Name'
   where email = 'your-admin-email@example.com';
   ```
   You can now log in at `/admin/login` and create every other admin or lister from the panel.
7. **Quick checks** (SQL Editor):
   ```sql
   select role, email, is_active from public.profiles;   -- your admin shows role = admin
   select count(*) from public.makes;                    -- 10
   select count(*) from public.models;                   -- 127
   select count(*) from public.site_content;             -- 55
   select * from storage.buckets where id = 'car-images';
   ```

## Free plan things to remember
- A free project is **paused after about 1 week without activity**. Visit the site or the dashboard regularly (or restore it from the dashboard if it pauses).
- Approximate free limits: 500 MB database, 1 GB file storage, 5 GB bandwidth per month, 50,000 monthly active users. Check the current numbers on the Supabase pricing page. Images are compressed in the browser (about 250 KB each, max 12 per car) to stay inside 1 GB.
- No automatic email: password resets are done by an admin in the panel.
