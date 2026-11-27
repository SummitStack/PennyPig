import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { authFetch } from '../../lib/authFetch'
import Icon from '../ui/Icon'

/**
 * Opens Plaid Link in update mode for one account's bank, so the user can sign
 * in to the bank again when it asks (ITEM_LOGIN_REQUIRED). Nothing is
 * exchanged afterwards: the connection keeps its token and accounts, and
 * `onReconnected` runs a fresh sync.
 */
export default function PlaidReconnectButton({ accountId, onReconnected, onError }) {
  const [linkToken, setLinkToken] = useState(null)
  const [wantOpen, setWantOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchToken = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authFetch('/api/plaid/create-link-token', {
        method: 'POST',
        body: JSON.stringify({ account_id: accountId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.link_token) throw new Error(data.error || 'Could not start reconnecting')
      setLinkToken(data.link_token)
      setWantOpen(true)
    } catch (err) {
      onError?.(err.message)
    } finally {
      setLoading(false)
    }
  }, [accountId, onError])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: () => {
      setLinkToken(null)
      onReconnected?.()
    },
    onExit: (err) => {
      setLinkToken(null)
      if (err) onError?.(err.display_message || 'Reconnecting was cancelled.')
    },
  })

  // Link opens once its token is ready, so one tap is enough.
  useEffect(() => {
    if (wantOpen && ready && linkToken) {
      setWantOpen(false)
      open()
    }
  }, [wantOpen, ready, linkToken, open])

  return (
    <button
      type="button"
      onClick={fetchToken}
      disabled={loading || wantOpen}
      className="btn btn-secondary btn-sm"
      data-testid="plaid-reconnect"
    >
      <Icon name="link" className="text-[16px]" />
      {loading || wantOpen ? 'Opening…' : 'Reconnect'}
    </button>
  )
}
