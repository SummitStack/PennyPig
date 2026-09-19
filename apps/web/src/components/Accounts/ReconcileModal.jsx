import { useMemo, useState } from 'react'
import { useAccountStore } from '../../store/accountStore'
import { useTransactionStore } from '../../store/transactionStore'
import Icon from '../ui/Icon'

function computeClearedBalance(account, transactions) {
  const unclearedSum = transactions
    .filter((t) => t.accountId === account.id && !t.cleared)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  return (Number(account.balance) || 0) + unclearedSum
}

export default function ReconcileModal({ account, onClose, onSuccess }) {
  const reconcileAccount = useAccountStore((state) => state.reconcileAccount)
  const transactions = useTransactionStore((state) => state.transactions)
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10))
  const [statementBalance, setStatementBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const clearedBalance = useMemo(
    () => computeClearedBalance(account, transactions),
    [account, transactions]
  )

  const stmtNum = parseFloat(statementBalance)
  const difference =
    statementBalance !== '' && !Number.isNaN(stmtNum) ? stmtNum - clearedBalance : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (Number.isNaN(stmtNum)) {
      setError('Enter a valid statement balance')
      return
    }
    setSaving(true)
    setError(null)
    const result = await reconcileAccount(account.id, {
      statementDate,
      statementBalance: stmtNum,
      clearedBalance,
    })
    setSaving(false)
    if (result.success) {
      onSuccess?.(result)
      onClose()
    } else {
      setError(result.error || 'Reconciliation failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-border-hairline bg-surface-base p-space-lg shadow-lg"
        role="dialog"
        aria-labelledby="reconcile-title"
      >
        <div className="mb-space-md flex items-center justify-between">
          <h3 id="reconcile-title" className="text-headline-sm font-bold text-on-surface">
            Reconcile — {account.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container"
            aria-label="Close"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <div className="mb-space-md rounded-lg border border-border-hairline bg-surface-container/50 p-space-md">
          <p className="text-label-sm text-on-surface-variant">Cleared balance (computed)</p>
          <p className="text-headline-sm font-bold text-on-surface">
            ${clearedBalance.toFixed(2)}
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Ledger balance minus uncleared transaction effects
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-space-md">
          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">
              Statement date
            </label>
            <input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">
              Statement balance
            </label>
            <input
              type="number"
              step="0.01"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              placeholder={clearedBalance.toFixed(2)}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
              required
            />
          </div>

          {difference !== null && (
            <p
              className={`text-body-sm font-medium ${
                Math.abs(difference) < 0.01
                  ? 'text-status-success'
                  : 'text-status-warning'
              }`}
            >
              Difference: {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
            </p>
          )}

          {error && <p className="text-body-sm text-status-error">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-sage-accent px-space-md py-space-sm font-medium text-on-primary disabled:opacity-50"
            >
              {saving ? 'Reconciling…' : 'Reconcile'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border-hairline px-space-md py-space-sm text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
