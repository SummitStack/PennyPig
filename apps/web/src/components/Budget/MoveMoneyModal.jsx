import { useEffect, useMemo, useState } from 'react'
import Icon from '../ui/Icon'

export default function MoveMoneyModal({
  categories,
  coverPreset,
  onMove,
  onCover,
  onClose,
}) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState(coverPreset?.toCategoryId || '')
  const [amount, setAmount] = useState(
    coverPreset?.amount ? String(Math.abs(coverPreset.amount)) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isCover = Boolean(coverPreset?.toCategoryId)

  useEffect(() => {
    if (coverPreset?.toCategoryId) {
      setToId(coverPreset.toCategoryId)
      setAmount(String(Math.abs(coverPreset.amount || 0)))
    }
  }, [coverPreset])

  const options = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        label: `${c.emoji || '📁'} ${c.name}`,
      })),
    [categories]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    const value = parseFloat(amount) || 0
    if (!fromId || !toId || value <= 0) {
      setError('Pick categories and enter an amount')
      return
    }
    setSaving(true)
    setError(null)
    const result = isCover
      ? await onCover(toId, fromId)
      : await onMove(fromId, toId, value)
    setSaving(false)
    if (result?.success) onClose()
    else setError(result?.error || 'Move failed')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-lg"
        role="dialog"
        aria-labelledby="move-money-title"
      >
        <div className="mb-space-sm flex items-center justify-between">
          <h3 id="move-money-title" className="text-body-md font-bold text-on-surface">
            {isCover ? 'Cover overspending' : 'Move money'}
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

        <form onSubmit={handleSubmit} className="space-y-space-sm">
          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">
              {isCover ? 'Cover from' : 'From category'}
            </label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-sm py-1.5 text-body-sm text-on-surface"
              required
            >
              <option value="">Select…</option>
              {options
                .filter((o) => o.id !== toId)
                .map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
            </select>
          </div>

          {!isCover && (
            <div>
              <label className="mb-1 block text-label-sm text-on-surface-variant">
                To category
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full rounded-lg border border-border-hairline bg-surface px-space-sm py-1.5 text-body-sm text-on-surface"
                required
              >
                <option value="">Select…</option>
                {options
                  .filter((o) => o.id !== fromId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
              </select>
            </div>
          )}

          {isCover && coverPreset?.categoryName && (
            <p className="text-body-sm text-on-surface-variant">
              Covering <span className="font-medium text-on-surface">{coverPreset.categoryName}</span>
            </p>
          )}

          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              readOnly={isCover}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-sm py-1.5 text-body-sm text-on-surface disabled:opacity-70"
              required
            />
          </div>

          {error && <p className="text-label-sm text-status-error">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-sage-accent px-space-sm py-1.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
            >
              {saving ? 'Saving…' : isCover ? 'Cover' : 'Move'}
            </button>
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
