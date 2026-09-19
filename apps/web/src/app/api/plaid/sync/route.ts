import { NextRequest, NextResponse } from 'next/server'
import { plaidRequest } from '../../../../lib/plaid'
import { requireAuthedClient } from '../../../../lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthedClient(request)
    if (auth.error) return auth.error

    const { user, supabase } = auth
    const body = await request.json()
    const accountId = body.account_id as string | undefined
    const itemId = body.item_id as string | undefined

    let plaidItem: any = null
    let accountsQuery = supabase.from('accounts').select('*').eq('user_id', user.id)

    if (accountId) {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*, plaid_items:plaid_item_id(id, item_id, access_token)')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

      if (error || !account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      plaidItem = account.plaid_items
      if (!plaidItem?.access_token) {
        return NextResponse.json(
          { error: 'Account is not linked to a Plaid item. Reconnect with Plaid Link.' },
          { status: 400 }
        )
      }

      accountsQuery = accountsQuery.eq('plaid_item_id', plaidItem.id)
    } else if (itemId) {
      const { data: item, error } = await supabase
        .from('plaid_items')
        .select('*')
        .eq('item_id', itemId)
        .eq('user_id', user.id)
        .single()

      if (error || !item) {
        return NextResponse.json({ error: 'Plaid item not found' }, { status: 404 })
      }
      plaidItem = item
      accountsQuery = accountsQuery.eq('plaid_item_id', item.id)
    } else {
      return NextResponse.json(
        { error: 'Provide account_id or item_id' },
        { status: 400 }
      )
    }

    const { data: accounts, error: accountsError } = await accountsQuery
    if (accountsError) throw new Error(accountsError.message)

    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]

    const { response, data } = await plaidRequest('/transactions/get', {
      access_token: plaidItem.access_token,
      start_date: startDate,
      end_date: endDate,
    })

    if (!response.ok) {
      throw new Error(data.error_message || 'Failed to fetch transactions')
    }

    // Refresh balances
    const accountsResult = await plaidRequest('/accounts/get', {
      access_token: plaidItem.access_token,
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
          .eq('user_id', user.id)
          .eq('plaid_account_id', plaidAccount.account_id)
      }
    }

    const accountMap = new Map(
      (accounts || [])
        .filter((a: any) => a.plaid_account_id)
        .map((a: any) => [a.plaid_account_id, a.id])
    )

    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id)

    const categoryByName = new Map(
      (categories || []).map((c: any) => [c.name.toLowerCase(), c.id])
    )

    const rows = (data.transactions || [])
      .map((txn: any) => {
        const dbAccountId = accountMap.get(txn.account_id)
        if (!dbAccountId) return null

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
          user_id: user.id,
          account_id: dbAccountId,
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

    if (rows.length > 0) {
      const { error } = await supabase
        .from('transactions')
        .upsert(rows, { onConflict: 'plaid_transaction_id' })
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      synced: rows.length,
    })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
