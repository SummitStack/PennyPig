-- Round 6: rules screen, income for next month, gig income, more targets.
-- Adds columns only; existing rows keep today's behavior.

-- Category rules: "contains" matching, gig payers, and next-month income.
ALTER TABLE public.payee_category_rules
  ADD COLUMN IF NOT EXISTS match_type text NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS for_next_month boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_gig boolean NOT NULL DEFAULT false;

ALTER TABLE public.payee_category_rules
  DROP CONSTRAINT IF EXISTS payee_category_rules_match_type_check;
ALTER TABLE public.payee_category_rules
  ADD CONSTRAINT payee_category_rules_match_type_check
  CHECK (match_type IN ('exact', 'contains'));

-- Income that funds next month's budget instead of this month's.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS for_next_month boolean NOT NULL DEFAULT false;

-- Targets: a percent of income (e.g. 25% of gig pay to taxes), and by-date
-- targets that start over after the date (e.g. every 3 months).
ALTER TABLE public.category_targets
  ADD COLUMN IF NOT EXISTS percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS percent_of text,
  ADD COLUMN IF NOT EXISTS repeat_months smallint;

ALTER TABLE public.category_targets
  DROP CONSTRAINT IF EXISTS category_targets_target_type_check;
ALTER TABLE public.category_targets
  ADD CONSTRAINT category_targets_target_type_check
  CHECK (target_type = ANY (ARRAY['monthly'::text, 'by_date'::text, 'percent_income'::text]));

ALTER TABLE public.category_targets
  DROP CONSTRAINT IF EXISTS category_targets_percent_of_check;
ALTER TABLE public.category_targets
  ADD CONSTRAINT category_targets_percent_of_check
  CHECK (percent_of IS NULL OR percent_of IN ('all', 'gig'));

ALTER TABLE public.category_targets
  DROP CONSTRAINT IF EXISTS category_targets_repeat_months_check;
ALTER TABLE public.category_targets
  ADD CONSTRAINT category_targets_repeat_months_check
  CHECK (repeat_months IS NULL OR repeat_months BETWEEN 1 AND 60);
