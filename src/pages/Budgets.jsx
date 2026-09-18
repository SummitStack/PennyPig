import { useBudgetStore } from '../store/budgetStore'
import MainLayout from '../components/Layout/MainLayout'
import BudgetTable from '../components/Budget/BudgetTable'

export default function BudgetsPage() {
  const { getReadyToAssign } = useBudgetStore()
  const readyToAssign = getReadyToAssign(5000) // Mock monthly income

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Budget</h1>
          <p className="text-body-md text-on-surface-variant mt-2">Allocate your income across categories</p>
        </div>

        {/* Ready to Assign */}
        <div className={`bg-surface-container rounded-lg p-6 border-2 ${
          readyToAssign > 0 ? 'border-status-success' : 'border-status-error'
        }`}>
          <p className="text-label-md text-on-surface-variant uppercase tracking-wide">Ready to Assign</p>
          <p className="text-headline-md font-bold text-on-surface mt-2">${readyToAssign.toFixed(2)}</p>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {readyToAssign > 0 
              ? `Allocate this to categories to stay on budget`
              : `You've allocated more than available income`
            }
          </p>
        </div>

        {/* Budget Table */}
        <div className="bg-surface-container rounded-lg border border-border-hairline overflow-hidden">
          <div className="p-6 border-b border-border-hairline">
            <h2 className="text-headline-sm font-bold text-on-surface">September 2026</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Click any budget amount to edit</p>
          </div>
          <BudgetTable />
        </div>

        {/* Info */}
        <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
          <h3 className="text-headline-sm font-bold text-on-surface">How it works</h3>
          <ul className="text-body-md text-on-surface-variant mt-3 space-y-2 list-disc list-inside">
            <li>Allocate money from "Ready to Assign" to budget categories</li>
            <li>Watch spending track against your budget in real-time</li>
            <li>Unspent money rolls over to next month (YNAB style)</li>
            <li>Red = over budget, Yellow = nearly there, Green = under budget</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  )
}
