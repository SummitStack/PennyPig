import MainLayout from '../components/Layout/MainLayout'

export default function BudgetsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Budgets</h1>
          <p className="text-body-md text-on-surface-variant mt-2">Allocate and track your monthly budgets</p>
        </div>

        {/* Budget allocation section */}
        <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-headline-sm font-bold text-on-surface">September 2026</h2>
            <button className="px-4 py-2 bg-primary text-surface rounded font-medium hover:opacity-90">
              + Add Category
            </button>
          </div>

          {/* Ready to assign */}
          <div className="mb-6 p-4 bg-surface rounded border border-status-warning">
            <p className="text-label-md text-on-surface-variant">Ready to Assign</p>
            <p className="text-headline-md font-bold text-on-surface mt-1">$0.00</p>
          </div>

          {/* Budget table placeholder */}
          <p className="text-body-md text-on-surface-variant">Placeholder: Budget allocation table coming soon</p>
        </div>
      </div>
    </MainLayout>
  )
}
