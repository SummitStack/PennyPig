# migrations/lock_plaid_access_token_rpc.sql
# Applied to project fnlejvzgcrnwcsxelnqz via Supabase MCP (name: lock_plaid_access_token_rpc)
#
# - Column privileges hide plaid_items.access_token from authenticated SELECT
# - get_plaid_access_token(uuid) SECURITY DEFINER RPC for server sync
# - ensure_user_defaults() SECURITY DEFINER RPC for profile + category seed
