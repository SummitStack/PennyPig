-- lock_plaid_access_token_rpc
-- Prevent clients from reading access_token via PostgREST while allowing insert/update.

REVOKE ALL ON TABLE public.plaid_items FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, user_id, item_id, institution_id, institution_name, created_at, updated_at
) ON TABLE public.plaid_items TO authenticated;

GRANT INSERT (
  id, user_id, item_id, access_token, institution_id, institution_name, created_at, updated_at
) ON TABLE public.plaid_items TO authenticated;

GRANT UPDATE (
  item_id, access_token, institution_id, institution_name, updated_at
) ON TABLE public.plaid_items TO authenticated;

GRANT DELETE ON TABLE public.plaid_items TO authenticated;

CREATE OR REPLACE FUNCTION public.get_plaid_access_token(p_plaid_item_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tok text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT access_token INTO tok
  FROM public.plaid_items
  WHERE id = p_plaid_item_id
    AND user_id = auth.uid();

  RETURN tok;
END;
$$;

REVOKE ALL ON FUNCTION public.get_plaid_access_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plaid_access_token(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_user_defaults()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = uid;

  INSERT INTO public.users (id, email)
  VALUES (uid, COALESCE(uemail, ''))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  INSERT INTO public.categories (user_id, name, type, color, custom) VALUES
    (uid, 'Groceries', 'expense', '#4ade80', false),
    (uid, 'Shopping', 'expense', '#fbbf24', false),
    (uid, 'Coffee', 'expense', '#7bd0ff', false),
    (uid, 'Rent', 'expense', '#f87171', false),
    (uid, 'Subscriptions', 'expense', '#c084fc', false),
    (uid, 'Gas', 'expense', '#fb923c', false),
    (uid, 'Dining', 'expense', '#f472b6', false),
    (uid, 'Transportation', 'expense', '#60a5fa', false),
    (uid, 'Entertainment', 'expense', '#a78bfa', false),
    (uid, 'Living', 'expense', '#34d399', false),
    (uid, 'Salary', 'income', '#4ade80', false)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_defaults() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_defaults() TO authenticated;
