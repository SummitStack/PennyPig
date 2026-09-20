-- fix_upsert_plaid_item_jsonb
-- RETURNS TABLE(id, item_id, ...) makes PL/pgSQL out-params that shadow
-- plaid_items columns (ON CONFLICT (item_id) → "ambiguous"). Return jsonb instead.

DROP FUNCTION IF EXISTS public.upsert_plaid_item(text, text, text, text);

CREATE OR REPLACE FUNCTION public.upsert_plaid_item(
  p_item_id text,
  p_access_token text,
  p_institution_id text DEFAULT NULL,
  p_institution_name text DEFAULT 'Plaid Connected'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_id uuid;
  v_plaid_item_id text;
  v_institution_name text;
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
    user_id,
    item_id,
    access_token,
    institution_id,
    institution_name,
    updated_at
  )
  VALUES (
    uid,
    p_item_id,
    p_access_token,
    p_institution_id,
    COALESCE(NULLIF(trim(p_institution_name), ''), 'Plaid Connected'),
    now()
  )
  ON CONFLICT ON CONSTRAINT plaid_items_item_id_key DO UPDATE SET
    access_token = EXCLUDED.access_token,
    institution_id = COALESCE(EXCLUDED.institution_id, pi.institution_id),
    institution_name = COALESCE(EXCLUDED.institution_name, pi.institution_name),
    updated_at = now()
  WHERE pi.user_id = uid
  RETURNING pi.id, pi.item_id, pi.institution_name
  INTO v_id, v_plaid_item_id, v_institution_name;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Plaid item belongs to another user or could not be saved';
  END IF;

  RETURN jsonb_build_object(
    'id', v_id,
    'item_id', v_plaid_item_id,
    'institution_name', v_institution_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_plaid_item(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_plaid_item(text, text, text, text) TO authenticated;
