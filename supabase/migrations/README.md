# migrations/

Applied to project `fnlejvzgcrnwcsxelnqz` via Supabase MCP.

## 20260919_lock_plaid_access_token_rpc.sql
- Column privileges hide `plaid_items.access_token` from authenticated SELECT
- `get_plaid_access_token(uuid)` SECURITY DEFINER RPC for server sync
- Baseline `ensure_user_defaults()` for profile + flat category seed

## 20260920_fix_plaid_items_grants.sql
- Restores table-level `INSERT`/`UPDATE`/`DELETE` on `plaid_items` for PostgREST
- Keeps `access_token` unselectable; metadata columns remain SELECT-able
- Fixes Link exchange error: `permission denied for table plaid_items`

## 20260920_plaid_items_upsert_rpc.sql
- `upsert_plaid_item(...)` SECURITY DEFINER RPC — Link exchange saves Items without
  PostgREST needing table-level SELECT (which would expose `access_token`)
- Exchange API uses the RPC instead of direct `.upsert()` on `plaid_items`

## 20260920_fix_upsert_plaid_item_ambiguous.sql
- Fixes `column reference "item_id" is ambiguous` in `upsert_plaid_item`
  (RETURNS TABLE out-params vs table columns); use locals + `RETURN QUERY`

## 20260920_fix_upsert_plaid_item_jsonb.sql
- Definitive fix: `upsert_plaid_item` returns `jsonb` (no OUT-param name clash);
  `ON CONFLICT ON CONSTRAINT plaid_items_item_id_key`

## 20260919_category_hierarchy_emoji.sql
- `categories.parent_id` + `categories.sort_order`
- Hierarchical default categories with emoji icons
- Updated `ensure_user_defaults()` seeds groups/subcategories and re-homes legacy flat rows

## 20260919_transactions_ledger_payee_rules.sql
- `transactions.payee`, `memo`, `cleared`
- `payee_rename_rules` table for remembering cleaned payee names across imports

## 20260919_ynab_tier0_tier1.sql
- Signed amounts convention (positive outflow / negative inflow); income backfill
- Manual accounts: `is_manual`, `on_budget`, `closed`, `credit_card_category_id`
- Transfers/splits flags on transactions + `transaction_splits`
- `payee_category_rules`, `category_targets`, `account_reconciliations`
- Category CC payment flags: `is_cc_payment`, `linked_account_id`

## 20260919_category_packs_defaults.sql
- Keeps original Living / Food & Dining seed (reverted from temporary Housing seed)
- Opt-in idea packs (removed in favor of locked parents — see below)

## 20260919_budget_locked_parents.sql
- Adds `categories.is_system` for locked budget parents
- Seeds exactly four parents: **Needs**, **Wants**, **Savings Goals**, **Other**
- Remounts default groups under parents (Living/Transportation/Subscriptions → Needs; Food & Dining/Entertainment/Shopping → Wants)
- Savings categories (Emergency Fund, Vacation) hang directly under Savings Goals
- Orphan top-level expense categories are moved under **Other**
- `ensure_user_defaults()` updated; parents cannot be renamed, moved, or deleted in the app

## 20261127_recurring_transactions.sql (round 2, NOT yet applied to live)
- New `recurring_transactions` table: a template (payee, amount, inflow, category, memo, account) plus `frequency` and `next_date`
- `anchor_day` keeps monthly and yearly items on the same day of the month (31st stays 31st after February)
- Row-level security limits each user to their own rows
- The app hides recurring features until this table exists, so deploying the code first is safe

## 20261127_plaid_token_server_only.sql (NOT yet applied to live)
- Revokes `get_plaid_access_token(uuid)` from `authenticated`; only `service_role` can call it
- Signed-in browsers could previously read their own Plaid access token through that RPC
- Server routes read the token with `SUPABASE_SERVICE_ROLE_KEY` instead
- Order: add `SUPABASE_SERVICE_ROLE_KEY` in Vercel, redeploy, then apply this
