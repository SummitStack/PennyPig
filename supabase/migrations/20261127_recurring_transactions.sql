-- Recurring transactions (rent, paychecks, subscriptions).
-- Each row is a template plus the date it is next due. The app lists due items
-- and enters them only when the user taps Enter, then moves next_date forward.
-- NOT yet applied to the live project: apply it before merging the round 2 PR.

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  payee text NOT NULL,
  -- Always positive; inflow says which way the money moves.
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  inflow boolean NOT NULL DEFAULT false,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  memo text,
  frequency text NOT NULL CHECK (frequency = ANY (ARRAY['weekly','biweekly','monthly','yearly'])),
  next_date date NOT NULL,
  -- Day of month for monthly/yearly items, so the 31st stays the 31st after February.
  anchor_day smallint CHECK (anchor_day BETWEEN 1 AND 31),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recurring_transactions_user_next_idx
  ON public.recurring_transactions (user_id, next_date);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_transactions_select_own ON public.recurring_transactions;
CREATE POLICY recurring_transactions_select_own ON public.recurring_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS recurring_transactions_insert_own ON public.recurring_transactions;
CREATE POLICY recurring_transactions_insert_own ON public.recurring_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS recurring_transactions_update_own ON public.recurring_transactions;
CREATE POLICY recurring_transactions_update_own ON public.recurring_transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS recurring_transactions_delete_own ON public.recurring_transactions;
CREATE POLICY recurring_transactions_delete_own ON public.recurring_transactions
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_transactions TO authenticated;
