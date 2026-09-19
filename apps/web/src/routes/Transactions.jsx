import { useState } from 'react'
import { useTransactionStore } from '../store/transactionStore'
import { useAccountStore } from '../store/accountStore'
import { useBudgetStore } from '../store/budgetStore'
import MainLayout from '../components/Layout/MainLayout'
import TransactionList from '../components/Transactions/TransactionList'
import { authFetch } from '../lib/authFetch'
import Icon from '../components/ui/Icon'
import { buildCategoryTree, getLeafCategories } from '../lib/categories'

export default function TransactionsPage() {
  const filter = useTransactionStore((state) => state.filter)
  const setFilter = useTransactionStore((state) => state.setFilter)
  const accounts = useTransactionStore((state) => state.accounts)
  const categories = useTransactionStore((state) => state.categories)
  const loadData = useTransactionStore((state) => state.loadData)
  const linkedAccounts = useAccountStore((state) => state.linkedAccounts)
  const loadAccounts = useAccountStore((state) => state.loadAccounts)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)
  const [syncLoading, setSyncLoading] = useState(false)

  const expenseTree = buildCategoryTree(categories, 'expense')
  const incomeLeaves = getLeafCategories(categories, 'income')

  const handleSync = async () => {
    setSyncLoading(true)
    try {
      for (const account of linkedAccounts) {
        const response = await authFetch('/api/plaid/sync', {
          method: 'POST',
          body: JSON.stringify({ account_id: account.id }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Sync failed')
      }
      await Promise.all([loadAccounts(), loadData(), loadBudgets()])
    } catch (err) {
      alert(err.message || 'Sync failed')
    } finally {
      setSyncLoading(false)
    }
  }

  const inputClass =
    'rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface placeholder-on-surface-variant'

  return (
    <MainLayout>
      <div className="flex flex-col gap-space-lg">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Transactions</h1>
          <p className="mt-space-sm text-body-md text-on-surface-variant">
            View and manage all transactions
          </p>
        </div>

        <div className="space-y-space-md rounded-xl border border-border-hairline bg-surface-base p-space-lg shadow-sm">
          <div className="grid grid-cols-1 gap-space-md md:grid-cols-4">
            <input
              type="text"
              placeholder="Search merchant..."
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              className={inputClass}
            />
            <select
              value={filter.category || ''}
              onChange={(e) => setFilter({ category: e.target.value || null })}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">All Categories</option>
              {expenseTree.map((root) =>
                root.children.length > 0 ? (
                  <optgroup key={root.id} label={`${root.emoji} ${root.name}`}>
                    {root.children.map((child) => (
                      <option key={child.id} value={child.name}>
                        {child.emoji} {child.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={root.id} value={root.name}>
                    {root.emoji} {root.name}
                  </option>
                )
              )}
              {incomeLeaves.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
            <select
              value={filter.accountId || ''}
              onChange={(e) => setFilter({ accountId: e.target.value || null })}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter({ status: e.target.value || null })}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">All Statuses</option>
              <option value="posted">Posted</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncLoading || linkedAccounts.length === 0}
            className="flex w-full items-center justify-center gap-space-sm rounded-xl bg-primary py-space-md font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Icon name="sync" className={`text-[18px] ${syncLoading ? 'animate-spin' : ''}`} />
            {syncLoading
              ? 'Syncing...'
              : linkedAccounts.length === 0
                ? 'Connect an account to sync'
                : 'Sync Accounts'}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border-hairline bg-surface-base shadow-sm">
          <TransactionList />
        </div>
      </div>
    </MainLayout>
  )
}
