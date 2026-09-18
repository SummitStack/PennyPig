import { NextRequest, NextResponse } from 'next/server'

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || '6aad3230800fce000da2fca0'
const PLAID_SECRET = process.env.PLAID_SECRET || '8d86c4c32e1124c5dfa0d4b5d11cb3'
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'

export async function POST(request: NextRequest) {
  try {
    const { public_token, user_id } = await request.json()

    if (!public_token || !user_id) {
      return NextResponse.json(
        { error: 'Missing public_token or user_id' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://${PLAID_ENV === 'production' ? 'production' : 'sandbox'}.plaid.com/item/public_token/exchange`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          public_token
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error_message || 'Token exchange failed')
    }

    return NextResponse.json({
      success: true,
      message: 'Token exchanged successfully',
      access_token: data.access_token,
      item_id: data.item_id
    })
  } catch (error) {
    console.error('Token exchange error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token exchange failed' },
      { status: 500 }
    )
  }
}
