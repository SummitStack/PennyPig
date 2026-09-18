import { useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { useAuthStore } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'

export default function PlaidLinkButton() {
  const user = useAuthStore(state => state.user)
  const addAccount = useAccountStore(state => state.addAccount)
  const [linking, setLinking] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const config = {
    clientName: 'PennyPig',
    user: { client_user_id: user?.id || 'demo-user' },
    env: 'sandbox',
    language: 'en',
    clientId: '6aad3230800fce000da2fca0',
    publicKey: '6aad3230800fce000da2fca0'
  }

  const { open, ready } = usePlaidLink({
    ...config,
    onSuccess: async (public_token) => {
      setLinking(true)
      try {
        const exchangeResponse = await fetch(`${API_URL}/api/plaid/exchange-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token,
            user_id: user?.id || 'demo-user'
          })
        })

        const exchangeData = await exchangeResponse.json()
        if (!exchangeResponse.ok) throw new Error(exchangeData.error)

        const accountsResponse = await fetch(`${API_URL}/api/plaid/accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: exchangeData.access_token })
        })

        const accountsData = await accountsResponse.json()
        if (!accountsResponse.ok) throw new Error(accountsData.error)

        accountsData.accounts.forEach(account => {
          addAccount({
            name: account.name,
            type: account.type,
            accountNumber: `****${account.mask}`,
            institution: 'Plaid Connected',
            balance: account.balance,
            status: 'active'
          })
        })

        alert('✓ Accounts connected successfully!')
      } catch (error) {
        console.error('Error:', error)
        alert(`Error: ${error.message}`)
      } finally {
        setLinking(false)
      }
    },
    onExit: (err) => {
      console.log('Plaid Link Exit:', err)
    }
  })

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="px-6 py-2 bg-primary text-surface rounded font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {!ready ? 'Loading...' : '+ Connect Account'}
    </button>
  )
}
