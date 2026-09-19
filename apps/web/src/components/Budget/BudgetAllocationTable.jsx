import { useMemo, useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { useTransactionStore } from '../../store/transactionStore'
import {
  buildCategoryTree,
  getRootCategories,
  getChildCategories,
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

function ReorderControls({ canUp, canDown, onUp, onDown }) {
  return (
    <div className="flex items-center text-on-surface-variant opacity-40 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      <span className="flex h-5 w-4 items-center justify-center" aria-hidden title="Reorder">
        <Icon name="drag_indicator" className="text-[14px]" />
      </span>
      <div className="flex flex-col -space-y-1" role="group" aria-label="Reorder category">
        <button
          type="button"
          disabled={!canUp}
          onClick={onUp}
          className="flex h-3 w-4 items-center justify-center rounded-sm hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Move up"
          title="Move up"
        >
          <Icon name="arrow_drop_up" className="text-[16px] leading-none" />
        </button>
        <button
          type="button"
          disabled={!canDown}
          onClick={onDown}
          className="flex h-3 w-4 items-center justify-center rounded-sm hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Move down"
          title="Move down"
        >
          <Icon name="arrow_drop_down" className="text-[16px] leading-none" />
        </button>
      </div>
    </div>
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
  onEdit,
  onAddChild,
  canUp,
  canDown,
  onMoveUp,
  onMoveDown,
}) {
  const available = budgeted - activity
  const pad = depth === 0 ? '' : 'pl-5'

  return (
    <div className={`group py-1 ${isGroup ? 'bg-surface-container/40' : ''}`}>
      <div className="grid grid-cols-12 items-center">
        <div className={`col-span-5 flex min-w-0 items-center gap-0.5 ${pad}`}>
          <ReorderControls
            canUp={canUp}
            canDown={canDown}
            onUp={onMoveUp}
            onDown={onMoveDown}
          />
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
          <span
            className={`min-w-0 truncate text-body-sm ${
              isGroup
                ? 'font-bold uppercase tracking-wide text-on-surface'
                : 'font-medium text-on-surface'
            }`}
          >
            {category.name}
          </span>
          <div className="ml-auto flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            {isGroup && (
              <button
                type="button"
                onClick={() => onAddChild(category.id)}
                className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                title="Add subcategory"
                aria-label={`Add subcategory under ${category.name}`}
              >
                <Icon name="add" className="text-[14px]" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(category)}
              className="flex h-6 w-6 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              title="Edit category"
              aria-label={`Edit ${category.name}`}
            >
              <Icon name="edit" className="text-[14px]" />
            </button>
          </div>
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
  const reorderCategory = useTransactionStore((state) => state.reorderCategory)

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

  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [panel, setPanel] = useState(null) // { mode: 'add'|'edit', category?, parentId? }
  const [flash, setFlash] = useState(null)

  const handleSaveBudget = async (categoryId) => {
    const amount = parseFloat(editValue) || 0
    await updateBudget(categoryId, amount)
    setEditingCell(null)
  }

  const canMove = (cat) => {
    if (!cat.parentId) {
      const roots = parents
      const idx = roots.findIndex((r) => r.id === cat.id)
      return { up: idx > 0, down: idx >= 0 && idx < roots.length - 1 }
    }
    const roots = parents
    const parentIdx = roots.findIndex((r) => r.id === cat.parentId)
    const siblings = getChildCategories(categories, cat.parentId)
    const idx = siblings.findIndex((c) => c.id === cat.id)
    return {
      up: idx > 0 || parentIdx > 0,
      down: idx < siblings.length - 1 || parentIdx < roots.length - 1,
    }
  }

  const handleMove = async (cat, direction) => {
    const result = await reorderCategory(cat.id, direction)
    if (!result.success) setFlash(result.error)
    else setFlash(null)
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

  const totalBudgeted = getTotalBudgeted()
  const totalActivity = getTotalActivity()
  const totalAvailable = totalBudgeted - totalActivity

  return (
    <div className="flex flex-col rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-label-md text-on-surface-variant">
          Pencil to edit · arrows to reorder (including between groups)
        </p>
        <button
          type="button"
          onClick={() =>
            setPanel({ mode: 'add', parentId: null, category: { emoji: '📁', type: 'expense' } })
          }
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-space-sm py-1 text-label-md font-semibold text-on-primary"
        >
          <Icon name="add" className="text-[14px]" />
          Add category
        </button>
      </div>

      {flash && (
        <p className="mb-2 text-label-md text-sage-accent">{flash}</p>
      )}

      {panel && (
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
        <div className="col-span-5">CATEGORY</div>
        <div className="col-span-2 text-center">BUDGETED</div>
        <div className="col-span-2 text-center">ACTIVITY</div>
        <div className="col-span-3 text-right">AVAILABLE</div>
      </div>

      <div className="flex flex-col divide-y divide-border-hairline/60">
        {tree.length === 0 && (
          <p className="py-space-md text-body-sm text-on-surface-variant">
            No categories yet. Add a group above, or sign in to seed defaults.
          </p>
        )}
        {tree.map((root) => {
          const hasChildren = root.children.length > 0
          const expanded = expandedGroups[root.id] !== false
          const rootMove = canMove(root)

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
                onEdit={(cat) => setPanel({ mode: 'edit', category: cat })}
                onAddChild={(parentId) =>
                  setPanel({
                    mode: 'add',
                    parentId,
                    category: { emoji: '📁', type: 'expense', parentId },
                  })
                }
                canUp={rootMove.up}
                canDown={rootMove.down}
                onMoveUp={() => handleMove(root, 'up')}
                onMoveDown={() => handleMove(root, 'down')}
              />
              {hasChildren &&
                expanded &&
                root.children.map((child) => {
                  const childMove = canMove(child)
                  return (
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
                      onEdit={(cat) => setPanel({ mode: 'edit', category: cat })}
                      onAddChild={() => {}}
                      canUp={childMove.up}
                      canDown={childMove.down}
                      onMoveUp={() => handleMove(child, 'up')}
                      onMoveDown={() => handleMove(child, 'down')}
                    />
                  )
                })}
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
