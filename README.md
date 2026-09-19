# PennyPig

Personal budgeting app (YNAB-inspired). Monorepo with Next.js frontend at `apps/web`.

## Stack
- React 18 + Next.js 14 (App Router host + React Router screens)
- Zustand, TailwindCSS
- Supabase Auth + Postgres schema (`supabase-schema.sql`)
- Plaid (sandbox) via Next.js API routes

## Local setup
```bash
cp .env.example apps/web/.env.local
# fill NEXT_PUBLIC_SUPABASE_* and PLAID_*
npm install
npm run dev
```

Open http://localhost:3000

## Current status
Deployed UI prototype with Auth + Plaid scaffolding. Domain data is still mostly mock/Zustand until stores are wired to Supabase.
