import { useState } from 'react'
import Icon from '../ui/Icon'

export default function TargetModal({ category, target, onSave, onClear, onClose }) {
  const [targetType, setTargetType] = useState(target?.targetType || 'monthly')
  const [amount, setAmount] = useState(target?.amount ? String(target.amount) : '')
  const [targetDate, setTargetDate] = useState(target?.targetDate || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await onSave({
      targetType,
      amount: parseFloat(amount) || 0,
      targetDate: targetType === 'by_date' ? targetDate : null,
    })
    setSaving(false)
    if (result?.success) onClose()
    else setError(result?.error || 'Could not save target')
  }

  const handleClear = async () => {
    setSaving(true)
    setError(null)
    const result = await onClear()
    setSaving(false)
    if (result?.success) onClose()
    else setError(result?.error || 'Could not clear target')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4">
      <div
        className="w-full max-w-sm rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-lg"
        role="dialog"
        aria-labelledby="target-modal-title"
      >
        <div className="mb-space-sm flex items-center justify-between">
          <h3 id="target-modal-title" className="text-body-md font-bold text-on-surface">
            Target — {category?.emoji} {category?.name}
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

        <form onSubmit={handleSave} className="space-y-space-sm">
          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">Type</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-sm py-1.5 text-body-sm text-on-surface"
            >
              <option value="monthly">Monthly</option>
              <option value="by_date">By date</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-sm py-1.5 text-body-sm text-on-surface"
              required
            />
          </div>

          {targetType === 'by_date' && (
            <div>
              <label className="mb-1 block text-label-sm text-on-surface-variant">
                Target date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-border-hairline bg-surface px-space-sm py-1.5 text-body-sm text-on-surface"
                required
              />
            </div>
          )}

          {error && <p className="text-label-sm text-status-error">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-sage-accent px-space-sm py-1.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {target && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="rounded-lg border border-border-hairline px-space-sm py-1.5 text-label-md text-on-surface-variant hover:bg-surface-container"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border-hairline px-space-sm py-1.5 text-label-md text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
