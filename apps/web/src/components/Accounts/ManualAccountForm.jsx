import { ModalBackdrop, modalPanel } from '../ui/Modal'
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
  const [balance, setBalance] = useState('')
  const [onBudget, setOnBudget] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isDebt = accountType === 'credit' || accountType === 'loan'
  const amount = parseFloat(balance) || 0

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
      balance: amount,
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
    <ModalBackdrop onClose={onClose}>
      <div className={`w-full max-w-md ${modalPanel} p-5 sm:p-6`} role="dialog" aria-labelledby="manual-account-title">
        <div className="mb-4 flex items-center justify-between">
          <h3 id="manual-account-title" className="font-display text-headline-sm text-on-surface">
            Add an account
          </h3>
          <button type="button" onClick={onClose} className="btn btn-ghost h-8 w-8 p-0" aria-label="Close">
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ma-name" className="field-label">
              Name
            </label>
            <input
              id="ma-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Everyday checking"
              className="field"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ma-type" className="field-label">
                Type
              </label>
              <select id="ma-type" value={accountType} onChange={(e) => setAccountType(e.target.value)} className="field">
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ma-balance" className="field-label">
                {isDebt ? 'Balance (owed is negative)' : "Today's balance"}
              </label>
              <input
                id="ma-balance"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="field num"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-border-hairline p-3 text-body-sm text-on-surface">
            <input
              type="checkbox"
              checked={onBudget}
              onChange={(e) => setOnBudget(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Use in my budget</span>
              <span className="block text-label-md text-on-surface-variant">
                {onBudget && !isDebt && amount > 0
                  ? `${amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} will be added to Ready to Assign as a starting balance.`
                  : 'Turn off for accounts you only want to track, like a retirement account.'}
              </span>
            </span>
          </label>

          {error && <p className="text-body-sm text-status-error">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Adding…' : 'Add account'}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  )
}
