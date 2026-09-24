# Finance Tracker

Personal income/expense tracker, installable as a PWA on iPhone. React + TypeScript + Vite + Supabase, hosted on Vercel — $0 at this scale.

## What's already done

- Full app scaffolded: auth (login/signup), transaction CRUD, category management, dashboard summary + charts, monthly trend & category-breakdown reports, mobile-first UI, PWA manifest + service worker (network-first for Supabase calls, precached app shell).
- `npm run build` and `npx tsc -b` both pass clean.

## What you still need to do (requires your own accounts — I can't create these for you)

### Applying later database changes

For an already-running project, execute every new file in `supabase/` whose
number is higher than the last migration you applied, in order, using the
Supabase SQL editor. To add the Cash account, run
[`supabase/migration_005_cash_account.sql`](supabase/migration_005_cash_account.sql).
It safely creates a zero-balance Cash account once per user. Record every ATM
withdrawal as **BCA → Cash**; then select **Cash** when recording a cash
expense.

### 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql) (same SQL as the brief, section 3).
3. Under **Authentication → Providers**, make sure Email is enabled. For a single-user app you can turn off "Confirm email" under Authentication → Settings if you don't want the confirmation-email step.
4. Under **Project Settings → API**, copy the **Project URL** and **anon public key**.

### 2. Set local environment variables
Replace the placeholder values in `.env.local` (already gitignored) with your real project's:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```
Then run:
```bash
npm run dev
```
Sign up with your email — the app seeds the default categories (Gaji, Makanan & Minuman, etc.) automatically on first login.

### 3. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create finance-tracker --private --source=. --push
```
(or create the repo on GitHub and add it as a remote yourself).

### 4. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com), import the GitHub repo (Hobby plan — personal use only).
2. In the project's **Environment Variables** settings, add the same two `VITE_SUPABASE_*` values from `.env.local`.
3. Deploy.

### 5. Install on iPhone
1. Open the deployed Vercel URL in **Safari** on your iPhone (must be Safari, not Chrome).
2. Tap the Share button → **Add to Home Screen**.
3. Launch from the home screen icon and confirm it opens standalone (no address bar) and loads instantly on repeat opens.

## Local development

```bash
npm install
npm run dev      # dev server
npm run build    # typecheck + production build
npm run lint     # oxlint
npm run preview  # serve the production build locally
```

## Notes

- The app icons in `public/icons/` are simple placeholders generated for this scaffold — swap them for your own branding whenever you like.
- `supabase/schema.sql` is the same schema from the project brief, kept here so it's easy to re-run or diff against.
- Free-tier Supabase projects pause after 7 days with no API activity — daily use avoids this.
