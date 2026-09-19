import { useState } from 'react'
import { useAccountStore } from '../../store/accountStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { authFetch } from '../../lib/authFetch'
import ReconcileModal from './ReconcileModal'

export default function AccountCard({ account }) {
  const [syncing, setSyncing] = useState(false)
  const [showReconcile, setShowReconcile] = useState(false)
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
    <div className="rounded-xl border border-border-hairline bg-surface-base p-space-lg shadow-sm transition-colors hover:border-primary">
      <div className="mb-space-md flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-headline-sm font-bold text-on-surface">{account.name}</h3>
            {account.isManual && (
              <span className="rounded bg-cool-blue/10 px-2 py-0.5 text-label-sm font-medium text-cool-blue">
                Manual
              </span>
            )}
          </div>
          <p className="mt-1 text-label-md text-on-surface-variant">{account.institution}</p>
        </div>
        <span className="rounded bg-status-success/10 px-3 py-1 text-label-md text-status-success">
          {account.status}
        </span>
      </div>

      <div className="mb-space-md space-y-3">
        <div className="flex justify-between">
          <span className="text-body-sm text-on-surface-variant">Account</span>
          <span className="text-body-md font-medium text-on-surface">{account.accountNumber}</span>
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

      {lastSyncTime !== null && !account.isManual && (
        <p className="mb-space-md text-label-md text-on-surface-variant">
          Last synced {lastSyncTime} minutes ago
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {!account.isManual && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-body-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        )}
        <button
          onClick={() => setShowReconcile(true)}
          className="flex-1 rounded-lg border border-sage-accent/40 bg-sage-accent/10 px-3 py-2 text-body-sm font-medium text-sage-accent transition-colors hover:bg-sage-accent/20"
        >
          Reconcile
        </button>
        <button
          onClick={handleRemove}
          className="flex-1 rounded-lg border border-status-error bg-surface-base px-3 py-2 text-body-sm font-medium text-status-error transition-colors hover:bg-status-error/10"
        >
          Remove
        </button>
      </div>

      {showReconcile && (
        <ReconcileModal
          account={account}
          onClose={() => setShowReconcile(false)}
        />
      )}
    </div>
  )
}
