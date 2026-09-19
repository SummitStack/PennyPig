import { NextRequest, NextResponse } from 'next/server'
import {
  getPlaidAccessToken,
  syncTransactionsForAccounts,
} from '../../../../lib/plaidSync'
import { requireAuthedClient } from '../../../../lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthedClient(request)
    if (auth.error) return auth.error

    const { user, supabase } = auth
    const body = await request.json()
    const accountId = body.account_id as string | undefined
    const itemId = body.item_id as string | undefined

    let plaidItemId: string | null = null
    let accountsQuery = supabase.from('accounts').select('*').eq('user_id', user.id)

    if (accountId) {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('id, plaid_item_id')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single()

      if (error || !account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      if (!account.plaid_item_id) {
        return NextResponse.json(
          { error: 'Account is not linked to a Plaid item. Reconnect with Plaid Link.' },
          { status: 400 }
        )
      }

      plaidItemId = account.plaid_item_id
      accountsQuery = accountsQuery.eq('plaid_item_id', plaidItemId)
    } else if (itemId) {
      const { data: item, error } = await supabase
        .from('plaid_items')
        .select('id, item_id')
        .eq('item_id', itemId)
        .eq('user_id', user.id)
        .single()

      if (error || !item) {
        return NextResponse.json({ error: 'Plaid item not found' }, { status: 404 })
      }

      plaidItemId = item.id
      accountsQuery = accountsQuery.eq('plaid_item_id', item.id)
    } else {
      return NextResponse.json(
        { error: 'Provide account_id or item_id' },
        { status: 400 }
      )
    }

    const accessToken = await getPlaidAccessToken(supabase, plaidItemId!)

    const { data: accounts, error: accountsError } = await accountsQuery
    if (accountsError) throw new Error(accountsError.message)

    const synced = await syncTransactionsForAccounts(
      supabase,
      user.id,
      accessToken,
      accounts || []
    )

    return NextResponse.json({
      success: true,
      synced,
    })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
