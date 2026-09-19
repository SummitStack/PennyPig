import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useBudgetStore } from '../store/budgetStore'
import { useAccountStore } from '../store/accountStore'
import { useTransactionStore } from '../store/transactionStore'
import MainLayout from '../components/Layout/MainLayout'
import BudgetAllocationTable from '../components/Budget/BudgetAllocationTable'
import Icon from '../components/ui/Icon'
import { authFetch } from '../lib/authFetch'

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function accountIcon(type) {
  if (type === 'credit') return 'credit_card'
  if (type === 'savings') return 'savings'
  return 'account_balance'
}

export default function BudgetsPage() {
  const navigate = useNavigate()
  const currentMonth = useBudgetStore((state) => state.currentMonth)
  const setCurrentMonth = useBudgetStore((state) => state.setCurrentMonth)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)
  const loadBudgetHistory = useBudgetStore((state) => state.loadBudgetHistory)
  const getReadyToAssign = useBudgetStore((state) => state.getReadyToAssign)
  const accounts = useAccountStore((state) => state.linkedAccounts)
  const loadAccounts = useAccountStore((state) => state.loadAccounts)
  const loadData = useTransactionStore((state) => state.loadData)
  const [syncLoading, setSyncLoading] = useState(false)
  const readyToAssign = getReadyToAssign()

  useEffect(() => {
    loadBudgetHistory()
  }, [loadBudgetHistory])

  const monthName = new Date(`${currentMonth}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const changeMonth = async (delta) => {
    const next = shiftMonth(currentMonth, delta)
    setCurrentMonth(next)
    await loadBudgets(next)
  }

  const handleSync = async () => {
    setSyncLoading(true)
    try {
      for (const account of accounts) {
        const response = await authFetch('/api/plaid/sync', {
          method: 'POST',
          body: JSON.stringify({ account_id: account.id }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Sync failed')
      }
      await Promise.all([loadAccounts(), loadData(), loadBudgets(currentMonth)])
    } catch (err) {
      console.error(err)
      alert(err.message || 'Sync failed')
    } finally {
      setSyncLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="mb-space-md flex flex-col justify-between gap-space-sm md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="flex items-center rounded-lg border border-border-hairline bg-surface-container-high p-0.5">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-base hover:text-on-surface"
              aria-label="Previous month"
            >
              <Icon name="chevron_left" className="text-[18px]" />
            </button>
            <span className="px-space-sm font-headline-sm font-bold tracking-tight text-on-surface">
              {monthName}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded p-1.5 text-on-surface-variant transition-colors hover:bg-surface-base hover:text-on-surface"
              aria-label="Next month"
            >
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
        </div>

        <div
          className={`flex items-center justify-between gap-space-md rounded-lg border px-space-md py-2 md:justify-end ${
            readyToAssign < 0
              ? 'border-status-error/30 bg-status-error/10'
              : 'border-sage-accent/30 bg-sage-accent/10'
          }`}
        >
          <div>
            <div
              className={`text-label-sm font-bold tracking-wider ${
                readyToAssign < 0 ? 'text-status-error' : 'text-sage-accent'
              }`}
            >
              READY TO ASSIGN
            </div>
            <div className="text-label-sm text-on-surface-variant">
              Income + leftover − overspend − assigned
            </div>
          </div>
          <div
            className={`text-headline-md font-bold ${
              readyToAssign < 0 ? 'text-status-error' : 'text-sage-accent'
            }`}
          >
            {readyToAssign < 0 ? '-' : ''}${Math.abs(readyToAssign).toFixed(2)}
          </div>
        </div>
      </div>

      <div
        id="budget-allocation"
        className="grid grid-cols-1 items-start gap-space-md lg:grid-cols-12"
      >
        <div className="lg:col-span-8">
          <BudgetAllocationTable />
        </div>

        <div className="flex flex-col gap-space-sm lg:col-span-4">
          <div className="flex flex-col gap-space-sm rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm">
            <div className="flex items-center justify-between border-b border-border-hairline pb-1.5">
              <span className="font-headline-sm font-bold text-on-surface">Account Balances</span>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncLoading || accounts.length === 0}
                className="flex items-center gap-1 text-label-md font-semibold text-cool-blue hover:underline disabled:opacity-40"
              >
                <Icon name="sync" className={`text-[14px] ${syncLoading ? 'animate-spin' : ''}`} />
                <span>{syncLoading ? 'Syncing…' : 'Sync Now'}</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {accounts.length === 0 && (
                <p className="text-body-sm text-on-surface-variant">No linked accounts yet</p>
              )}
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-space-sm">
                    <Icon
                      name={accountIcon(account.type)}
                      className={`text-[18px] ${
                        account.type === 'credit' ? 'text-error' : 'text-secondary'
                      }`}
                    />
                    <div>
                      <div className="text-body-sm font-medium text-on-surface">{account.name}</div>
                      <div className="text-label-sm text-on-surface-variant">
                        {account.institution} {account.accountNumber}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-body-sm font-semibold ${
                        account.balance < 0 ? 'text-error' : 'text-on-surface'
                      }`}
                    >
                      ${Number(account.balance).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <Icon
                      name={account.balance < 0 ? 'error' : 'check'}
                      className={`text-[14px] ${
                        account.balance < 0 ? 'text-status-error' : 'text-status-success'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="flex w-full items-center justify-center gap-space-sm rounded-xl bg-primary px-space-md py-2.5 font-headline-sm font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-90"
          >
            <Icon name="add_circle" className="text-[18px]" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
