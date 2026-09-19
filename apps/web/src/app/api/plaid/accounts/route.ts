import { NextRequest, NextResponse } from 'next/server'
import { plaidRequest } from '../../../../lib/plaid'
import { requireAuthedClient } from '../../../../lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthedClient(request)
    if (auth.error) return auth.error

    const { access_token } = await request.json()
    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 })
    }

    const { response, data } = await plaidRequest('/accounts/get', { access_token })
    if (!response.ok) {
      throw new Error(data.error_message || 'Failed to fetch accounts')
    }

    const accounts = (data.accounts || []).map((account: any) => ({
      id: account.account_id,
      name: account.name,
      type: account.subtype || account.type,
      mask: account.mask,
      balance: account.balances?.current,
    }))

    return NextResponse.json({ accounts })
  } catch (err) {
    console.error('Accounts fetch error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}
