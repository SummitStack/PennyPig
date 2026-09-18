# Deploy PennyPig to Vercel

## 1. Create Vercel Account
- Go to **vercel.com**
- Sign up with GitHub (ridings82@gmail.com)
- Authorize Vercel to access SummitStack org

## 2. Import Repository
- Click **"Add New..."** → **"Project"**
- Search for **PennyPig** repo
- Click **Import**

## 3. Configure Build
- Framework: Next.js (auto-detected)
- Root Directory: `./apps/web` (if prompted)
- Click **Continue**

## 4. Environment Variables
Add these before deploying:
- **PLAID_CLIENT_ID**: `6aad3230800fce000da2fca0`
- **PLAID_SECRET**: `8d86c4c32e1124c5dfa0d4b5d11cb3`
- **PLAID_ENV**: `sandbox`

(You'll replace these with real credentials when ready for production)

## 5. Deploy
- Click **"Deploy"**
- Wait ~3-5 min for build
- You'll get a URL like `pennypig-xyz.vercel.app`

## 6. Connect Custom Domain (pennypig.io)
- In Vercel dashboard, go to **Settings** → **Domains**
- Add `pennypig.io`
- Follow Vercel's DNS instructions (update in Cloudflare)

## 7. Test
- Visit deployed URL
- Try signup/login
- Test Plaid connection (sandbox mode)

Done. Vercel auto-deploys on every GitHub push.
