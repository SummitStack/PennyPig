import { NextRequest, NextResponse } from 'next/server'
import { plaidRequest } from '../../../../lib/plaid'
import {
  ensureUserProfile,
  mapPlaidAccountType,
  requireAuthedClient,
} from '../../../../lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthedClient(request)
    if (auth.error) return auth.error

    const { user, supabase } = auth
    await ensureUserProfile(supabase, user)

    const { public_token } = await request.json()
    if (!public_token) {
      return NextResponse.json({ error: 'Missing public_token' }, { status: 400 })
    }

    const { response, data } = await plaidRequest('/item/public_token/exchange', {
      public_token,
    })

    if (!response.ok) {
      throw new Error(data.error_message || 'Token exchange failed')
    }

    const accessToken = data.access_token as string
    const itemId = data.item_id as string

    const { data: itemRow, error: itemError } = await supabase
      .from('plaid_items')
      .upsert(
        {
          user_id: user.id,
          item_id: itemId,
          access_token: accessToken,
          institution_name: 'Plaid Connected',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'item_id' }
      )
      .select('id, item_id, institution_name')
      .single()

    if (itemError) throw new Error(itemError.message)

    const accountsResult = await plaidRequest('/accounts/get', {
      access_token: accessToken,
    })

    if (!accountsResult.response.ok) {
      throw new Error(accountsResult.data.error_message || 'Failed to fetch accounts')
    }

    const plaidAccounts = accountsResult.data.accounts || []
    const accountRows = plaidAccounts.map((account: any) => ({
      user_id: user.id,
      plaid_item_id: itemRow.id,
      plaid_account_id: account.account_id,
      name: account.name || account.official_name || 'Account',
      account_type: mapPlaidAccountType(account.type, account.subtype),
      balance: account.balances?.current ?? 0,
      mask: account.mask || null,
      institution_name: itemRow.institution_name,
      last_synced: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { data: savedAccounts, error: accountsError } = await supabase
      .from('accounts')
      .upsert(accountRows, { onConflict: 'plaid_account_id' })
      .select('*')

    if (accountsError) throw new Error(accountsError.message)

    // Best-effort initial transaction sync
    let syncedTransactions = 0
    try {
      syncedTransactions = await syncTransactionsForItem(
        supabase,
        user.id,
        accessToken,
        savedAccounts || []
      )
    } catch (syncErr) {
      console.error('Initial sync warning:', syncErr)
    }

    return NextResponse.json({
      success: true,
      item_id: itemId,
      accounts: savedAccounts || [],
      synced_transactions: syncedTransactions,
    })
  } catch (err) {
    console.error('Token exchange error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Token exchange failed' },
      { status: 500 }
    )
  }
}

async function syncTransactionsForItem(
  supabase: any,
  userId: string,
  accessToken: string,
  accounts: Array<{ id: string; plaid_account_id: string | null }>
) {
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
    (categories || []).map((c: any) => [c.name.toLowerCase(), c.id])
  )

  const rows = (data.transactions || [])
    .map((txn: any) => {
      const accountId = accountMap.get(txn.account_id)
      if (!accountId) return null

      const rawCategory = txn.personal_finance_category?.primary || 'Other'
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

  await supabase
    .from('accounts')
    .update({ last_synced: new Date().toISOString() })
    .in(
      'id',
      accounts.map((a) => a.id)
    )

  return rows.length
}
