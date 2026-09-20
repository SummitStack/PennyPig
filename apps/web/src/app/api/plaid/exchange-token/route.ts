import { NextRequest, NextResponse } from 'next/server'
import { plaidRequest } from '../../../../lib/plaid'
import { syncTransactionsForAccounts } from '../../../../lib/plaidSync'
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

    const { data: itemRows, error: itemError } = await supabase.rpc('upsert_plaid_item', {
      p_item_id: itemId,
      p_access_token: accessToken,
      p_institution_id: null,
      p_institution_name: 'Plaid Connected',
    })

    if (itemError) throw new Error(itemError.message)

    const itemRow = Array.isArray(itemRows) ? itemRows[0] : itemRows
    if (!itemRow?.id) throw new Error('Failed to save Plaid item')

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
      is_manual: false,
      on_budget: true,
      last_synced: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { data: savedAccounts, error: accountsError } = await supabase
      .from('accounts')
      .upsert(accountRows, { onConflict: 'plaid_account_id' })
      .select('*')

    if (accountsError) throw new Error(accountsError.message)

    let syncedTransactions = 0
    try {
      syncedTransactions = await syncTransactionsForAccounts(
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
