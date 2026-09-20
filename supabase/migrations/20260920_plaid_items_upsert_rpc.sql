-- plaid_items_upsert_rpc
-- PostgREST cannot reliably INSERT/UPSERT plaid_items when SELECT is
-- column-restricted (hides access_token). Save Items via SECURITY DEFINER RPC.

CREATE OR REPLACE FUNCTION public.upsert_plaid_item(
  p_item_id text,
  p_access_token text,
  p_institution_id text DEFAULT NULL,
  p_institution_name text DEFAULT 'Plaid Connected'
)
RETURNS TABLE (
  id uuid,
  item_id text,
  institution_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result_id uuid;
  result_item_id text;
  result_institution_name text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 THEN
    RAISE EXCEPTION 'item_id required';
  END IF;

  IF p_access_token IS NULL OR length(trim(p_access_token)) = 0 THEN
    RAISE EXCEPTION 'access_token required';
  END IF;

  INSERT INTO public.plaid_items AS pi (
    user_id, item_id, access_token, institution_id, institution_name, updated_at
  )
  VALUES (
    uid,
    p_item_id,
    p_access_token,
    p_institution_id,
    COALESCE(NULLIF(trim(p_institution_name), ''), 'Plaid Connected'),
    now()
  )
  ON CONFLICT (item_id) DO UPDATE SET
    access_token = EXCLUDED.access_token,
    institution_id = COALESCE(EXCLUDED.institution_id, pi.institution_id),
    institution_name = COALESCE(EXCLUDED.institution_name, pi.institution_name),
    updated_at = now()
  WHERE pi.user_id = uid
  RETURNING pi.id, pi.item_id, pi.institution_name
  INTO result_id, result_item_id, result_institution_name;

  IF result_id IS NULL THEN
    RAISE EXCEPTION 'Plaid item belongs to another user or could not be saved';
  END IF;

  id := result_id;
  item_id := result_item_id;
  institution_name := result_institution_name;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_plaid_item(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_plaid_item(text, text, text, text) TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.plaid_items TO authenticated;
GRANT SELECT (
  id, user_id, item_id, institution_id, institution_name, created_at, updated_at
) ON TABLE public.plaid_items TO authenticated;
REVOKE SELECT (access_token) ON TABLE public.plaid_items FROM authenticated;
