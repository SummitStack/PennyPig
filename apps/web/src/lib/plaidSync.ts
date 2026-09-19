import type { SupabaseClient } from '@supabase/supabase-js'
import { plaidRequest } from './plaid'

type AccountRow = {
  id: string
  plaid_account_id: string | null
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

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)

  const categoryByName = new Map(
    (categories || []).map((c: { id: string; name: string }) => [
      c.name.toLowerCase(),
      c.id,
    ])
  )

  const rows = (data.transactions || [])
    .map((txn: any) => {
      const accountId = accountMap.get(txn.account_id)
      if (!accountId) return null

      const rawCategory = txn.personal_finance_category?.primary || 'Shopping'
      const pretty = rawCategory
        .split('_')
        .map((part: string) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ')
      const categoryId =
        categoryByName.get(pretty.toLowerCase()) ||
        categoryByName.get('shopping') ||
        null

      return {
        user_id: userId,
        account_id: accountId,
        plaid_transaction_id: txn.transaction_id,
        date: txn.date,
        amount: Math.abs(Number(txn.amount) || 0),
        merchant: txn.merchant_name || txn.name || 'Unknown',
        category_id: categoryId,
        description: txn.name || null,
        status: txn.pending ? 'pending' : 'posted',
        last_sync_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    .filter(Boolean)

  if (rows.length === 0) return 0

  const { error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'plaid_transaction_id' })

  if (error) throw new Error(error.message)
  return rows.length
}
