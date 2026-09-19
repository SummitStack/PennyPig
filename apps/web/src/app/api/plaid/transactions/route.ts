import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/apiAuth'
import { plaidRequest } from '../../../../lib/plaid'

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireUser(request)
    if (error) return error

    const { access_token } = await request.json()

    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 })
    }

    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]

    const { response, data } = await plaidRequest('/transactions/get', {
      access_token,
      start_date: startDate,
      end_date: endDate,
    })

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
      status: txn.pending ? 'pending' : 'posted',
    }))

    return NextResponse.json({ transactions })
  } catch (err) {
    console.error('Transactions fetch error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
