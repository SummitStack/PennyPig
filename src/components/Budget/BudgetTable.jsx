import { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'

export default function BudgetTable() {
  const { budgets, spending, currentMonth, setBudget, getCategoryStatus } = useBudgetStore()
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')

  const categories = Object.keys(budgets[currentMonth] || {})
  const totalBudgeted = Object.values(budgets[currentMonth] || {}).reduce((sum, val) => sum + val, 0)
  const totalSpent = Object.values(spending[currentMonth] || {}).reduce((sum, val) => sum + val, 0)
  const totalRemaining = totalBudgeted - totalSpent

  const handleCellClick = (category) => {
    setEditingCell(category)
    setEditValue(budgets[currentMonth]?.[category]?.toString() || '')
  }

  const handleSave = (category) => {
    const amount = parseFloat(editValue) || 0
    setBudget(category, amount)
    setEditingCell(null)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'under': return 'text-status-success'
      case 'even': return 'text-on-surface-variant'
      case 'over': return 'text-status-error'
      default: return 'text-on-surface'
    }
  }

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'under': return 'bg-status-success bg-opacity-10'
      case 'even': return 'bg-surface-container'
      case 'over': return 'bg-status-error bg-opacity-10'
      default: return 'bg-surface-container'
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-container border-b border-border-hairline">
          <tr>
            <th className="px-6 py-3 text-left text-label-md text-on-surface-variant">Category</th>
            <th className="px-6 py-3 text-right text-label-md text-on-surface-variant">Budgeted</th>
            <th className="px-6 py-3 text-right text-label-md text-on-surface-variant">Spent</th>
            <th className="px-6 py-3 text-right text-label-md text-on-surface-variant">Remaining</th>
            <th className="px-6 py-3 text-center text-label-md text-on-surface-variant">% Used</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const budgeted = budgets[currentMonth]?.[category] || 0
            const spent = spending[currentMonth]?.[category] || 0
            const remaining = budgeted - spent
            const percentUsed = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0
            const { status } = getCategoryStatus(category)

            return (
              <tr key={category} className={`border-b border-border-hairline hover:bg-surface-container-high transition-colors ${getStatusBgColor(status)}`}>
                <td className="px-6 py-4 text-body-md font-medium text-on-surface">{category}</td>
                <td
                  className="px-6 py-4 text-right cursor-pointer"
                  onClick={() => handleCellClick(category)}
                >
                  {editingCell === category ? (
                    <input
                      autoFocus
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSave(category)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave(category)}
                      className="w-24 px-2 py-1 bg-surface border border-primary rounded text-right text-body-md text-on-surface"
                    />
                  ) : (
                    <span className="text-body-md font-medium text-on-surface hover:underline">${budgeted.toFixed(2)}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-body-md text-on-surface">${spent.toFixed(2)}</td>
                <td className={`px-6 py-4 text-right text-body-md font-medium ${getStatusColor(status)}`}>
                  ${remaining.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-full max-w-xs bg-surface-container rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percentUsed > 100 ? 'bg-status-error' :
                          percentUsed > 80 ? 'bg-status-warning' :
                          'bg-status-success'
                        }`}
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                      />
                    </div>
                    <span className="text-label-md text-on-surface-variant ml-2 min-w-12 text-right">{percentUsed}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Summary row */}
      <div className="bg-surface-container-high border-t border-border-hairline px-6 py-4 grid grid-cols-5 gap-4 font-bold text-on-surface">
        <div>Total</div>
        <div className="text-right">${totalBudgeted.toFixed(2)}</div>
        <div className="text-right">${totalSpent.toFixed(2)}</div>
        <div className={totalRemaining >= 0 ? 'text-right text-status-success' : 'text-right text-status-error'}>
          ${totalRemaining.toFixed(2)}
        </div>
        <div className="text-center">
          {totalBudgeted > 0 ? `${Math.round((totalSpent / totalBudgeted) * 100)}%` : '0%'}
        </div>
      </div>
    </div>
  )
}
