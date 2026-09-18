import { NextRequest, NextResponse } from 'next/server'

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || '6aad3230800fce000da2fca0'
const PLAID_SECRET = process.env.PLAID_SECRET || '8d86c4c32e1124c5dfa0d4b5d11cb3'
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'

export async function POST(request: NextRequest) {
  try {
    const { access_token, user_id } = await request.json()

    if (!access_token) {
      return NextResponse.json(
        { error: 'Missing access_token' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://${PLAID_ENV === 'production' ? 'production' : 'sandbox'}.plaid.com/transactions/get`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token,
          start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error_message || 'Failed to fetch transactions')
    }

    const transactions = data.transactions.map((txn: any) => ({
      id: txn.transaction_id,
      date: txn.date,
      merchant: txn.merchant_name || 'Unknown',
      category: txn.personal_finance_category?.primary || 'Other',
      amount: txn.amount,
      accountId: txn.account_id,
      status: txn.pending ? 'pending' : 'posted'
    }))

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Transactions fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
