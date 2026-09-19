import { useEffect, useState } from 'react'
import { useTransactionStore } from '../../store/transactionStore'
import { buildCategoryTree, getRootCategories } from '../../lib/categories'
import Icon from '../ui/Icon'
import EmojiPicker from './EmojiPicker'

function CategoryForm({
  initial,
  parents,
  onSubmit,
  onCancel,
  submitLabel,
}) {
  const [name, setName] = useState(initial?.name || '')
  const [emoji, setEmoji] = useState(initial?.emoji || '📁')
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
      return
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-space-md rounded-lg border border-border-hairline bg-surface p-space-md"
    >
      <div className="flex flex-wrap items-end gap-space-md">
        <div>
          <label className="mb-1 block text-label-sm text-on-surface-variant">Emoji</label>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="flex h-10 w-12 items-center justify-center rounded-lg border border-border-hairline bg-surface-container text-xl hover:bg-surface-container-high"
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
            placeholder="Category name"
            className="w-full rounded-lg border border-border-hairline bg-surface-container px-space-md py-space-sm text-on-surface outline-none focus:border-cool-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-label-sm text-on-surface-variant">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={Boolean(initial?.id)}
            className="rounded-lg border border-border-hairline bg-surface-container px-space-md py-space-sm text-on-surface"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="mb-1 block text-label-sm text-on-surface-variant">Parent group</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-lg border border-border-hairline bg-surface-container px-space-md py-space-sm text-on-surface"
          >
            <option value="">None (top-level)</option>
            {parents
              .filter((p) => p.id !== initial?.id && p.type === type)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
          </select>
        </div>
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

      <div className="flex gap-space-sm">
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
          className="rounded-lg border border-border-hairline px-space-md py-space-sm text-body-sm text-on-surface-variant hover:bg-surface-container"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function CategoryManager() {
  const categories = useTransactionStore((state) => state.categories)
  const loadData = useTransactionStore((state) => state.loadData)
  const createCategory = useTransactionStore((state) => state.createCategory)
  const updateCategory = useTransactionStore((state) => state.updateCategory)
  const deleteCategory = useTransactionStore((state) => state.deleteCategory)
  const hydrated = useTransactionStore((state) => state.hydrated)

  const [mode, setMode] = useState(null) // 'add' | 'edit' | null
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState(null)
  const [defaultParentId, setDefaultParentId] = useState(null)

  useEffect(() => {
    if (!hydrated) loadData()
  }, [hydrated, loadData])

  const expenseTree = buildCategoryTree(categories, 'expense')
  const incomeRoots = getRootCategories(categories).filter((c) => c.type === 'income')
  const parents = getRootCategories(categories)

  const openAdd = (parentId = null) => {
    setEditing(parentId ? { parentId, type: 'expense', emoji: '📁' } : null)
    setDefaultParentId(parentId)
    setMode('add')
    setMessage(null)
  }

  const openEdit = (cat) => {
    setEditing(cat)
    setMode('edit')
    setMessage(null)
  }

  const handleCreate = async (values) => {
    const result = await createCategory({
      ...values,
      parentId: values.parentId ?? defaultParentId,
    })
    if (result.success) {
      setMode(null)
      setEditing(null)
      setMessage('Category added')
    }
    return result
  }

  const handleUpdate = async (values) => {
    const result = await updateCategory(editing.id, values)
    if (result.success) {
      setMode(null)
      setEditing(null)
      setMessage('Category updated')
    }
    return result
  }

  const handleDelete = async (cat) => {
    if (
      !window.confirm(
        `Remove “${cat.name}”? Transactions keep their history; this category will be unassigned.`
      )
    ) {
      return
    }
    const result = await deleteCategory(cat.id)
    if (!result.success) {
      setMessage(result.error)
      return
    }
    setMessage(`Removed ${cat.name}`)
  }

  const renderRow = (cat, depth) => (
    <div
      key={cat.id}
      className={`flex items-center justify-between gap-space-md border-b border-border-hairline py-space-sm ${
        depth > 0 ? 'pl-8' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-space-sm">
        <span className="text-xl leading-none">{cat.emoji || '📁'}</span>
        <div className="min-w-0">
          <div className={`truncate text-on-surface ${depth === 0 ? 'font-semibold' : ''}`}>
            {cat.name}
          </div>
          <div className="text-label-sm text-on-surface-variant">
            {cat.type}
            {cat.custom ? ' · custom' : ''}
            {depth === 0 && cat.children?.length
              ? ` · ${cat.children.length} subcategories`
              : ''}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {depth === 0 && cat.type === 'expense' && (
          <button
            type="button"
            onClick={() => openAdd(cat.id)}
            className="rounded-md p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            title="Add subcategory"
            aria-label={`Add subcategory under ${cat.name}`}
          >
            <Icon name="add" className="text-[18px]" />
          </button>
        )}
        <button
          type="button"
          onClick={() => openEdit(cat)}
          className="rounded-md p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          title="Edit"
          aria-label={`Edit ${cat.name}`}
        >
          <Icon name="edit" className="text-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => handleDelete(cat)}
          className="rounded-md p-2 text-on-surface-variant hover:bg-status-error/10 hover:text-status-error"
          title="Delete"
          aria-label={`Delete ${cat.name}`}
        >
          <Icon name="delete" className="text-[18px]" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-space-md">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <p className="text-body-sm text-on-surface-variant">
          Groups roll up on the budget. Subcategories hold the amounts you assign.
        </p>
        <button
          type="button"
          onClick={() => openAdd(null)}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-space-md py-space-sm text-body-sm font-semibold text-on-primary"
        >
          <Icon name="add" className="text-[16px]" />
          Add category
        </button>
      </div>

      {message && (
        <p className="text-body-sm text-sage-accent">{message}</p>
      )}

      {mode === 'add' && (
        <CategoryForm
          initial={
            editing || {
              emoji: '📁',
              type: 'expense',
              parentId: defaultParentId,
            }
          }
          parents={parents}
          onSubmit={handleCreate}
          onCancel={() => {
            setMode(null)
            setEditing(null)
          }}
          submitLabel="Add category"
        />
      )}

      {mode === 'edit' && editing && (
        <CategoryForm
          initial={editing}
          parents={parents}
          onSubmit={handleUpdate}
          onCancel={() => {
            setMode(null)
            setEditing(null)
          }}
          submitLabel="Save changes"
        />
      )}

      <div className="rounded-lg border border-border-hairline bg-surface">
        <div className="border-b border-border-hairline px-space-md py-space-sm text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          Expenses
        </div>
        <div className="px-space-md">
          {expenseTree.length === 0 && (
            <p className="py-space-md text-body-sm text-on-surface-variant">
              No expense categories yet.
            </p>
          )}
          {expenseTree.map((root) => (
            <div key={root.id}>
              {renderRow({ ...root, children: root.children }, 0)}
              {root.children.map((child) => renderRow(child, 1))}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border-hairline bg-surface">
        <div className="border-b border-border-hairline px-space-md py-space-sm text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">
          Income
        </div>
        <div className="px-space-md">
          {incomeRoots.length === 0 && (
            <p className="py-space-md text-body-sm text-on-surface-variant">
              No income categories yet.
            </p>
          )}
          {incomeRoots.map((root) => renderRow(root, 0))}
        </div>
      </div>
    </div>
  )
}
