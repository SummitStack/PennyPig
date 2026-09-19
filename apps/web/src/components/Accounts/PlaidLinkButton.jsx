import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useAuthStore } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { authFetch } from '../../lib/authFetch'

export default function PlaidLinkButton() {
  const user = useAuthStore((state) => state.user)
  const loadAccounts = useAccountStore((state) => state.loadAccounts)
  const loadData = useTransactionStore((state) => state.loadData)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)
  const [linkToken, setLinkToken] = useState(null)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchLinkToken() {
      if (!user) return
      try {
        const response = await authFetch('/api/plaid/create-link-token', {
          method: 'POST',
          body: JSON.stringify({}),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to create link token')
        if (!cancelled) setLinkToken(data.link_token)
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    fetchLinkToken()
    return () => {
      cancelled = true
    }
  }, [user])

  const onSuccess = useCallback(
    async (public_token) => {
      setLinking(true)
      setError(null)
      try {
        const exchangeResponse = await authFetch('/api/plaid/exchange-token', {
          method: 'POST',
          body: JSON.stringify({ public_token }),
        })

        const exchangeData = await exchangeResponse.json()
        if (!exchangeResponse.ok) throw new Error(exchangeData.error)

        await Promise.all([loadAccounts(), loadData(), loadBudgets()])
        alert(
          `Accounts connected${
            exchangeData.synced_transactions
              ? ` (${exchangeData.synced_transactions} transactions synced)`
              : ''
          }!`
        )
      } catch (err) {
        console.error('Error:', err)
        setError(err.message)
        alert(`Error: ${err.message}`)
      } finally {
        setLinking(false)
      }
    },
    [loadAccounts, loadData, loadBudgets]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err) => {
      if (err) setError(err.display_message || err.error_message || 'Plaid Link closed')
    },
  })

  return (
    <div className="space-y-2">
      <button
        onClick={() => open()}
        disabled={!ready || !linkToken || linking}
        className="rounded-xl bg-primary px-space-lg py-space-md font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {linking ? 'Connecting...' : !linkToken ? 'Preparing...' : '+ Connect Account'}
      </button>
      {error && <p className="text-body-sm text-status-error">{error}</p>}
    </div>
  )
}
