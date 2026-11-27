import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useBudgetStore, useReadyToAssign } from '../store/budgetStore'
import { useAccountStore } from '../store/accountStore'
import { useTransactionStore } from '../store/transactionStore'
import MainLayout from '../components/Layout/MainLayout'
import BudgetAllocationTable from '../components/Budget/BudgetAllocationTable'
import MonthClosePanel from '../components/Budget/MonthClosePanel'
import BudgetStartPanel from '../components/Budget/BudgetStartPanel'
import CardPaymentFixPanel from '../components/Budget/CardPaymentFixPanel'
import Icon from '../components/ui/Icon'
import { formatMonthLabel, shiftMonth, money } from '../lib/money'
import { accountNetContribution, isLiability } from '../lib/reportMath'
import { linkedPlaidAccounts, syncAllLinked } from '../lib/plaidSyncClient'

function accountIcon(type) {
  if (type === 'credit') return 'credit_card'
  if (type === 'savings') return 'savings'
  if (type === 'loan') return 'real_estate_agent'
  return 'account_balance'
}

export default function BudgetsPage() {
  const navigate = useNavigate()
  const currentMonth = useBudgetStore((state) => state.currentMonth)
  const setCurrentMonth = useBudgetStore((state) => state.setCurrentMonth)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)
  const loadBudgetHistory = useBudgetStore((state) => state.loadBudgetHistory)
  const allAccounts = useAccountStore((state) => state.linkedAccounts)
  const accounts = useMemo(() => allAccounts.filter((a) => !a.closed), [allAccounts])
  const loadAccounts = useAccountStore((state) => state.loadAccounts)
  const loadData = useTransactionStore((state) => state.loadData)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)
  const readyToAssign = useReadyToAssign()
  const hasLinked = linkedPlaidAccounts(accounts).length > 0

  useEffect(() => {
    loadBudgetHistory()
  }, [loadBudgetHistory])

  useEffect(() => {
    if (!syncMessage) return undefined
    const t = setTimeout(() => setSyncMessage(null), 5000)
    return () => clearTimeout(t)
  }, [syncMessage])

  const monthName = formatMonthLabel(currentMonth)

  const changeMonth = async (delta) => {
    const next = shiftMonth(currentMonth, delta)
    setCurrentMonth(next)
    await loadBudgets(next)
  }

  const handleSync = async () => {
    setSyncLoading(true)
    setSyncMessage(null)
    try {
      const result = await syncAllLinked(accounts)
      await Promise.all([loadAccounts(), loadData(), loadBudgets(currentMonth)])
      setSyncMessage(
        result.errors.length
          ? `Some banks didn't sync. ${result.errors.join(' ')}`
          : `Synced ${result.synced} new transaction${result.synced === 1 ? '' : 's'}.`
      )
    } finally {
      setSyncLoading(false)
    }
  }

  const negative = readyToAssign < 0
  const zero = Math.abs(readyToAssign) < 0.005

  return (
    <MainLayout>
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Budget</p>
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="btn btn-ghost h-9 w-9 p-0"
              aria-label="Previous month"
            >
              <Icon name="chevron_left" className="text-[22px]" />
            </button>
            <h1 className="min-w-[10.5rem] text-center font-display text-headline-lg text-on-surface">
              {monthName}
            </h1>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="btn btn-ghost h-9 w-9 p-0"
              aria-label="Next month"
            >
              <Icon name="chevron_right" className="text-[22px]" />
            </button>
          </div>
        </div>

        <div
          className={`flex items-center justify-between gap-6 rounded-2xl px-5 py-3.5 ring-1 ${
            negative
              ? 'bg-status-error/10 ring-status-error/25'
              : zero
                ? 'bg-surface-base ring-border-hairline'
                : 'bg-primary/10 ring-primary/25'
          }`}
          data-testid="ready-to-assign"
        >
          <div>
            <div
              className={`text-label-md font-semibold ${
                negative ? 'text-status-error' : zero ? 'text-on-surface-variant' : 'text-primary'
              }`}
            >
              Ready to assign
            </div>
            <div className="text-label-sm text-on-surface-variant">
              {negative
                ? 'You assigned more than you have'
                : zero
                  ? 'Every dollar has a job'
                  : 'Give these dollars a job'}
            </div>
          </div>
          <div
            className={`num font-display text-headline-lg ${
              negative ? 'text-status-error' : zero ? 'text-on-surface' : 'text-primary'
            }`}
          >
            {money(readyToAssign)}
          </div>
        </div>
      </div>

      <BudgetStartPanel />
      <CardPaymentFixPanel />

      <div id="budget-allocation" className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <BudgetAllocationTable />
        </div>

        <div className="flex flex-col gap-4 xl:col-span-4">
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-headline-sm text-on-surface">Accounts</h2>
              {hasLinked && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncLoading}
                  className="btn btn-ghost btn-sm text-cool-blue"
                >
                  <Icon name="sync" className={`text-[16px] ${syncLoading ? 'animate-spin' : ''}`} />
                  {syncLoading ? 'Syncing…' : 'Sync banks'}
                </button>
              )}
            </div>
            {syncMessage && (
              <p className="mb-2 rounded-lg bg-surface-container px-3 py-2 text-label-md text-on-surface-variant">
                {syncMessage}
              </p>
            )}
            <div className="flex flex-col">
              {accounts.length === 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/accounts')}
                  className="rounded-lg border border-dashed border-outline-variant px-3 py-4 text-body-sm text-on-surface-variant hover:bg-surface-container"
                >
                  Add your first account
                </button>
              )}
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-3 border-b border-border-hairline py-2.5 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isLiability(account)
                          ? 'bg-status-error/10 text-status-error'
                          : 'bg-cool-blue/10 text-cool-blue'
                      }`}
                    >
                      <Icon name={accountIcon(account.type)} className="text-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-body-sm font-medium text-on-surface">
                        {account.name}
                      </div>
                      <div className="truncate text-label-sm text-on-surface-variant">
                        {account.isManual
                          ? 'Manual'
                          : [account.institution, account.accountNumber]
                              .filter(Boolean)
                              .join(' ')}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`num text-body-sm font-semibold ${
                      accountNetContribution(account) < 0 ? 'text-status-error' : 'text-on-surface'
                    }`}
                  >
                    {money(accountNetContribution(account))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <MonthClosePanel />

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => navigate('/transactions')} className="btn btn-primary py-2.5">
              <Icon name="add" className="text-[18px]" />
              Transaction
            </button>
            <button type="button" onClick={() => navigate('/reports')} className="btn btn-secondary py-2.5">
              <Icon name="insights" className="text-[18px]" />
              Reports
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
