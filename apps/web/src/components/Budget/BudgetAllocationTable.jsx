import { useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'

export default function BudgetAllocationTable() {
  const { categories, expandedCategories, toggleCategory, updateBudget, getTotalBudgeted, getTotalActivity } = useBudgetStore()
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')

  const handleCellClick = (categoryName, subcategoryName, currentValue) => {
    setEditingCell({ category: categoryName, subcategory: subcategoryName })
    setEditValue(currentValue.toString())
  }

  const handleSave = (categoryName, subcategoryName) => {
    const amount = parseFloat(editValue) || 0
    updateBudget(categoryName, subcategoryName, amount)
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
  const totalAvailable = 5000 - totalBudgeted

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
          {Object.entries(categories).map(([categoryName, categoryData]) => (
            <tbody key={categoryName}>
              <tr className="border-b border-border-hairline hover:bg-surface-container-high transition-colors group">
                <td 
                  className="px-6 py-4 cursor-pointer select-none"
                  onClick={() => toggleCategory(categoryName)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`transform transition-transform ${expandedCategories.has(categoryName) ? 'rotate-90' : ''}`}>
                      {Object.keys(categoryData.subcategories || {}).length > 0 && '▶'}
                    </span>
                    <span className="text-body-md font-semibold text-on-surface">{categoryName}</span>
                    <span className="text-label-md text-on-surface-variant">
                      {Object.keys(categoryData.subcategories || {}).length} items
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-body-md font-medium text-on-surface">
                  ${categoryData.budgeted.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right text-body-md font-medium text-on-surface">
                  ${categoryData.activity.toFixed(2)}
                </td>
                <td className={`px-6 py-4 text-right text-body-md font-medium ${getStatusColor(categoryData.budgeted, categoryData.activity)}`}>
                  ${(categoryData.budgeted - categoryData.activity).toFixed(2)}
                </td>
              </tr>

              {expandedCategories.has(categoryName) && categoryData.subcategories && Object.entries(categoryData.subcategories).map(([subcategoryName, subcategoryData]) => (
                <tr key={`${categoryName}-${subcategoryName}`} className="border-b border-border-hairline hover:bg-surface-container transition-colors">
                  <td className="px-6 py-3 pl-16 text-body-sm text-on-surface-variant">{subcategoryName}</td>
                  <td
                    className="px-6 py-3 text-right cursor-pointer"
                    onClick={() => handleCellClick(categoryName, subcategoryName, subcategoryData.budgeted)}
                  >
                    {editingCell?.category === categoryName && editingCell?.subcategory === subcategoryName ? (
                      <input
                        autoFocus
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSave(categoryName, subcategoryName)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave(categoryName, subcategoryName)}
                        className="w-24 px-2 py-1 bg-surface border border-primary rounded text-right text-body-sm text-on-surface"
                      />
                    ) : (
                      <span className="text-body-sm text-on-surface hover:text-primary hover:underline">
                        ${subcategoryData.budgeted.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-body-sm text-on-surface">
                    ${subcategoryData.activity.toFixed(2)}
                  </td>
                  <td className={`px-6 py-3 text-right text-body-sm ${getStatusColor(subcategoryData.budgeted, subcategoryData.activity)}`}>
                    ${(subcategoryData.budgeted - subcategoryData.activity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
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
