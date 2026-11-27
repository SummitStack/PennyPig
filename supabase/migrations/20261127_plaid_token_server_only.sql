-- Keep Plaid access tokens on the server.
-- Before this, any signed-in user could call get_plaid_access_token from their
-- browser and read their bank connection's access token. The app's server
-- routes now read it with the service role instead.
--
-- Apply ONLY after SUPABASE_SERVICE_ROLE_KEY is set in Vercel and that deploy
-- is live, or bank sync stops working until it is.

REVOKE EXECUTE ON FUNCTION public.get_plaid_access_token(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_plaid_access_token(uuid) TO service_role;
