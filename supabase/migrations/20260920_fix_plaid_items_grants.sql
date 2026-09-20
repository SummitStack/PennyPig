-- fix_plaid_items_grants
-- PostgREST requires table-level INSERT/UPDATE/DELETE on plaid_items.
-- The prior migration revoked ALL then only granted column privileges, which
-- caused "permission denied for table plaid_items" on Link token exchange.
-- Keep access_token unreadable via SELECT; writes still allowed; reads via RPC.

REVOKE ALL ON TABLE public.plaid_items FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, user_id, item_id, institution_id, institution_name, created_at, updated_at
) ON TABLE public.plaid_items TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE public.plaid_items TO authenticated;

-- Explicit: authenticated must never SELECT access_token
REVOKE SELECT (access_token) ON TABLE public.plaid_items FROM authenticated;
