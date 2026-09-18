import { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'

export default function BudgetAllocationTable() {
  const { budgets, spending, currentMonth, updateBudget, getTotalBudgeted, getTotalActivity } = useBudgetStore()
  const categories = Object.keys(budgets[currentMonth] || {})
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')

  const handleCellClick = (categoryName, currentValue) => {
    setEditingCell(categoryName)
    setEditValue(currentValue.toString())
  }

  const handleSave = (categoryName) => {
    const amount = parseFloat(editValue) || 0
    updateBudget(categoryName, null, amount)
    setEditingCell(null)
  }

  const getStatusColor = (budgeted, activity) => {
    if (budgeted === 0) return 'text-on-surface-variant'
    const percent = activity / budgeted
    if (percent > 1) return 'text-status-error'
    if (percent > 0.8) return 'text-status-warning'
    return 'text-status-success'
  }

  const totalBudgeted = getTotalBudgeted()
  const totalActivity = getTotalActivity()

  return (
    <div className="space-y-0">
      <table className="w-full">
        <thead className="bg-surface-container border-b border-border-hairline sticky top-0">
          <tr>
            <th className="px-6 py-4 text-left text-label-md text-on-surface-variant uppercase tracking-wider">Category</th>
            <th className="px-6 py-4 text-right text-label-md text-on-surface-variant uppercase tracking-wider">Budgeted</th>
            <th className="px-6 py-4 text-right text-label-md text-on-surface-variant uppercase tracking-wider">Activity</th>
            <th className="px-6 py-4 text-right text-label-md text-on-surface-variant uppercase tracking-wider">Available</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((categoryName) => {
            const budgeted = budgets[currentMonth]?.[categoryName] || 0
            const activity = spending[currentMonth]?.[categoryName] || 0
            const available = budgeted - activity

            return (
              <tr key={categoryName} className="border-b border-border-hairline hover:bg-surface-container-high transition-colors group">
                <td className="px-6 py-4">
                  <span className="text-body-md font-semibold text-on-surface">{categoryName}</span>
                </td>
                <td
                  className="px-6 py-4 text-right cursor-pointer"
                  onClick={() => handleCellClick(categoryName, budgeted)}
                >
                  {editingCell === categoryName ? (
                    <input
                      autoFocus
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSave(categoryName)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(categoryName)}
                      className="w-24 px-2 py-1 bg-surface border border-primary rounded text-right text-body-md text-on-surface"
                    />
                  ) : (
                    <span className="text-body-md font-medium text-on-surface hover:text-primary hover:underline">
                      ${budgeted.toFixed(2)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-body-md font-medium text-on-surface">
                  ${activity.toFixed(2)}
                </td>
                <td className={`px-6 py-4 text-right text-body-md font-medium ${getStatusColor(budgeted, activity)}`}>
                  ${available.toFixed(2)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="bg-surface-container-high border-t-2 border-border-hairline px-6 py-4 grid grid-cols-4 gap-0 font-bold text-on-surface">
        <div>TOTALS</div>
        <div className="text-right">${totalBudgeted.toFixed(2)}</div>
        <div className="text-right">${totalActivity.toFixed(2)}</div>
        <div className="text-right text-status-success">${(totalBudgeted - totalActivity).toFixed(2)}</div>
      </div>
    </div>
  )
}
