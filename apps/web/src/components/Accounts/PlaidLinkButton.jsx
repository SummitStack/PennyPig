import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useAuthStore } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'
import { authFetch } from '../../lib/authFetch'

export default function PlaidLinkButton() {
  const user = useAuthStore((state) => state.user)
  const addAccount = useAccountStore((state) => state.addAccount)
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

        const accountsResponse = await authFetch('/api/plaid/accounts', {
          method: 'POST',
          body: JSON.stringify({ access_token: exchangeData.access_token }),
        })

        const accountsData = await accountsResponse.json()
        if (!accountsResponse.ok) throw new Error(accountsData.error)

        accountsData.accounts.forEach((account) => {
          addAccount({
            name: account.name,
            type: account.type,
            plaidAccountId: account.id,
            accountNumber: account.mask ? `****${account.mask}` : '••••',
            institution: 'Plaid Connected',
            balance: account.balance ?? 0,
            accessToken: exchangeData.access_token,
            itemId: exchangeData.item_id,
            status: 'active',
          })
        })

        alert('Accounts connected successfully!')
      } catch (err) {
        console.error('Error:', err)
        setError(err.message)
        alert(`Error: ${err.message}`)
      } finally {
        setLinking(false)
      }
    },
    [addAccount]
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
        className="px-6 py-2 bg-primary text-surface rounded font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {linking ? 'Connecting...' : !linkToken ? 'Preparing...' : '+ Connect Account'}
      </button>
      {error && (
        <p className="text-body-sm text-status-error">{error}</p>
      )}
    </div>
  )
}
