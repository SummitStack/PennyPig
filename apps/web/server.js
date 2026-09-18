import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = process.env.PORT || 3001

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || '6aad3230800fce000da2fca0'
const PLAID_SECRET = process.env.PLAID_SECRET || '8d86c4c32e1124c5dfa0d4b5d11cb3'
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox'

app.use(cors())
app.use(express.json())

const plaidUrl = (endpoint) =>
  `https://${PLAID_ENV === 'production' ? 'production' : 'sandbox'}.plaid.com${endpoint}`

app.post('/api/plaid/exchange-token', async (req, res) => {
  try {
    const { public_token, user_id } = req.body
    if (!public_token) return res.status(400).json({ error: 'Missing public_token' })

    const response = await fetch(plaidUrl('/item/public_token/exchange'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error_message)

    res.json({
      success: true,
      access_token: data.access_token,
      item_id: data.item_id
    })
  } catch (error) {
    console.error('Token exchange error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/plaid/accounts', async (req, res) => {
  try {
    const { access_token } = req.body
    if (!access_token) return res.status(400).json({ error: 'Missing access_token' })

    const response = await fetch(plaidUrl('/accounts/get'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error_message)

    const accounts = data.accounts.map((account) => ({
      id: account.account_id,
      name: account.name,
      type: account.subtype,
      mask: account.mask,
      balance: account.balances.current
    }))

    res.json({ accounts })
  } catch (error) {
    console.error('Accounts fetch error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/plaid/transactions', async (req, res) => {
  try {
    const { access_token } = req.body
    if (!access_token) return res.status(400).json({ error: 'Missing access_token' })

    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const response = await fetch(plaidUrl('/transactions/get'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token,
        start_date: startDate,
        end_date: endDate
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error_message)

    const transactions = data.transactions.map((txn) => ({
      id: txn.transaction_id,
      date: txn.date,
      merchant: txn.merchant_name || 'Unknown',
      category: txn.personal_finance_category?.primary || 'Other',
      amount: txn.amount,
      accountId: txn.account_id,
      status: txn.pending ? 'pending' : 'posted'
    }))

    res.json({ transactions })
  } catch (error) {
    console.error('Transactions fetch error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`PennyPig API server running on http://localhost:${PORT}`)
})
