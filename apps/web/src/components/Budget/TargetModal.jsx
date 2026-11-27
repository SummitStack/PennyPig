import { ModalBackdrop, modalPanel } from '../ui/Modal'
import { useState } from 'react'
import Icon from '../ui/Icon'

export default function TargetModal({ category, target, onSave, onClear, onClose }) {
  const [targetType, setTargetType] = useState(target?.targetType || 'monthly')
  const [amount, setAmount] = useState(target?.amount ? String(target.amount) : '')
  const [targetDate, setTargetDate] = useState(target?.targetDate || '')
  const [repeatMonths, setRepeatMonths] = useState(target?.repeatMonths ? String(target.repeatMonths) : '')
  const [percent, setPercent] = useState(target?.percent != null ? String(target.percent) : '25')
  const [percentOf, setPercentOf] = useState(target?.percentOf || 'gig')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await onSave({
      targetType,
      amount: targetType === 'percent_income' ? 0 : parseFloat(amount) || 0,
      targetDate: targetType === 'by_date' ? targetDate : null,
      repeatMonths: targetType === 'by_date' && repeatMonths ? parseInt(repeatMonths, 10) : null,
      percent: targetType === 'percent_income' ? parseFloat(percent) || 0 : null,
      percentOf: targetType === 'percent_income' ? percentOf : null,
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
    <ModalBackdrop onClose={onClose}>
      <div
        className={`w-full max-w-sm ${modalPanel} p-space-md `}
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
              <option value="percent_income">Percent of income</option>
            </select>
          </div>

          {targetType === 'percent_income' ? (
            <div className="flex gap-2">
              <div className="w-24">
                <label className="mb-1 block text-label-sm text-on-surface-variant" htmlFor="target-percent">
                  Percent
                </label>
                <input
                  id="target-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  className="w-full rounded-lg border border-border-hairline bg-surface px-space-sm py-1.5 text-body-sm text-on-surface"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-label-sm text-on-surface-variant" htmlFor="target-percent-of">
                  Of
                </label>
                <select
                  id="target-percent-of"
                  value={percentOf}
                  onChange={(e) => setPercentOf(e.target.value)}
                  className="w-full rounded-lg border border-border-hairline bg-surface px-space-sm py-1.5 text-body-sm text-on-surface"
                >
                  <option value="gig">Gig income</option>
                  <option value="all">All income</option>
                </select>
              </div>
            </div>
          ) : (
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
          )}

          {targetType === 'percent_income' && (
            <p className="text-label-sm text-on-surface-variant">
              Good for quarterly taxes on gig pay. The target grows with what you earn each month.
            </p>
          )}

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
              <label className="mb-1 mt-2 block text-label-sm text-on-surface-variant" htmlFor="target-repeat">
                Repeat
              </label>
              <select
                id="target-repeat"
                value={repeatMonths}
                onChange={(e) => setRepeatMonths(e.target.value)}
                className="w-full rounded-lg border border-border-hairline bg-surface px-space-sm py-1.5 text-body-sm text-on-surface"
              >
                <option value="">Once</option>
                <option value="1">Every month</option>
                <option value="3">Every 3 months</option>
                <option value="6">Every 6 months</option>
                <option value="12">Every year</option>
              </select>
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
    </ModalBackdrop>
  )
}
