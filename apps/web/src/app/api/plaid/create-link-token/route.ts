import { NextRequest, NextResponse } from 'next/server'
import { plaidRequest } from '../../../../lib/plaid'
import { getPlaidAccessToken } from '../../../../lib/plaidSync'
import { requireAuthedClient } from '../../../../lib/supabaseServer'

/**
 * A Plaid Link token. With `account_id`, the token opens Link in update mode
 * for that account's bank, so the user can sign in again when the bank asks
 * (ITEM_LOGIN_REQUIRED). The connection and its accounts stay as they are.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthedClient(request)
    if (auth.error) return auth.error

    const body = await request.json().catch(() => ({}))
    const accountId = typeof body?.account_id === 'string' ? body.account_id : null

    let updateAccessToken: string | null = null
    if (accountId) {
      const { data: account, error } = await auth.supabase
        .from('accounts')
        .select('id, plaid_item_id')
        .eq('id', accountId)
        .eq('user_id', auth.user.id)
        .maybeSingle()
      if (error || !account?.plaid_item_id) {
        return NextResponse.json({ error: 'That account is not linked to a bank.' }, { status: 404 })
      }
      updateAccessToken = await getPlaidAccessToken(auth.supabase, account.plaid_item_id, auth.user.id)
    }

    const { response, data } = await plaidRequest('/link/token/create', {
      client_name: 'PennyPig',
      language: 'en',
      country_codes: ['US'],
      user: { client_user_id: auth.user.id },
      // Update mode takes the existing access token and no products.
      ...(updateAccessToken ? { access_token: updateAccessToken } : { products: ['transactions'] }),
    })

    if (!response.ok) {
      throw new Error(data.error_message || 'Failed to create link token')
    }

    return NextResponse.json({ link_token: data.link_token, update: Boolean(updateAccessToken) })
  } catch (err) {
    console.error('Link token error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create link token' },
      { status: 500 }
    )
  }
}
