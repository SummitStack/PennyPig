# Deploy PennyPig to Vercel

## 1. Create Vercel Account
- Go to **vercel.com**
- Sign up with GitHub
- Authorize Vercel to access the SummitStack org

## 2. Import Repository
- Click **"Add New..."** → **"Project"**
- Search for **PennyPig** repo
- Click **Import**

## 3. Configure Build
- Framework: Next.js (auto-detected)
- Root Directory: `./apps/web` (if prompted)
- Click **Continue**

## 4. Environment Variables
Add these before deploying (values from your Supabase + Plaid dashboards):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV` (`sandbox` for development)

Do **not** commit real secrets to the repo. Keep them in Vercel project settings only.

## 5. Deploy
- Click **"Deploy"**
- Wait for the build to finish
- You'll get a URL like `penny-pig-web.vercel.app`

## 6. Connect Custom Domain (pennypig.io)
- In Vercel dashboard, go to **Settings** → **Domains**
- Add `pennypig.io`
- Follow Vercel's DNS instructions (update in Cloudflare)

## 7. Test
- Visit deployed URL
- Try signup/login (requires Supabase env)
- Test Plaid connection in sandbox (requires Plaid env + signed-in user)

Done. Vercel auto-deploys on every GitHub push to the connected branch.
