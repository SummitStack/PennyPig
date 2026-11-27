-- Bank sync state for Plaid's /transactions/sync and the daily sync.
-- sync_cursor: where the last sync left off (server only).
-- needs_reconnect / last_sync_error / last_synced_at: shown on the dashboard.
-- Safe to apply before or after the round 5 deploy: without these columns the
-- app falls back to re-reading the last 90 days and shows no dashboard notice.

ALTER TABLE public.plaid_items
  ADD COLUMN IF NOT EXISTS sync_cursor text,
  ADD COLUMN IF NOT EXISTS needs_reconnect boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Signed-in users read plaid_items column by column (access_token is hidden),
-- so the new status columns need their own grant. The cursor stays hidden.
GRANT SELECT (needs_reconnect, last_sync_error, last_synced_at) ON public.plaid_items TO authenticated;
