# PennyPig

Personal budgeting app (YNAB-inspired). Monorepo with Next.js at `apps/web`.

## Stack
- React 18 + Next.js 14 (App Router catch-all + React Router screens)
- Zustand + TailwindCSS
- Supabase Auth + Postgres (RLS)
- Plaid Link via Next.js API routes (`link_token` flow)

## Local setup
```bash
cp .env.example apps/web/.env.local
# fill NEXT_PUBLIC_SUPABASE_* and PLAID_*
npm install
npm run dev
```

## Environment
| Var | Where |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server |
| `PLAID_CLIENT_ID` | Server only |
| `PLAID_SECRET` | Server only |
| `PLAID_ENV` | `sandbox` / `development` / `production` |

## Data model
`users`, `plaid_items`, `accounts`, `categories`, `transactions`, `budgets`.

Plaid `access_token` values are stored in `plaid_items` but are **not** selectable by the anon/authenticated roles. The Next.js API reads them via the `get_plaid_access_token` RPC (security definer, scoped to `auth.uid()`).

On signup/login, `ensure_user_defaults` (and the auth trigger) create the profile row and default categories. Budget activity is computed from transactions.
