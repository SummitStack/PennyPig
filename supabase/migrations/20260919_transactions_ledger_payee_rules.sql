-- transactions_ledger_payee_rules
-- Payee display names + rename memory, memo, cleared flag for ledger UX.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payee text,
  ADD COLUMN IF NOT EXISTS memo text,
  ADD COLUMN IF NOT EXISTS cleared boolean NOT NULL DEFAULT true;

-- Backfill display payee from merchant
UPDATE public.transactions
SET payee = merchant
WHERE payee IS NULL AND merchant IS NOT NULL;

UPDATE public.transactions
SET cleared = (status = 'posted')
WHERE cleared IS DISTINCT FROM (status = 'posted');

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

CREATE INDEX IF NOT EXISTS payee_rename_rules_user_idx
  ON public.payee_rename_rules (user_id);

ALTER TABLE public.payee_rename_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payee_rename_rules_select_own ON public.payee_rename_rules;
DROP POLICY IF EXISTS payee_rename_rules_insert_own ON public.payee_rename_rules;
DROP POLICY IF EXISTS payee_rename_rules_update_own ON public.payee_rename_rules;
DROP POLICY IF EXISTS payee_rename_rules_delete_own ON public.payee_rename_rules;

CREATE POLICY payee_rename_rules_select_own
  ON public.payee_rename_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY payee_rename_rules_insert_own
  ON public.payee_rename_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payee_rename_rules_update_own
  ON public.payee_rename_rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY payee_rename_rules_delete_own
  ON public.payee_rename_rules FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payee_rename_rules TO authenticated;
