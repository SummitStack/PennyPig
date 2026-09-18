import MainLayout from '../components/Layout/MainLayout'

export default function TransactionsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Transactions</h1>
          <p className="text-body-md text-on-surface-variant mt-2">View and manage all transactions</p>
        </div>

        {/* Filter bar */}
        <div className="bg-surface-container rounded-lg p-4 border border-border-hairline space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="text" placeholder="Search transactions..." className="px-4 py-2 bg-surface rounded border border-border-hairline text-on-surface" />
            <select className="px-4 py-2 bg-surface rounded border border-border-hairline text-on-surface">
              <option>All Accounts</option>
              <option>Amex</option>
              <option>MasterCard</option>
              <option>Bank</option>
            </select>
            <input type="date" className="px-4 py-2 bg-surface rounded border border-border-hairline text-on-surface" />
            <input type="date" className="px-4 py-2 bg-surface rounded border border-border-hairline text-on-surface" />
          </div>
          <button className="w-full py-2 bg-primary text-surface rounded font-medium hover:opacity-90">
            Sync Accounts
          </button>
        </div>

        {/* Transactions list */}
        <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
          <p className="text-body-md text-on-surface-variant">Placeholder: Transaction list with filtering coming soon</p>
        </div>
      </div>
    </MainLayout>
  )
}
