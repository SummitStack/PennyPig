import { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { useTransactionStore } from '../../store/transactionStore'
import { buildCategoryTree } from '../../lib/categories'
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
      className="group/edit inline-flex cursor-text items-center gap-1 rounded border border-transparent px-2 py-1 text-body-sm font-medium text-on-surface hover:border-border-hairline hover:bg-surface-container"
    >
      <span>${budgeted.toFixed(0)}</span>
      <Icon
        name="edit"
        className="text-[14px] text-on-surface-variant opacity-0 transition-opacity group-hover/edit:opacity-100"
      />
    </button>
  )
}

function CategoryRow({
  category,
  depth,
  isGroup,
  expanded,
  onToggle,
  budgeted,
  activity,
  editingCell,
  editValue,
  setEditingCell,
  setEditValue,
  onSave,
}) {
  const available = budgeted - activity
  const pad = depth === 0 ? '' : 'pl-8'

  return (
    <div className="group py-space-md">
      <div className="grid grid-cols-12 items-center">
        <div className={`col-span-5 flex items-center gap-space-sm ${pad}`}>
          {isGroup ? (
            <button
              type="button"
              onClick={() => onToggle(category.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              aria-label={expanded ? 'Collapse group' : 'Expand group'}
            >
              <Icon
                name={expanded ? 'expand_more' : 'chevron_right'}
                className="text-[20px] transition-transform"
              />
            </button>
          ) : (
            <span className="w-7" />
          )}
          <span className="text-lg leading-none" aria-hidden>
            {category.emoji || '📁'}
          </span>
          <span
            className={
              isGroup
                ? 'font-bold uppercase tracking-wide text-on-surface'
                : 'font-medium text-on-surface'
            }
          >
            {category.name}
          </span>
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
            onSave={onSave}
          />
        </div>
        <div className="col-span-2 text-center text-on-surface-variant">
          ${activity.toFixed(0)}
        </div>
        <div
          className={`col-span-3 flex items-center justify-end gap-space-xs text-right font-medium ${statusText(
            budgeted,
            activity
          )}`}
        >
          <span>
            {available < 0 ? '-' : ''}${Math.abs(available).toFixed(0)}
          </span>
          <span
            className={`h-2 w-2 rounded-full ${statusDot(budgeted, activity)} ${
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
  const updateBudget = useBudgetStore((state) => state.updateBudget)
  const getBudgetedFor = useBudgetStore((state) => state.getBudgetedFor)
  const getActivityFor = useBudgetStore((state) => state.getActivityFor)
  const getTotalBudgeted = useBudgetStore((state) => state.getTotalBudgeted)
  const getTotalActivity = useBudgetStore((state) => state.getTotalActivity)
  const expandedGroups = useBudgetStore((state) => state.expandedGroups)
  const toggleGroup = useBudgetStore((state) => state.toggleGroup)

  const tree = buildCategoryTree(categories, 'expense')
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')

  const handleSave = async (categoryId) => {
    const amount = parseFloat(editValue) || 0
    await updateBudget(categoryId, amount)
    setEditingCell(null)
  }

  const totalBudgeted = getTotalBudgeted()
  const totalActivity = getTotalActivity()
  const totalAvailable = totalBudgeted - totalActivity

  return (
    <div className="flex flex-col rounded-xl border border-border-hairline bg-surface-base p-space-lg shadow-sm">
      <div className="grid grid-cols-12 border-b border-border-hairline pb-space-md text-label-md font-semibold text-on-surface-variant">
        <div className="col-span-5">CATEGORY</div>
        <div className="col-span-2 text-center">BUDGETED</div>
        <div className="col-span-2 text-center">ACTIVITY</div>
        <div className="col-span-3 text-right">AVAILABLE</div>
      </div>

      <div className="flex flex-col divide-y divide-border-hairline">
        {tree.length === 0 && (
          <p className="py-space-lg text-body-md text-on-surface-variant">
            No categories yet. Open Settings to add categories, or sign in to seed defaults.
          </p>
        )}
        {tree.map((root) => {
          const hasChildren = root.children.length > 0
          const expanded = expandedGroups[root.id] !== false
          const rootBudgeted = getBudgetedFor(root.id)
          const rootActivity = getActivityFor(root.id)

          return (
            <div key={root.id}>
              <CategoryRow
                category={root}
                depth={0}
                isGroup={hasChildren}
                expanded={expanded}
                onToggle={toggleGroup}
                budgeted={rootBudgeted}
                activity={rootActivity}
                editingCell={editingCell}
                editValue={editValue}
                setEditingCell={setEditingCell}
                setEditValue={setEditValue}
                onSave={handleSave}
              />
              {hasChildren && expanded &&
                root.children.map((child) => (
                  <CategoryRow
                    key={child.id}
                    category={child}
                    depth={1}
                    isGroup={false}
                    expanded={false}
                    onToggle={toggleGroup}
                    budgeted={getBudgetedFor(child.id)}
                    activity={getActivityFor(child.id)}
                    editingCell={editingCell}
                    editValue={editValue}
                    setEditingCell={setEditingCell}
                    setEditValue={setEditValue}
                    onSave={handleSave}
                  />
                ))}
            </div>
          )
        })}
      </div>

      <div className="mt-space-lg grid grid-cols-12 items-center border-t border-border-hairline pt-space-md font-bold text-on-surface">
        <div className="col-span-5 text-headline-sm">TOTALS</div>
        <div className="col-span-2 text-center text-headline-sm">${totalBudgeted.toFixed(0)}</div>
        <div className="col-span-2 text-center text-headline-sm text-on-surface-variant">
          ${totalActivity.toFixed(0)}
        </div>
        <div className="col-span-3 text-right text-headline-sm text-sage-accent">
          ${totalAvailable.toFixed(0)}
        </div>
      </div>
    </div>
  )
}
