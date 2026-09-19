-- PennyPig schema mirror (live project: fnlejvzgcrnwcsxelnqz)
-- Applied via Supabase migrations; keep in sync when changing DDL.

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  preferences jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.plaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  institution_id text,
  institution_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_type text NOT NULL CHECK (
    account_type = ANY (ARRAY['credit','debit','checking','savings','other'])
  ),
  name text NOT NULL,
  plaid_account_id text UNIQUE,
  plaid_item_id uuid REFERENCES public.plaid_items(id) ON DELETE SET NULL,
  balance numeric(15,2) DEFAULT 0,
  mask text,
  institution_name text,
  last_synced timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['expense','income','transfer'])),
  color text DEFAULT '#10b981',
  icon text,
  custom boolean DEFAULT false,
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  plaid_transaction_id text UNIQUE,
  date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  merchant text,
  payee text,
  memo text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  description text,
  status text DEFAULT 'posted' CHECK (status = ANY (ARRAY['posted','pending','hold'])),
  cleared boolean NOT NULL DEFAULT true,
  user_hold boolean DEFAULT false,
  last_sync_check timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payee_rename_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_key text NOT NULL,
  match_merchant text NOT NULL,
  rename_to text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, match_key)
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount numeric(15,2) NOT NULL,
  period text DEFAULT 'monthly' CHECK (period = ANY (ARRAY['monthly','quarterly','yearly'])),
  month_year text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category_id, month_year)
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payee_rename_rules ENABLE ROW LEVEL SECURITY;

-- Column privileges: authenticated may SELECT plaid_items metadata but NOT access_token.
-- Tokens are read only via SECURITY DEFINER RPC get_plaid_access_token(uuid).

-- RPCs (see migrations):
--   public.handle_new_user()          -- auth.users trigger
--   public.ensure_user_defaults()     -- client/server profile + category seed
--   public.get_plaid_access_token(uuid)
