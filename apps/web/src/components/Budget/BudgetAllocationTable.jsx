import { useMemo, useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { useTransactionStore } from '../../store/transactionStore'
import {
  buildCategoryTree,
  getRootCategories,
  isParentCategory,
} from '../../lib/categories'
import CategoryForm from '../Categories/CategoryForm'
import Icon from '../ui/Icon'

function statusDot(budgeted, activity) {
  if (budgeted === 0 && activity === 0) return 'bg-outline-variant'
  if (activity > budgeted) return 'bg-status-error'
  if (budgeted > 0 && activity / budgeted > 0.85) return 'bg-status-warning'
  return 'bg-status-success'
}

function statusText(budgeted, activity) {
  if (activity > budgeted) return 'text-status-error'
  if (budgeted > 0 && activity / budgeted > 0.85) return 'text-status-warning'
  if (budgeted === 0) return 'text-on-surface-variant'
  return 'text-status-success'
}

function MoneyCell({
  categoryId,
  budgeted,
  editable,
  editingCell,
  editValue,
  setEditingCell,
  setEditValue,
  onSave,
}) {
  if (!editable) {
    return (
      <span className="text-body-sm font-semibold text-on-surface">
        ${budgeted.toFixed(0)}
      </span>
    )
  }

  if (editingCell === categoryId) {
    return (
      <input
        autoFocus
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => onSave(categoryId)}
        onKeyDown={(e) => e.key === 'Enter' && onSave(categoryId)}
        className="w-20 rounded border border-cool-blue bg-surface-base px-1 py-0.5 text-center text-body-sm font-medium text-on-surface outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setEditingCell(categoryId)
        setEditValue(String(budgeted))
      }}
      className="inline-flex cursor-text items-center rounded border border-transparent px-1.5 py-0.5 text-body-sm font-medium text-on-surface hover:border-border-hairline hover:bg-surface-container"
    >
      <span>${budgeted.toFixed(0)}</span>
    </button>
  )
}

function CategoryRow({
  category,
  depth,
  isGroup,
  expanded,
  onToggleExpand,
  budgeted,
  activity,
  editingCell,
  editValue,
  setEditingCell,
  setEditValue,
  onSaveBudget,
  manageMode,
  onEditCategory,
  onAddChild,
  draggingId,
  dropHint,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) {
  const available = budgeted - activity
  const pad = depth === 0 ? '' : 'pl-5'
  const isDragging = draggingId === category.id
  const showBefore = dropHint?.id === category.id && dropHint.position === 'before'
  const showAfter = dropHint?.id === category.id && dropHint.position === 'after'
  const showInto = dropHint?.id === category.id && dropHint.position === 'into'

  return (
    <div
      className={`group relative py-1 ${isGroup ? 'bg-surface-container/40' : ''} ${
        isDragging ? 'opacity-40' : ''
      } ${showInto ? 'ring-1 ring-inset ring-cool-blue/60 bg-cool-blue/10' : ''}`}
      onDragOver={(e) => onDragOver(e, category, isGroup)}
      onDragLeave={() => onDragLeave(category.id)}
      onDrop={(e) => onDrop(e, category)}
    >
      {showBefore && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-cool-blue" />
      )}
      {showAfter && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-0.5 bg-cool-blue" />
      )}

      <div className="grid grid-cols-12 items-center">
        <div className={`col-span-5 flex min-w-0 items-center gap-0.5 ${pad}`}>
          {manageMode ? (
            <span
              draggable
              onDragStart={(e) => onDragStart(e, category)}
              onDragEnd={onDragEnd}
              className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-on-surface-variant active:cursor-grabbing hover:bg-surface-container hover:text-on-surface"
              title="Drag to reorder"
              aria-label={`Drag ${category.name}`}
              role="button"
              tabIndex={0}
            >
              <Icon name="menu" className="text-[16px]" />
            </span>
          ) : (
            <span className="w-6" />
          )}

          {isGroup ? (
            <button
              type="button"
              onClick={() => onToggleExpand(category.id)}
              className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              aria-label={expanded ? 'Collapse group' : 'Expand group'}
            >
              <Icon
                name={expanded ? 'expand_more' : 'chevron_right'}
                className="text-[18px]"
              />
            </button>
          ) : (
            <span className="w-6" />
          )}

          <span className="text-sm leading-none" aria-hidden>
            {category.emoji || '📁'}
          </span>

          {manageMode ? (
            <button
              type="button"
              onClick={() => onEditCategory(category)}
              className={`min-w-0 truncate rounded px-1 text-left text-body-sm hover:bg-surface-container ${
                isGroup
                  ? 'font-bold uppercase tracking-wide text-on-surface'
                  : 'font-medium text-on-surface'
              }`}
              title="Edit category"
            >
              {category.name}
            </button>
          ) : (
            <span
              className={`min-w-0 truncate text-body-sm ${
                isGroup
                  ? 'font-bold uppercase tracking-wide text-on-surface'
                  : 'font-medium text-on-surface'
              }`}
            >
              {category.name}
            </span>
          )}

          {manageMode && isGroup && (
            <button
              type="button"
              onClick={() => onAddChild(category.id)}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              title="Add subcategory"
              aria-label={`Add subcategory under ${category.name}`}
            >
              <Icon name="add" className="text-[14px]" />
            </button>
          )}
        </div>

        <div className="col-span-2 text-center">
          <MoneyCell
            categoryId={category.id}
            budgeted={budgeted}
            editable={!isGroup}
            editingCell={editingCell}
            editValue={editValue}
            setEditingCell={setEditingCell}
            setEditValue={setEditValue}
            onSave={onSaveBudget}
          />
        </div>
        <div className="col-span-2 text-center text-body-sm text-on-surface-variant">
          ${activity.toFixed(0)}
        </div>
        <div
          className={`col-span-3 flex items-center justify-end gap-1 text-right text-body-sm font-medium ${statusText(
            budgeted,
            activity
          )}`}
        >
          <span>
            {available < 0 ? '-' : ''}${Math.abs(available).toFixed(0)}
          </span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${statusDot(budgeted, activity)} ${
              available < 0 ? 'animate-pulse' : ''
            }`}
          />
        </div>
      </div>
    </div>
  )
}

export default function BudgetAllocationTable() {
  const categories = useTransactionStore((state) => state.categories)
  const createCategory = useTransactionStore((state) => state.createCategory)
  const updateCategory = useTransactionStore((state) => state.updateCategory)
  const deleteCategory = useTransactionStore((state) => state.deleteCategory)
  const relocateCategory = useTransactionStore((state) => state.relocateCategory)

  const updateBudget = useBudgetStore((state) => state.updateBudget)
  const getBudgetedFor = useBudgetStore((state) => state.getBudgetedFor)
  const getActivityFor = useBudgetStore((state) => state.getActivityFor)
  const getTotalBudgeted = useBudgetStore((state) => state.getTotalBudgeted)
  const getTotalActivity = useBudgetStore((state) => state.getTotalActivity)
  const expandedGroups = useBudgetStore((state) => state.expandedGroups)
  const toggleGroup = useBudgetStore((state) => state.toggleGroup)

  const tree = buildCategoryTree(categories, 'expense')
  const parents = useMemo(
    () => getRootCategories(categories).filter((c) => c.type === 'expense'),
    [categories]
  )

  const [manageMode, setManageMode] = useState(false)
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [panel, setPanel] = useState(null)
  const [flash, setFlash] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [dropHint, setDropHint] = useState(null) // { id, position }

  const handleSaveBudget = async (categoryId) => {
    const amount = parseFloat(editValue) || 0
    await updateBudget(categoryId, amount)
    setEditingCell(null)
  }

  const handleDragStart = (e, category) => {
    if (!manageMode) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', category.id)
    setDraggingId(category.id)
  }

  const handleDragOver = (e, category, isGroup) => {
    if (!manageMode || !draggingId || draggingId === category.id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const ratio = y / rect.height

    let position = 'before'
    if (isGroup && ratio > 0.28 && ratio < 0.72) {
      position = 'into'
    } else if (ratio > 0.5) {
      position = 'after'
    }

    setDropHint((prev) =>
      prev?.id === category.id && prev?.position === position
        ? prev
        : { id: category.id, position }
    )
  }

  const handleDragLeave = (categoryId) => {
    setDropHint((prev) => (prev?.id === categoryId ? null : prev))
  }

  const handleDrop = async (e, category) => {
    e.preventDefault()
    if (!manageMode) return
    const dragId = e.dataTransfer.getData('text/plain') || draggingId
    const position = dropHint?.id === category.id ? dropHint.position : 'before'
    setDropHint(null)
    setDraggingId(null)
    if (!dragId || dragId === category.id) return

    const result = await relocateCategory(dragId, category.id, position)
    if (!result.success) setFlash(result.error)
    else {
      setFlash(null)
      if (position === 'into') {
        useBudgetStore.setState((state) => ({
          expandedGroups: { ...state.expandedGroups, [category.id]: true },
        }))
      }
    }
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDropHint(null)
  }

  const handleCreate = async (values) => {
    const result = await createCategory({
      ...values,
      type: 'expense',
      parentId: values.parentId ?? panel?.parentId ?? null,
    })
    if (result.success) {
      setPanel(null)
      setFlash('Category added')
      if (result.category?.parentId) {
        useBudgetStore.setState((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [result.category.parentId]: true,
          },
        }))
      }
    }
    return result
  }

  const handleUpdate = async (values) => {
    const result = await updateCategory(panel.category.id, values)
    if (result.success) {
      setPanel(null)
      setFlash('Category updated')
    }
    return result
  }

  const handleDeleteFromEdit = async () => {
    if (!panel?.category) return
    if (
      !window.confirm(
        `Remove “${panel.category.name}”? Transactions keep their history; this category will be unassigned.`
      )
    ) {
      return
    }
    const result = await deleteCategory(panel.category.id)
    if (!result.success) {
      setFlash(result.error)
      return
    }
    setPanel(null)
    setFlash(`Removed ${panel.category.name}`)
  }

  const exitManageMode = () => {
    setManageMode(false)
    setPanel(null)
    setDraggingId(null)
    setDropHint(null)
  }

  const totalBudgeted = getTotalBudgeted()
  const totalActivity = getTotalActivity()
  const totalAvailable = totalBudgeted - totalActivity

  return (
    <div className="flex flex-col rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm">
      {flash && <p className="mb-2 text-label-md text-sage-accent">{flash}</p>}

      {manageMode && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cool-blue/30 bg-cool-blue/10 px-2 py-1.5">
          <p className="text-label-md text-on-surface">
            Editing categories — drag the ☰ handle to reorder or drop onto a group.
            Click a name to edit.
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setPanel({
                  mode: 'add',
                  parentId: null,
                  category: { emoji: '📁', type: 'expense' },
                })
              }
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-space-sm py-1 text-label-md font-semibold text-on-primary"
            >
              <Icon name="add" className="text-[14px]" />
              Add category
            </button>
            <button
              type="button"
              onClick={exitManageMode}
              className="rounded-lg border border-border-hairline px-space-sm py-1 text-label-md text-on-surface hover:bg-surface-container"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {panel && manageMode && (
        <div className="mb-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-body-md font-bold text-on-surface">
              {panel.mode === 'add' ? 'Add category' : `Edit ${panel.category?.name}`}
            </h3>
            {panel.mode === 'edit' && (
              <button
                type="button"
                onClick={handleDeleteFromEdit}
                className="inline-flex items-center gap-1 rounded-lg px-space-sm py-0.5 text-label-md text-status-error hover:bg-status-error/10"
              >
                <Icon name="delete" className="text-[14px]" />
                Delete
              </button>
            )}
          </div>
          <CategoryForm
            key={panel.category?.id || `add-${panel.parentId || 'root'}`}
            initial={
              panel.mode === 'edit'
                ? panel.category
                : {
                    emoji: '📁',
                    type: 'expense',
                    parentId: panel.parentId,
                  }
            }
            parents={parents}
            showType={false}
            onSubmit={panel.mode === 'add' ? handleCreate : handleUpdate}
            onCancel={() => setPanel(null)}
            submitLabel={panel.mode === 'add' ? 'Add category' : 'Save changes'}
          />
        </div>
      )}

      <div className="grid grid-cols-12 border-b border-border-hairline pb-1.5 text-label-sm font-semibold tracking-wide text-on-surface-variant">
        <div className="col-span-5 flex items-center gap-1">
          <span>CATEGORY</span>
          <button
            type="button"
            onClick={() => (manageMode ? exitManageMode() : setManageMode(true))}
            className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
              manageMode
                ? 'bg-cool-blue/20 text-cool-blue'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
            title={manageMode ? 'Done editing categories' : 'Edit categories'}
            aria-label={manageMode ? 'Done editing categories' : 'Edit categories'}
            aria-pressed={manageMode}
          >
            <Icon name="edit" className="text-[14px]" />
          </button>
        </div>
        <div className="col-span-2 text-center">BUDGETED</div>
        <div className="col-span-2 text-center">ACTIVITY</div>
        <div className="col-span-3 text-right">AVAILABLE</div>
      </div>

      <div className="flex flex-col divide-y divide-border-hairline/60">
        {tree.length === 0 && (
          <p className="py-space-md text-body-sm text-on-surface-variant">
            No categories yet. Use the pencil next to Category to add some.
          </p>
        )}
        {tree.map((root) => {
          const hasChildren = isParentCategory(categories, root.id)
          const expanded = expandedGroups[root.id] !== false

          return (
            <div key={root.id}>
              <CategoryRow
                category={root}
                depth={0}
                isGroup={hasChildren}
                expanded={expanded}
                onToggleExpand={toggleGroup}
                budgeted={getBudgetedFor(root.id)}
                activity={getActivityFor(root.id)}
                editingCell={editingCell}
                editValue={editValue}
                setEditingCell={setEditingCell}
                setEditValue={setEditValue}
                onSaveBudget={handleSaveBudget}
                manageMode={manageMode}
                onEditCategory={(cat) => setPanel({ mode: 'edit', category: cat })}
                onAddChild={(parentId) =>
                  setPanel({
                    mode: 'add',
                    parentId,
                    category: { emoji: '📁', type: 'expense', parentId },
                  })
                }
                draggingId={draggingId}
                dropHint={dropHint}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
              {hasChildren &&
                expanded &&
                root.children.map((child) => (
                  <CategoryRow
                    key={child.id}
                    category={child}
                    depth={1}
                    isGroup={false}
                    expanded={false}
                    onToggleExpand={toggleGroup}
                    budgeted={getBudgetedFor(child.id)}
                    activity={getActivityFor(child.id)}
                    editingCell={editingCell}
                    editValue={editValue}
                    setEditingCell={setEditingCell}
                    setEditValue={setEditValue}
                    onSaveBudget={handleSaveBudget}
                    manageMode={manageMode}
                    onEditCategory={(cat) => setPanel({ mode: 'edit', category: cat })}
                    onAddChild={() => {}}
                    draggingId={draggingId}
                    dropHint={dropHint}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  />
                ))}
            </div>
          )
        })}
      </div>

      <div className="mt-2 grid grid-cols-12 items-center border-t border-border-hairline pt-2 font-bold text-on-surface">
        <div className="col-span-5 text-body-md">TOTALS</div>
        <div className="col-span-2 text-center text-body-md">${totalBudgeted.toFixed(0)}</div>
        <div className="col-span-2 text-center text-body-md text-on-surface-variant">
          ${totalActivity.toFixed(0)}
        </div>
        <div className="col-span-3 text-right text-body-md text-sage-accent">
          ${totalAvailable.toFixed(0)}
        </div>
      </div>
    </div>
  )
}
