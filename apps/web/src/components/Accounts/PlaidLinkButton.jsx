import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useAuthStore } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { authFetch } from '../../lib/authFetch'
import Icon from '../ui/Icon'

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

        // Ensure CC payment categories for any newly linked credit accounts
        const ensureCc = useTransactionStore.getState().ensureCreditCardCategory
        const accounts = useAccountStore.getState().linkedAccounts
        for (const account of accounts) {
          if (account.type === 'credit') {
            await ensureCc(account)
          }
        }
        await Promise.all([loadAccounts(), loadData()])


      } catch (err) {
        console.error('Error:', err)
        setError(err.message)
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

  // A raw env error ("PLAID_CLIENT_ID is not set") used to show under a button
  // stuck on "Preparing…". Show a plain unavailable state instead.
  if (error && !linkToken) {
    return (
      <button
        type="button"
        disabled
        title={error}
        className="btn btn-secondary py-2.5"
      >
        <Icon name="link_off" className="text-[18px]" />
        Bank linking unavailable
      </button>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => open()}
        disabled={!ready || !linkToken || linking}
        className="btn btn-primary py-2.5"
      >
        <Icon name="add_link" className="text-[18px]" />
        {linking ? 'Connecting…' : !linkToken ? 'Preparing…' : 'Connect a bank'}
      </button>
      {error && <p className="text-label-md text-status-error">{error}</p>}
    </div>
  )
}
