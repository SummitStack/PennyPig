import { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
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

export default function BudgetAllocationTable() {
  const currentMonth = useBudgetStore((state) => state.currentMonth)
  const budgets = useBudgetStore((state) => state.budgets)
  const updateBudget = useBudgetStore((state) => state.updateBudget)
  const getSpending = useBudgetStore((state) => state.getSpending)
  const getTotalBudgeted = useBudgetStore((state) => state.getTotalBudgeted)
  const getTotalActivity = useBudgetStore((state) => state.getTotalActivity)

  const spending = getSpending(currentMonth)
  const categories = Object.keys(budgets[currentMonth] || {})
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')

  const handleSave = async (categoryName) => {
    const amount = parseFloat(editValue) || 0
    await updateBudget(categoryName, null, amount)
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
        {categories.length === 0 && (
          <p className="py-space-lg text-body-md text-on-surface-variant">
            No categories yet. Sign in to seed defaults, then set amounts.
          </p>
        )}
        {categories.map((categoryName) => {
          const budgeted = budgets[currentMonth]?.[categoryName] || 0
          const activity = spending[categoryName] || 0
          const available = budgeted - activity

          return (
            <div key={categoryName} className="group py-space-md">
              <div className="grid grid-cols-12 items-center">
                <div className="col-span-5 flex items-center gap-space-sm font-semibold text-on-surface">
                  <span>{categoryName}</span>
                </div>
                <div className="col-span-2 text-center">
                  {editingCell === categoryName ? (
                    <input
                      autoFocus
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSave(categoryName)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(categoryName)}
                      className="w-20 rounded border border-cool-blue bg-surface-base px-1 py-0.5 text-center text-body-sm font-medium text-on-surface outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCell(categoryName)
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
                  )}
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
