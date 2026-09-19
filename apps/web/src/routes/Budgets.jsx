import { useNavigate } from 'react-router-dom'
import { useBudgetStore } from '../store/budgetStore'
import { useAccountStore } from '../store/accountStore'
import { useTransactionStore } from '../store/transactionStore'
import MainLayout from '../components/Layout/MainLayout'
import BudgetAllocationTable from '../components/Budget/BudgetAllocationTable'
import { authFetch } from '../lib/authFetch'
import { useState } from 'react'

export default function BudgetsPage() {
  const navigate = useNavigate()
  const currentMonth = useBudgetStore((state) => state.currentMonth)
  const getReadyToAssign = useBudgetStore((state) => state.getReadyToAssign)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)
  const accounts = useAccountStore((state) => state.linkedAccounts)
  const loadAccounts = useAccountStore((state) => state.loadAccounts)
  const loadData = useTransactionStore((state) => state.loadData)
  const [syncLoading, setSyncLoading] = useState(false)
  const readyToAssign = getReadyToAssign()

  const handleSync = async () => {
    setSyncLoading(true)
    try {
      for (const account of accounts) {
        if (!account.plaidItemId && !account.id) continue
        await authFetch('/api/plaid/sync', {
          method: 'POST',
          body: JSON.stringify({ account_id: account.id }),
        })
      }
      await Promise.all([loadAccounts(), loadData(), loadBudgets()])
    } catch (err) {
      console.error(err)
      alert(err.message || 'Sync failed')
    } finally {
      setSyncLoading(false)
    }
  }

  const monthName = new Date(currentMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="text-headline-md font-bold text-on-surface">{monthName}</div>
            <div className="px-3 py-1 bg-surface-container rounded-full text-label-md text-status-success">
              Budget vs activity
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncLoading || accounts.length === 0}
            className="px-4 py-2 text-body-sm text-primary hover:opacity-100 opacity-75 disabled:opacity-40"
          >
            {syncLoading ? 'Syncing...' : '↻ Sync Now'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-r from-primary to-primary bg-opacity-10 border-2 border-primary rounded-lg p-6">
              <p className="text-label-md text-primary uppercase tracking-widest">Ready to Assign</p>
              <p className="text-5xl font-bold text-primary mt-3">${readyToAssign.toFixed(2)}</p>
              <p className="text-body-sm text-primary opacity-75 mt-2">
                Income this month minus budgeted amounts
              </p>
            </div>

            <div className="bg-surface-container rounded-lg border border-border-hairline overflow-hidden">
              <BudgetAllocationTable />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface-container rounded-lg border border-border-hairline overflow-hidden">
              <div className="px-6 py-4 border-b border-border-hairline flex justify-between items-center">
                <h3 className="text-headline-sm font-bold text-on-surface">Account Balances</h3>
                <button
                  onClick={handleSync}
                  className="text-primary text-body-sm hover:underline"
                  disabled={syncLoading}
                >
                  Sync
                </button>
              </div>
              <div className="divide-y divide-border-hairline">
                {accounts.length === 0 && (
                  <p className="px-6 py-4 text-body-sm text-on-surface-variant">
                    No linked accounts yet
                  </p>
                )}
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="px-6 py-4 hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-body-md font-medium text-on-surface">{account.name}</p>
                        <p className="text-label-md text-on-surface-variant mt-1">
                          {account.accountNumber}
                        </p>
                      </div>
                      <p
                        className={`text-body-md font-bold ${
                          account.balance < 0 ? 'text-status-error' : 'text-on-surface'
                        }`}
                      >
                        ${Number(account.balance).toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate('/transactions')}
              className="w-full py-3 bg-primary text-surface rounded font-medium hover:opacity-90 transition-opacity"
            >
              + Record Transaction
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
