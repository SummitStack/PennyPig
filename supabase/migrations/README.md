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
