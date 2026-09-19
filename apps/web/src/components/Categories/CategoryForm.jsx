import { useState } from 'react'
import EmojiPicker from '../Settings/EmojiPicker'

/**
 * @param {'group' | 'category' | 'edit'} [role]
 *   group    — create a top-level parent group (no parent picker)
 *   category — create a subcategory (or standalone leaf); parent optional/required
 *   edit     — edit existing
 */
export default function CategoryForm({
  initial,
  parents,
  onSubmit,
  onCancel,
  submitLabel,
  showType = true,
  allowParentChange = true,
  role = 'edit',
  requireParent = false,
}) {
  const isGroup = role === 'group'
  const [name, setName] = useState(initial?.name || '')
  const [emoji, setEmoji] = useState(
    initial?.emoji || (isGroup ? '📂' : '📁')
  )
  const [type, setType] = useState(initial?.type || 'expense')
  const [parentId, setParentId] = useState(initial?.parentId || '')
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (requireParent && !parentId) {
      setError('Choose a parent group')
      return
    }
    setSaving(true)
    setError(null)
    const result = await onSubmit({
      name: name.trim(),
      emoji,
      type,
      parentId: isGroup ? null : parentId || null,
    })
    setSaving(false)
    if (!result?.success) {
      setError(result?.error || 'Could not save category')
    }
  }

  const parentOptions = parents.filter(
    (p) => p.id !== initial?.id && p.type === type && !p.parentId
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-space-md rounded-lg border border-border-hairline bg-surface-container p-space-md"
    >
      {isGroup && (
        <p className="text-label-md text-on-surface-variant">
          Groups organize subcategories (like Food & Dining). You can add
          subcategories right after creating the group.
        </p>
      )}
      {role === 'category' && requireParent && (
        <p className="text-label-md text-on-surface-variant">
          Subcategories are what you budget and assign transactions to.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-space-md">
        <div>
          <label className="mb-1 block text-label-sm text-on-surface-variant">Emoji</label>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="flex h-10 w-12 items-center justify-center rounded-lg border border-border-hairline bg-surface text-xl hover:bg-surface-container-high"
            aria-label="Choose emoji"
          >
            {emoji}
          </button>
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-label-sm text-on-surface-variant">
            {isGroup ? 'Group name' : 'Name'}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isGroup ? 'e.g. Healthcare' : 'e.g. Groceries'}
            className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface outline-none focus:border-cool-blue"
            autoFocus
          />
        </div>
        {showType && (
          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={Boolean(initial?.id)}
              className="rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        )}
        {!isGroup && allowParentChange && (
          <div className="min-w-[10rem] flex-1">
            <label className="mb-1 block text-label-sm text-on-surface-variant">
              Parent group
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
              required={requireParent}
            >
              {!requireParent && (
                <option value="">None (top-level category)</option>
              )}
              {requireParent && (
                <option value="" disabled>
                  Select a group…
                </option>
              )}
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {showPicker && (
        <EmojiPicker
          value={emoji}
          onChange={(next) => {
            setEmoji(next)
            setShowPicker(false)
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {error && <p className="text-body-sm text-status-error">{error}</p>}

      <div className="flex flex-wrap gap-space-sm">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-space-md py-space-sm text-body-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border-hairline px-space-md py-space-sm text-body-sm text-on-surface-variant hover:bg-surface-container-high"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
