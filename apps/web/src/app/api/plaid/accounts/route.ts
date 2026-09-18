import { NextRequest, NextResponse } from 'next/server'

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || '6aad3230800fce000da2fca0'
const PLAID_SECRET = process.env.PLAID_SECRET || '8d86c4c32e1124c5dfa0d4b5d11cb3'
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json()

    if (!access_token) {
      return NextResponse.json(
        { error: 'Missing access_token' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://${PLAID_ENV === 'production' ? 'production' : 'sandbox'}.plaid.com/accounts/get`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error_message || 'Failed to fetch accounts')
    }

    const accounts = data.accounts.map((account: any) => ({
      id: account.account_id,
      name: account.name,
      type: account.subtype,
      mask: account.mask,
      balance: account.balances.current
    }))

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Accounts fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}
