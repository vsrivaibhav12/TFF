# Moving the database and the app to Mumbai

Users are in Coimbatore. The database is in Seoul (`ap-northeast-2`) and the app runs in Seoul (`icn1`)
so the two are next to each other. A Mumbai database (`ap-south-1`) with the app in Mumbai (`bom1`)
would cut roughly 100 ms off every database call. This cannot be done in place:
Supabase does not move a project between regions, so it means a new project and a short outage.

This needs a person with access to the Supabase billing account and to Vercel. Nothing here has been run.

## Before you start
- Pick a quiet window (evening or weekend). Plan for about one hour of read-only use.
- Create a new Supabase project in **South Asia (Mumbai)**. It gets a new project ref, URL and keys.
- Install the Supabase CLI and have the old project's database password ready.

## Steps
1. **Freeze writes.** Tell staff to stop entering data. Optionally set the app to maintenance mode.
2. **Build the schema on the new project.**
   `npm run db:apply-baseline` (point `.env.local` at the NEW project ref and access token first),
   then `npm run db:seed-compliance-rules`.
3. **Copy the data** from old to new (data only, public schema plus auth users):
   ```
   supabase db dump --db-url "<OLD connection string>" --data-only --schema public -f public-data.sql
   supabase db dump --db-url "<OLD connection string>" --data-only --schema auth -f auth-data.sql
   psql "<NEW connection string>" -f auth-data.sql
   psql "<NEW connection string>" -f public-data.sql
   ```
   Copying `auth` keeps every staff password and login. Check row counts match
   (clients 1,188, tasks 1,087, task_steps 9,416, task_workdone 4,422, global_audit_log 5,471, users_profile 9).
4. **Copy storage files** (buckets `documents`, `engagement-letters`, `dsc-files`) with the Supabase dashboard
   or `supabase storage cp -r`. Then `npm run db:create-buckets` on the new project if buckets are missing.
5. **Re-apply Auth settings** on the new project (Authentication): sign-ups off, Site URL
   `https://portal.fiscalfulcrum.in`, redirect URL `https://portal.fiscalfulcrum.in/**`, minimum password 10,
   and Settings -> API -> Max rows 5000.
6. **Switch the app.** In Vercel set the new `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`. Keep `CREDENTIALS_KEY`
   and `CRON_SECRET` unchanged. Change `vercel.json` `"regions"` to `["bom1"]` and redeploy.
7. **Check.** Sign in as an admin and as a team member, open a client, a task, tick a checklist step,
   run `npm run db:rls-test`, and send a password reset email.
8. **Keep the old project for a week** (read-only) as a fallback, then delete it.

## Roll back
Point the Vercel variables and `vercel.json` region back to the old project and redeploy. The old
project is untouched until you delete it.
