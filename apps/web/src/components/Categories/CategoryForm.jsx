import { useState } from 'react'
import EmojiPicker from '../Settings/EmojiPicker'
import { isBudgetParent } from '../../lib/categories'

export default function CategoryForm({
  initial,
  parents,
  onSubmit,
  onCancel,
  submitLabel,
  showType = true,
  allowParentChange = true,
  addRole,
}) {
  const [name, setName] = useState(initial?.name || '')
  const [emoji, setEmoji] = useState(initial?.emoji || '📁')
  const [type, setType] = useState(initial?.type || 'expense')
  const [parentId, setParentId] = useState(initial?.parentId || '')
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isSystemEdit = Boolean(initial?.id && isBudgetParent(initial))
  const parentLabel =
    addRole === 'group'
      ? 'Budget parent'
      : addRole === 'category'
        ? 'Group'
        : 'Parent group'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (addRole === 'group' && !parentId) {
      setError('Choose a budget parent for this group')
      return
    }
    if (addRole === 'category' && !parentId) {
      setError('Choose a group for this category')
      return
    }
    setSaving(true)
    setError(null)
    const result = await onSubmit({
      name: name.trim(),
      emoji,
      type,
      parentId: parentId || null,
    })
    setSaving(false)
    if (!result?.success) {
      setError(result?.error || 'Could not save category')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-space-md rounded-lg border border-border-hairline bg-surface-container p-space-md"
    >
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
          <label className="mb-1 block text-label-sm text-on-surface-variant">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={addRole === 'group' ? 'Group name' : 'Category name'}
            disabled={isSystemEdit}
            className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface outline-none focus:border-cool-blue disabled:opacity-60"
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
        {allowParentChange && !isSystemEdit && (
          <div className="min-w-[10rem] flex-1">
            <label className="mb-1 block text-label-sm text-on-surface-variant">
              {parentLabel}
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              required={addRole === 'group' || addRole === 'category'}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
            >
              {!addRole && <option value="">None (top-level)</option>}
              {(addRole === 'group' || addRole === 'category') && (
                <option value="" disabled>
                  Select…
                </option>
              )}
              {parents
                .filter((p) => p.id !== initial?.id && p.type === type)
                .map((p) => (
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
          disabled={saving || isSystemEdit}
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
