import type { SupabaseClient } from '@supabase/supabase-js'
import { plaidRequest } from './plaid'
import { isParentCategory } from './categories'
import { resolveToLeafCategoryId, suggestLeafCategoryId } from './categorySuggest'

type AccountRow = {
  id: string
  plaid_account_id: string | null
}

function normalizePayeeKey(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function mapCategoryRow(row: {
  id: string
  name: string
  parent_id?: string | null
  type?: string
  sort_order?: number
}) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id || null,
    type: row.type || 'expense',
    sortOrder: row.sort_order ?? 0,
  }
}

export async function getPlaidAccessToken(
  supabase: SupabaseClient,
  plaidItemId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('get_plaid_access_token', {
    p_plaid_item_id: plaidItemId,
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Plaid access token not found for this item')
  return data as string
}

export async function syncTransactionsForAccounts(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  accounts: AccountRow[]
): Promise<number> {
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const endDate = new Date().toISOString().split('T')[0]

  const { response, data } = await plaidRequest('/transactions/get', {
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  })

  if (!response.ok) {
    throw new Error(data.error_message || 'Failed to fetch transactions')
  }

  // Refresh balances
  const accountsResult = await plaidRequest('/accounts/get', {
    access_token: accessToken,
  })
  if (accountsResult.response.ok) {
    for (const plaidAccount of accountsResult.data.accounts || []) {
      await supabase
        .from('accounts')
        .update({
          balance: plaidAccount.balances?.current ?? 0,
          last_synced: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('plaid_account_id', plaidAccount.account_id)
    }
  }

  const accountMap = new Map(
    accounts
      .filter((a) => a.plaid_account_id)
      .map((a) => [a.plaid_account_id as string, a.id])
  )

  const [{ data: categories }, { data: renameRules }, { data: categoryRules }] =
    await Promise.all([
      supabase
        .from('categories')
        .select('id, name, parent_id, type, sort_order')
        .eq('user_id', userId),
      supabase
        .from('payee_rename_rules')
        .select('match_key, rename_to')
        .eq('user_id', userId),
      supabase
        .from('payee_category_rules')
        .select('match_key, category_id')
        .eq('user_id', userId),
    ])

  const mappedCategories = (categories || []).map(mapCategoryRow)

  const renameByKey = new Map(
    (renameRules || []).map((r: { match_key: string; rename_to: string }) => [
      r.match_key,
      r.rename_to,
    ])
  )

  const categoryRuleByKey = new Map(
    (categoryRules || []).map(
      (r: { match_key: string; category_id: string }) => [
        r.match_key,
        r.category_id,
      ]
    )
  )

  const incoming = (data.transactions || [])
    .map((txn: any) => {
      const accountId = accountMap.get(txn.account_id)
      if (!accountId) return null

      const pfc = txn.personal_finance_category || {}
      const merchant = txn.merchant_name || txn.name || 'Unknown'
      const matchKey = normalizePayeeKey(merchant)
      const payee = renameByKey.get(matchKey) || merchant
      const pending = Boolean(txn.pending)
      // Plaid: positive = money leaving account (outflow). Keep signed.
      const signed = Number(txn.amount) || 0
      const ruleId = categoryRuleByKey.get(matchKey)
      const suggestedCategoryId = suggestLeafCategoryId({
        categories: mappedCategories,
        payee,
        merchant,
        plaidPrimary: pfc.primary || '',
        plaidDetailed: pfc.detailed || '',
        ...(ruleId ? { ruleCategoryId: ruleId } : {}),
      })

      return {
        user_id: userId,
        account_id: accountId,
        plaid_transaction_id: txn.transaction_id,
        date: txn.date,
        amount: signed,
        merchant,
        payee,
        category_id: suggestedCategoryId,
        description: txn.name || null,
        status: pending ? 'pending' : 'posted',
        // Uncleared until user reviews category and clears → budget
        cleared: false,
        last_sync_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (incoming.length === 0) return 0

  const plaidIds = incoming.map((r) => r.plaid_transaction_id as string)
  const { data: existingRows } = await supabase
    .from('transactions')
    .select('plaid_transaction_id, category_id, payee, merchant, memo, cleared')
    .eq('user_id', userId)
    .in('plaid_transaction_id', plaidIds)

  const existingByPlaid = new Map(
    (existingRows || []).map((row: any) => [row.plaid_transaction_id, row])
  )

  const rows = incoming.map((row) => {
    const existing = existingByPlaid.get(row.plaid_transaction_id as string)
    if (!existing) return row

    // Preserve user categorization and memo; re-apply rename rules to payee
    const merchant = String(row.merchant)
    const matchKey = normalizePayeeKey(merchant)
    const renamed = renameByKey.get(matchKey)
    const preservedCategory = existing.category_id
      ? isParentCategory(mappedCategories, existing.category_id)
        ? suggestLeafCategoryId({
            categories: mappedCategories,
            payee: String(existing.payee || merchant),
            merchant,
          }) || resolveToLeafCategoryId(mappedCategories, existing.category_id)
        : existing.category_id
      : row.category_id
    return {
      ...row,
      category_id: preservedCategory,
      memo: existing.memo ?? null,
      payee: renamed || existing.payee || merchant,
      // Keep manual cleared state if user already cleared
      cleared:
        existing.cleared !== null && existing.cleared !== undefined
          ? existing.cleared
          : false,
    }
  })

  const { error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'plaid_transaction_id' })

  if (error) throw new Error(error.message)
  return rows.length
}
