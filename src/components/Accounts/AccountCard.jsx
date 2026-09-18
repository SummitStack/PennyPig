import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'

export default function AccountCard({ account }) {
  const user = useAuthStore(state => state.user)
  const [syncing, setSyncing] = useState(false)
  const removeAccount = useAccountStore(state => state.removeAccount)
  const syncAccount = useAccountStore(state => state.syncAccount)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  const handleSync = async () => {
    setSyncing(true)
    try {
      // In production, fetch the access_token from your backend
      // For now, this is a placeholder that syncs via backend
      const response = await fetch(`${API_URL}/api/plaid/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: 'demo-token', // Replace with real access token from backend
          user_id: user?.id || 'demo-user'
        })
      })

      if (response.ok) {
        syncAccount(account.id)
        alert(`✓ ${account.name} synced successfully`)
      } else {
        alert('Sync failed')
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleRemove = () => {
    if (confirm(`Remove ${account.name}?`)) {
      removeAccount(account.id)
    }
  }

  const lastSyncTime = account.lastSynced
    ? Math.round((Date.now() - account.lastSynced) / 60000)
    : null

  return (
    <div className="bg-surface-container rounded-lg p-6 border border-border-hairline hover:border-primary transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-headline-sm font-bold text-on-surface">{account.name}</h3>
          <p className="text-label-md text-on-surface-variant mt-1">{account.institution}</p>
        </div>
        <span className={`text-label-md px-3 py-1 rounded ${
          account.status === 'active'
            ? 'bg-status-success bg-opacity-10 text-status-success'
            : 'bg-status-error bg-opacity-10 text-status-error'
        }`}>
          {account.status}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-body-sm text-on-surface-variant">Account</span>
          <span className="text-body-md text-on-surface font-medium">{account.accountNumber}</span>
        </div>
        {account.routingNumber && (
          <div className="flex justify-between">
            <span className="text-body-sm text-on-surface-variant">Routing</span>
            <span className="text-body-md text-on-surface font-medium">{account.routingNumber}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-body-sm text-on-surface-variant">Balance</span>
          <span className={`text-body-md font-bold ${account.balance < 0 ? 'text-status-error' : 'text-status-success'}`}>
            ${account.balance.toFixed(2)}
          </span>
        </div>
      </div>

      {lastSyncTime !== null && (
        <p className="text-label-md text-on-surface-variant mb-4">
          Last synced {lastSyncTime} minutes ago
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex-1 py-2 px-3 bg-primary text-surface rounded text-body-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
        <button
          onClick={handleRemove}
          className="flex-1 py-2 px-3 bg-surface-container text-status-error border border-status-error rounded text-body-sm font-medium hover:bg-status-error hover:bg-opacity-10 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
