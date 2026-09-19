import { NextRequest, NextResponse } from 'next/server'
import { plaidRequest } from '../../../../lib/plaid'
import { requireAuthedClient } from '../../../../lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthedClient(request)
    if (auth.error) return auth.error

    const { response, data } = await plaidRequest('/link/token/create', {
      client_name: 'PennyPig',
      language: 'en',
      country_codes: ['US'],
      user: { client_user_id: auth.user.id },
      products: ['transactions'],
    })

    if (!response.ok) {
      throw new Error(data.error_message || 'Failed to create link token')
    }

    return NextResponse.json({ link_token: data.link_token })
  } catch (err) {
    console.error('Link token error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create link token' },
      { status: 500 }
    )
  }
}
