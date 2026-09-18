import { useState } from 'react'
import { useTransactionStore } from '../store/transactionStore'
import MainLayout from '../components/Layout/MainLayout'
import TransactionList from '../components/Transactions/TransactionList'

export default function TransactionsPage() {
  const filter = useTransactionStore(state => state.filter)
  const setFilter = useTransactionStore(state => state.setFilter)
  const accounts = useTransactionStore(state => state.accounts)
  const categories = useTransactionStore(state => state.categories)
  const [syncLoading, setSyncLoading] = useState(false)

  const handleSync = async () => {
    setSyncLoading(true)
    // Simulate sync
    setTimeout(() => setSyncLoading(false), 1500)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Transactions</h1>
          <p className="text-body-md text-on-surface-variant mt-2">View and manage all transactions</p>
        </div>

        {/* Filter bar */}
        <div className="bg-surface-container rounded-lg p-6 border border-border-hairline space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search merchant..."
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              className="px-4 py-2 bg-surface rounded border border-border-hairline text-on-surface placeholder-on-surface-variant"
            />
            <select
              value={filter.category || ''}
              onChange={(e) => setFilter({ category: e.target.value || null })}
              className="px-4 py-2 bg-surface rounded border border-border-hairline text-on-surface cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <select
              value={filter.account || ''}
              onChange={(e) => setFilter({ account: e.target.value || null })}
              className="px-4 py-2 bg-surface rounded border border-border-hairline text-on-surface cursor-pointer"
            >
              <option value="">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.name}>{acc.name}</option>
              ))}
            </select>
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ status: e.target.value || null })}
              className="px-4 py-2 bg-surface rounded border border-border-hairline text-on-surface cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="posted">Posted</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className="w-full py-2 bg-primary text-surface rounded font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {syncLoading ? 'Syncing...' : 'Sync Accounts (Mock)'}
          </button>
        </div>

        {/* Transactions list */}
        <div className="bg-surface-container rounded-lg border border-border-hairline overflow-hidden">
          <TransactionList />
        </div>
      </div>
    </MainLayout>
  )
}
