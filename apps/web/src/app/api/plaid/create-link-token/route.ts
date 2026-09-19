import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/apiAuth'
import { plaidRequest } from '../../../../lib/plaid'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireUser(request)
    if (error) return error

    const { response, data } = await plaidRequest('/link/token/create', {
      client_name: 'PennyPig',
      language: 'en',
      country_codes: ['US'],
      user: { client_user_id: user.id },
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
