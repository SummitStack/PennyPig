import { useState } from 'react'
import { useBudgetStore } from '../store/budgetStore'
import { useTransactionStore } from '../store/transactionStore'
import MainLayout from '../components/Layout/MainLayout'
import BudgetAllocationTable from '../components/Budget/BudgetAllocationTable'

export default function BudgetsPage() {
  const { currentMonth, getReadyToAssign } = useBudgetStore()
  const { accounts } = useTransactionStore()
  const [syncLoading, setSyncLoading] = useState(false)
  const readyToAssign = getReadyToAssign(5000)

  const handleSync = () => {
    setSyncLoading(true)
    setTimeout(() => setSyncLoading(false), 1500)
  }

  const monthName = new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Top Controls */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="text-headline-md font-bold text-on-surface">{monthName}</div>
            <div className="px-3 py-1 bg-surface-container rounded-full text-label-md text-status-success">
              ✓ Zero-based budget active
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className="px-4 py-2 text-body-sm text-primary hover:text-primary opacity-75 hover:opacity-100"
          >
            {syncLoading ? 'Syncing...' : '↻ Sync Now'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Ready to Assign */}
            <div className="bg-gradient-to-r from-primary to-primary bg-opacity-10 border-2 border-primary rounded-lg p-6">
              <p className="text-label-md text-primary uppercase tracking-widest">Ready to Assign</p>
              <p className="text-5xl font-bold text-primary mt-3">${readyToAssign.toFixed(2)}</p>
              <p className="text-body-sm text-primary opacity-75 mt-2">From rollover + new income</p>
            </div>

            {/* Budget Table */}
            <div className="bg-surface-container rounded-lg border border-border-hairline overflow-hidden">
              <BudgetAllocationTable />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Balances */}
            <div className="bg-surface-container rounded-lg border border-border-hairline overflow-hidden">
              <div className="px-6 py-4 border-b border-border-hairline flex justify-between items-center">
                <h3 className="text-headline-sm font-bold text-on-surface">Account Balances</h3>
                <button className="text-primary text-body-sm hover:underline">Sync Now</button>
              </div>
              <div className="divide-y divide-border-hairline">
                {accounts.map(account => (
                  <div key={account.id} className="px-6 py-4 hover:bg-surface-container-high transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-body-md font-medium text-on-surface">{account.name}</p>
                        <p className="text-label-md text-on-surface-variant mt-1">
                          {account.type === 'credit' ? '****1004' : '****8921'}
                        </p>
                      </div>
                      <p className={`text-body-md font-bold ${account.balance < 0 ? 'text-status-error' : 'text-on-surface'}`}>
                        ${account.balance.toFixed(0)}
                      </p>
                    </div>
                    <p className="text-label-md text-status-success mt-2">✓</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Record Transaction */}
            <button className="w-full py-3 bg-primary text-surface rounded font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              + Record Transaction
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
