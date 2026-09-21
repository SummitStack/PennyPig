import { useMemo, useState } from 'react'
import EmojiPicker from '../Settings/EmojiPicker'
import { isBudgetParent } from '../../lib/categories'
import {
  INCOME_GROUP_SENTINEL,
  suggestedGroupsForParent,
  suggestedLeavesForParent,
} from '../../lib/budgetCatalog'

const CUSTOM_NAME = '__custom__'

export default function CategoryForm({
  initial,
  parents,
  categories = [],
  onSubmit,
  onCancel,
  submitLabel,
  showType = true,
  allowParentChange = true,
  addRole,
  includeIncomeGroup = false,
}) {
  const [name, setName] = useState(initial?.name || '')
  const [nameMode, setNameMode] = useState(() => {
    if (!initial?.name) return ''
    return CUSTOM_NAME
  })
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

  const parentOptions = useMemo(() => {
    const list = (parents || []).filter((p) => p.id !== initial?.id)
    if (addRole === 'category' && includeIncomeGroup) {
      return [
        ...list.filter((p) => p.type !== 'income'),
        {
          id: INCOME_GROUP_SENTINEL,
          name: 'Income',
          emoji: '💰',
          type: 'income',
        },
      ]
    }
    if (showType) {
      return list.filter((p) => p.type === type)
    }
    return list
  }, [parents, initial?.id, addRole, includeIncomeGroup, showType, type])

  const selectedParent = parentOptions.find((p) => p.id === parentId)
  const isIncomeGroup = parentId === INCOME_GROUP_SENTINEL || selectedParent?.type === 'income'

  const nameSuggestions = useMemo(() => {
    if (addRole === 'group') {
      const parent = parents?.find((p) => p.id === parentId)
      return suggestedGroupsForParent(parent?.name)
    }
    if (addRole === 'category' || !addRole) {
      return suggestedLeavesForParent(categories, parentId)
    }
    return []
  }, [addRole, parents, parentId, categories])

  const handleParentChange = (nextParentId) => {
    setParentId(nextParentId)
    setNameMode('')
    setName('')
    if (nextParentId === INCOME_GROUP_SENTINEL) {
      setType('income')
    } else if (addRole === 'category') {
      setType('expense')
    }
  }

  const handleNameModeChange = (value) => {
    setNameMode(value)
    if (value === CUSTOM_NAME) {
      setName('')
    } else if (value) {
      setName(value)
    } else {
      setName('')
    }
  }

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

    const submitType = isIncomeGroup ? 'income' : type
    const submitParentId =
      parentId === INCOME_GROUP_SENTINEL ? null : parentId || null

    const result = await onSubmit({
      name: name.trim(),
      emoji,
      type: submitType,
      parentId: submitParentId,
    })
    setSaving(false)
    if (!result?.success) {
      setError(result?.error || 'Could not save category')
    }
  }

  const showParentSelect = allowParentChange && !isSystemEdit
  const showNamePicker = Boolean(addRole) && nameSuggestions.length > 0 && !initial?.id

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

        {showParentSelect && (
          <div className="min-w-[10rem] flex-1">
            <label className="mb-1 block text-label-sm text-on-surface-variant">
              {parentLabel}
            </label>
            <select
              value={parentId}
              onChange={(e) => handleParentChange(e.target.value)}
              required={addRole === 'group' || addRole === 'category'}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
            >
              {!addRole && <option value="">None (top-level)</option>}
              {(addRole === 'group' || addRole === 'category') && (
                <option value="" disabled>
                  Select…
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

        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-label-sm text-on-surface-variant">Name</label>
          {showNamePicker ? (
            <div className="space-y-space-sm">
              <select
                value={nameMode}
                onChange={(e) => handleNameModeChange(e.target.value)}
                className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
              >
                <option value="" disabled>
                  Select {addRole === 'group' ? 'group' : 'category'}…
                </option>
                {nameSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion}>
                    {suggestion}
                  </option>
                ))}
                <option value={CUSTOM_NAME}>Custom name…</option>
              </select>
              {nameMode === CUSTOM_NAME && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    addRole === 'group' ? 'Custom group name' : 'Custom category name'
                  }
                  disabled={isSystemEdit}
                  className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface outline-none focus:border-cool-blue disabled:opacity-60"
                />
              )}
            </div>
          ) : (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={addRole === 'group' ? 'Group name' : 'Category name'}
              disabled={isSystemEdit}
              className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface outline-none focus:border-cool-blue disabled:opacity-60"
            />
          )}
        </div>

        {showType && !isIncomeGroup && (
          <div>
            <label className="mb-1 block text-label-sm text-on-surface-variant">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={Boolean(initial?.id) || Boolean(addRole)}
              className="rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
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
