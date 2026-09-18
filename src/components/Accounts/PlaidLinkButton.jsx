import { usePlaidLink } from 'react-plaid-link'
import { useAccountStore } from '../../store/accountStore'

export default function PlaidLinkButton() {
  const addAccount = useAccountStore(state => state.addAccount)

  // TODO: Replace with actual values from backend
  const config = {
    clientName: 'PennyPig',
    user: { client_user_id: 'user-id' },
    env: 'sandbox', // Change to 'production' when ready
    language: 'en',
    // IMPORTANT: Add these from your Plaid account
    // clientId: process.env.REACT_APP_PLAID_CLIENT_ID,
    // secret: process.env.REACT_APP_PLAID_SECRET,
  }

  const { open, ready } = usePlaidLink({
    ...config,
    onSuccess: (public_token) => {
      // TODO: Send public_token to backend to exchange for access_token
      console.log('Plaid Link Success:', public_token)
      // After backend exchange, add the account:
      // addAccount({ name: 'New Account', ... })
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
