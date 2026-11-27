import { useState } from 'react'
import { ModalBackdrop, modalPanel } from '../ui/Modal'
import { useAccountStore } from '../../store/accountStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { money } from '../../lib/money'
import Icon from '../ui/Icon'

/**
 * Rename an account, change whether it counts in the budget, add a note,
 * close or reopen it, or delete it. Before, the only option was delete.
 */
export default function AccountEditModal({ account, onClose }) {
  const updateAccount = useAccountStore((s) => s.updateAccount)
  const removeAccount = useAccountStore((s) => s.removeAccount)
  const loadData = useTransactionStore((s) => s.loadData)
  const loadBudgets = useBudgetStore((s) => s.loadBudgets)

  const [name, setName] = useState(account.name)
  const [note, setNote] = useState(account.note || '')
  const [onBudget, setOnBudget] = useState(account.onBudget)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const hasBalance = Math.abs(Number(account.balance) || 0) >= 0.005

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    const result = await fn()
    setBusy(false)
    if (result?.success === false) {
      setError(result.error || 'Something went wrong')
      return false
    }
    return true
  }

  const save = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    const ok = await run(() => updateAccount(account.id, { name, note, onBudget }))
    if (ok) {
      if (onBudget !== account.onBudget) await Promise.all([loadData(), loadBudgets()])
      onClose()
    }
  }

  const toggleClosed = async () => {
    const ok = await run(() => updateAccount(account.id, { closed: !account.closed }))
    if (ok) {
      await Promise.all([loadData(), loadBudgets()])
      onClose()
    }
  }

  const doDelete = async () => {
    const ok = await run(() => removeAccount(account.id))
    if (ok) {
      await Promise.all([loadData(), loadBudgets()])
      onClose()
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className={`w-full max-w-md ${modalPanel} p-5 sm:p-6`} role="dialog" aria-labelledby="edit-account-title">
        <div className="mb-4 flex items-center justify-between">
          <h3 id="edit-account-title" className="font-display text-headline-sm text-on-surface">
            Edit account
          </h3>
          <button type="button" onClick={onClose} className="btn btn-ghost h-8 w-8 p-0" aria-label="Close">
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor="ea-name" className="field-label">
              Name
            </label>
            <input id="ea-name" value={name} onChange={(e) => setName(e.target.value)} className="field" required />
          </div>
          <div>
            <label htmlFor="ea-note" className="field-label">
              Note
            </label>
            <input
              id="ea-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className="field"
            />
          </div>
          <label className="flex items-start gap-2.5 rounded-lg border border-border-hairline p-3 text-body-sm text-on-surface">
            <input type="checkbox" checked={onBudget} onChange={(e) => setOnBudget(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="font-medium">Use in my budget</span>
              <span className="block text-label-md text-on-surface-variant">
                Off means the account is tracked for net worth only.
              </span>
            </span>
          </label>

          {error && <p className="text-body-sm text-status-error">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn btn-primary">
              Save
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-3 border-t border-border-hairline pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-on-surface">
                {account.closed ? 'Reopen account' : 'Close account'}
              </p>
              <p className="text-label-md text-on-surface-variant">
                {account.closed
                  ? 'Show it in lists and pickers again.'
                  : hasBalance
                    ? `It still holds ${money(account.balance)}. Move that out first if the account is really empty.`
                    : 'Keeps its history but hides it from lists and pickers.'}
              </p>
            </div>
            <button type="button" onClick={toggleClosed} disabled={busy} className="btn btn-secondary btn-sm shrink-0">
              {account.closed ? 'Reopen' : 'Close'}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-on-surface">Delete account</p>
              <p className="text-label-md text-on-surface-variant">Removes the account and all its transactions.</p>
            </div>
            {confirmDelete ? (
              <button type="button" onClick={doDelete} disabled={busy} className="btn btn-danger btn-sm shrink-0">
                Delete for good
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn btn-ghost btn-sm shrink-0 text-status-error"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalBackdrop>
  )
}
