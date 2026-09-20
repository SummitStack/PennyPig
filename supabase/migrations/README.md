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
