# migrations/

Applied to project `fnlejvzgcrnwcsxelnqz` via Supabase MCP.

## 20260919_lock_plaid_access_token_rpc.sql
- Column privileges hide `plaid_items.access_token` from authenticated SELECT
- `get_plaid_access_token(uuid)` SECURITY DEFINER RPC for server sync
- Baseline `ensure_user_defaults()` for profile + flat category seed

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
