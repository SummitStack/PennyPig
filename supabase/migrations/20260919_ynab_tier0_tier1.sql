-- YNAB Tier 0 + Tier 1 foundation:
-- signed amounts, manual accounts, splits/transfers, category rules,
-- targets, CC payment categories, reconciliation support.

-- ── Accounts ───────────────────────────────────────────────────────────────
ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_account_type_check;

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS on_budget boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS closed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS credit_card_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_account_type_check CHECK (
    account_type = ANY (ARRAY[
      'credit'::text,
      'debit'::text,
      'checking'::text,
      'savings'::text,
      'cash'::text,
      'loan'::text,
      'other'::text
    ])
  );

UPDATE public.accounts
SET on_budget = true
WHERE on_budget IS DISTINCT FROM true;

UPDATE public.accounts
SET is_manual = (plaid_account_id IS NULL)
WHERE is_manual = false AND plaid_account_id IS NULL;

-- ── Categories ─────────────────────────────────────────────────────────────
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_cc_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- ── Transactions: signed amounts + transfer/split flags ─────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_split boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_from_budget boolean NOT NULL DEFAULT false;

-- Convert legacy absolute amounts: income-categorized → negative (inflow).
-- Plaid convention: positive = outflow, negative = inflow.
UPDATE public.transactions t
SET amount = -ABS(t.amount)
FROM public.categories c
WHERE t.category_id = c.id
  AND c.type = 'income'
  AND t.amount > 0;

-- ── Splits ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transaction_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  amount numeric(15,2) NOT NULL,
  memo text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transaction_splits_txn_idx
  ON public.transaction_splits (transaction_id);

CREATE INDEX IF NOT EXISTS transaction_splits_user_idx
  ON public.transaction_splits (user_id);

ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transaction_splits_select_own ON public.transaction_splits;
DROP POLICY IF EXISTS transaction_splits_insert_own ON public.transaction_splits;
DROP POLICY IF EXISTS transaction_splits_update_own ON public.transaction_splits;
DROP POLICY IF EXISTS transaction_splits_delete_own ON public.transaction_splits;

CREATE POLICY transaction_splits_select_own
  ON public.transaction_splits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY transaction_splits_insert_own
  ON public.transaction_splits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY transaction_splits_update_own
  ON public.transaction_splits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY transaction_splits_delete_own
  ON public.transaction_splits FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_splits TO authenticated;

-- ── Payee → category rules ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payee_category_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_key text NOT NULL,
  match_payee text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, match_key)
);

CREATE INDEX IF NOT EXISTS payee_category_rules_user_idx
  ON public.payee_category_rules (user_id);

ALTER TABLE public.payee_category_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payee_category_rules_select_own ON public.payee_category_rules;
DROP POLICY IF EXISTS payee_category_rules_insert_own ON public.payee_category_rules;
DROP POLICY IF EXISTS payee_category_rules_update_own ON public.payee_category_rules;
DROP POLICY IF EXISTS payee_category_rules_delete_own ON public.payee_category_rules;

CREATE POLICY payee_category_rules_select_own
  ON public.payee_category_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY payee_category_rules_insert_own
  ON public.payee_category_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payee_category_rules_update_own
  ON public.payee_category_rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payee_category_rules_delete_own
  ON public.payee_category_rules FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payee_category_rules TO authenticated;

-- ── Category targets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.category_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['monthly'::text, 'by_date'::text])),
  amount numeric(15,2) NOT NULL DEFAULT 0,
  target_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, category_id)
);

CREATE INDEX IF NOT EXISTS category_targets_user_idx
  ON public.category_targets (user_id);

ALTER TABLE public.category_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS category_targets_select_own ON public.category_targets;
DROP POLICY IF EXISTS category_targets_insert_own ON public.category_targets;
DROP POLICY IF EXISTS category_targets_update_own ON public.category_targets;
DROP POLICY IF EXISTS category_targets_delete_own ON public.category_targets;

CREATE POLICY category_targets_select_own
  ON public.category_targets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY category_targets_insert_own
  ON public.category_targets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY category_targets_update_own
  ON public.category_targets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY category_targets_delete_own
  ON public.category_targets FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_targets TO authenticated;

-- ── Reconciliation snapshots (optional history) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.account_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  statement_date date NOT NULL,
  statement_balance numeric(15,2) NOT NULL,
  cleared_balance numeric(15,2) NOT NULL,
  difference numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_reconciliations_account_idx
  ON public.account_reconciliations (account_id);

ALTER TABLE public.account_reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_reconciliations_select_own ON public.account_reconciliations;
DROP POLICY IF EXISTS account_reconciliations_insert_own ON public.account_reconciliations;
DROP POLICY IF EXISTS account_reconciliations_delete_own ON public.account_reconciliations;

CREATE POLICY account_reconciliations_select_own
  ON public.account_reconciliations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY account_reconciliations_insert_own
  ON public.account_reconciliations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY account_reconciliations_delete_own
  ON public.account_reconciliations FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.account_reconciliations TO authenticated;
