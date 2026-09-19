import { useState } from 'react'
import { useAccountStore } from '../../store/accountStore'
import Icon from '../ui/Icon'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit card' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
]

export default function ManualAccountForm({ onClose, onCreated }) {
  const createManualAccount = useAccountStore((state) => state.createManualAccount)
  const [name, setName] = useState('')
  const [accountType, setAccountType] = useState('checking')
  const [balance, setBalance] = useState('0')
  const [onBudget, setOnBudget] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    const result = await createManualAccount({
      name: name.trim(),
      accountType,
      balance: parseFloat(balance) || 0,
      onBudget,
    })
    setSaving(false)
    if (result.success) {
      onCreated?.(result.account)
      onClose()
    } else {
      setError(result.error || 'Could not create account')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-border-hairline bg-surface-base p-space-lg shadow-lg"
        role="dialog"
        aria-labelledby="manual-account-title"
      >
        <div className="mb-space-md flex items-center justify-between">
          <h3 id="manual-account-title" className="text-headline-sm font-bold text-on-surface">
            Add manual account
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

        <form onSubmit={handleSubmit} className="space-y-space-md">
          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My checking"
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface outline-none focus:border-cool-blue"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">Type</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">
              Starting balance
            </label>
            <input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface outline-none focus:border-cool-blue"
            />
          </div>

          <label className="flex items-center gap-space-sm text-body-sm text-on-surface">
            <input
              type="checkbox"
              checked={onBudget}
              onChange={(e) => setOnBudget(e.target.checked)}
              className="rounded border-border-hairline"
            />
            On budget
          </label>

          {error && <p className="text-body-sm text-status-error">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-space-md py-space-sm font-medium text-on-primary disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create account'}
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
