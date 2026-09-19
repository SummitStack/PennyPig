import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/apiAuth'
import { plaidRequest } from '../../../../lib/plaid'

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireUser(request)
    if (error) return error

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

    // Access token is returned for client-side prototype storage until
    // server-side plaid_items persistence is implemented.
    return NextResponse.json({
      success: true,
      access_token: data.access_token,
      item_id: data.item_id,
    })
  } catch (err) {
    console.error('Token exchange error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Token exchange failed' },
      { status: 500 }
    )
  }
}
