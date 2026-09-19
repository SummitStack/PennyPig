import { useState } from 'react'
import { useAccountStore } from '../../store/accountStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { authFetch } from '../../lib/authFetch'

export default function AccountCard({ account }) {
  const [syncing, setSyncing] = useState(false)
  const removeAccount = useAccountStore((state) => state.removeAccount)
  const loadAccounts = useAccountStore((state) => state.loadAccounts)
  const loadData = useTransactionStore((state) => state.loadData)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await authFetch('/api/plaid/sync', {
        method: 'POST',
        body: JSON.stringify({ account_id: account.id }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Sync failed')

      await Promise.all([loadAccounts(), loadData(), loadBudgets()])
      alert(`${account.name} synced (${data.synced ?? 0} transactions)`)
    } catch (error) {
      console.error('Sync error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm(`Remove ${account.name}?`)) return
    const result = await removeAccount(account.id)
    if (!result.success) alert(result.error || 'Failed to remove account')
    else await loadData()
  }

  const lastSyncTime = account.lastSynced
    ? Math.round((Date.now() - new Date(account.lastSynced).getTime()) / 60000)
    : null

  return (
    <div className="bg-surface-container rounded-lg p-6 border border-border-hairline hover:border-primary transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-headline-sm font-bold text-on-surface">{account.name}</h3>
          <p className="text-label-md text-on-surface-variant mt-1">{account.institution}</p>
        </div>
        <span className="text-label-md px-3 py-1 rounded bg-status-success bg-opacity-10 text-status-success">
          {account.status}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-body-sm text-on-surface-variant">Account</span>
          <span className="text-body-md text-on-surface font-medium">{account.accountNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-body-sm text-on-surface-variant">Balance</span>
          <span
            className={`text-body-md font-bold ${
              account.balance < 0 ? 'text-status-error' : 'text-status-success'
            }`}
          >
            ${Number(account.balance).toFixed(2)}
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
