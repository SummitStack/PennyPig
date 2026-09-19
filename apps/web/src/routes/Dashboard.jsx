import { useNavigate } from 'react-router-dom'
import { useBudgetStore } from '../store/budgetStore'
import { useAccountStore } from '../store/accountStore'
import { useTransactionStore } from '../store/transactionStore'
import MainLayout from '../components/Layout/MainLayout'
import Icon from '../components/ui/Icon'
import { getLeafCategories } from '../lib/categories'

function accountIcon(type) {
  if (type === 'credit') return 'credit_card'
  if (type === 'savings') return 'savings'
  return 'wallet'
}

function formatMoney(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`
}

function formatMoneyExact(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const accounts = useAccountStore((state) => state.linkedAccounts)
  const transactions = useTransactionStore((state) => state.transactions)
  const categories = useTransactionStore((state) => state.categories)
  const {
    currentMonth,
    getBudgetedFor,
    getActivityFor,
    getTotalSpent,
    getTotalBudgeted,
    getReadyToAssign,
  } = useBudgetStore()

  const expenseLeaves = getLeafCategories(categories, 'expense')
  const incomeIds = new Set(
    categories.filter((c) => c.type === 'income').map((c) => c.id)
  )

  const moneyIn = transactions.reduce((sum, txn) => {
    const d = new Date(txn.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key !== currentMonth) return sum
    if (incomeIds.has(txn.categoryId)) return sum + Number(txn.amount || 0)
    return sum
  }, 0)

  const moneyOut = getTotalSpent()
  const readyToAssign = getReadyToAssign()
  const totalBudgeted = getTotalBudgeted()

  const now = new Date()
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const budgetUsedPct =
    totalBudgeted > 0 ? Math.min(100, Math.round((moneyOut / totalBudgeted) * 100)) : 0

  const latestSync = accounts
    .map((a) => a.lastSynced)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
  const syncedLabel =
    latestSync.length > 0
      ? new Date(Math.max(...latestSync)).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'Not synced yet'

  const categoryRows = expenseLeaves
    .map((cat) => {
      const budgeted = getBudgetedFor(cat.id)
      const activity = getActivityFor(cat.id)
      if (budgeted === 0 && activity === 0) return null
      const pct = budgeted > 0 ? Math.round((activity / budgeted) * 100) : activity > 0 ? 100 : 0
      return { id: cat.id, name: cat.name, emoji: cat.emoji, budgeted, activity, pct }
    })
    .filter(Boolean)
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 5)

  const statusColor = (pct) => {
    if (pct >= 100) return 'text-status-error'
    if (pct >= 80) return 'text-status-warning'
    return 'text-status-success'
  }

  const barColor = (pct) => {
    if (pct >= 100) return 'bg-status-error'
    if (pct >= 80) return 'bg-status-warning'
    return 'bg-status-success'
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-space-xl">
        <div className="grid grid-cols-1 gap-space-lg sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-base p-space-lg shadow-sm">
            <div className="mb-space-md flex items-center justify-between">
              <span className="text-label-md uppercase tracking-wider text-on-surface-variant">
                Money In (This Month)
              </span>
              <Icon name="trending_up" className="text-[20px] text-primary" />
            </div>
            <div className="text-headline-lg font-bold text-on-surface">
              {formatMoney(moneyIn)}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-base p-space-lg shadow-sm">
            <div className="mb-space-md flex items-center justify-between">
              <span className="text-label-md uppercase tracking-wider text-on-surface-variant">
                Money Out
              </span>
              <Icon name="trending_down" className="text-[20px] text-on-surface-variant" />
            </div>
            <div className="text-headline-lg font-bold text-on-surface">
              {formatMoney(moneyOut)}
            </div>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-primary/30 bg-primary/10 p-space-lg shadow-sm">
            <div className="pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
            <div className="mb-space-md flex items-center justify-between">
              <span className="text-label-md font-semibold uppercase tracking-wider text-primary">
                Ready to Assign
              </span>
              <Icon name="account_balance_wallet" className="text-[20px] text-primary" />
            </div>
            <div>
              <div className="mb-space-xs text-headline-lg font-bold text-primary">
                {formatMoneyExact(readyToAssign)}
              </div>
              <div className="text-body-sm font-medium text-on-surface-variant">
                Income minus budgeted
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-base p-space-lg shadow-sm">
            <div className="mb-space-md flex items-center justify-between">
              <span className="text-label-md uppercase tracking-wider text-on-surface-variant">
                System Status
              </span>
              <Icon
                name={latestSync.length > 0 ? 'check_circle' : 'schedule'}
                className={`text-[20px] ${
                  latestSync.length > 0 ? 'text-status-success' : 'text-on-surface-variant'
                }`}
              />
            </div>
            <div>
              <div className="mb-space-xs text-headline-sm font-bold text-on-surface">
                {latestSync.length > 0 ? 'Synced' : 'Idle'}
              </div>
              <div className="text-body-sm text-on-surface-variant">{syncedLabel}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-space-xl lg:grid-cols-3">
          <div className="flex flex-col gap-space-xl lg:col-span-2">
            <div className="flex flex-col gap-space-lg rounded-xl border border-outline-variant bg-surface-base p-space-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-headline-md font-bold text-on-surface">
                    Spending by Category
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    Top active budgets for this month
                  </p>
                </div>
                <Icon name="category" className="text-on-surface-variant" />
              </div>

              <div className="flex flex-col gap-space-md">
                {categoryRows.length === 0 && (
                  <p className="text-body-md text-on-surface-variant">
                    No spending yet this month. Sync accounts or record a transaction.
                  </p>
                )}
                {categoryRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className={`flex flex-col gap-space-xs ${
                      idx < categoryRows.length - 1
                        ? 'border-b border-outline-variant pb-space-md'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-body-md">
                      <div className="flex items-center gap-space-sm font-medium text-on-surface">
                        <span className="text-lg leading-none" aria-hidden>
                          {row.emoji || '📁'}
                        </span>
                        {row.name}
                      </div>
                      <div className="text-body-sm font-medium text-on-surface-variant">
                        {formatMoney(row.activity)} / {formatMoney(row.budgeted)}{' '}
                        <span className={`ml-space-xs font-semibold ${statusColor(row.pct)}`}>
                          ({row.pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
                      <div
                        className={`h-full rounded-full ${barColor(row.pct)}`}
                        style={{ width: `${Math.min(row.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-space-sm">
                <button
                  type="button"
                  onClick={() => navigate('/budgets')}
                  className="flex items-center gap-space-xs text-body-md font-medium text-primary hover:underline"
                >
                  View all categories
                  <Icon name="arrow_forward" className="text-[16px]" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-space-md">
              <button
                type="button"
                onClick={() => navigate('/budgets')}
                className="flex items-center gap-space-sm rounded-lg bg-primary px-space-lg py-space-md text-body-md font-medium text-on-primary shadow-sm transition-colors hover:bg-primary/90"
              >
                <Icon name="add_card" className="text-[18px]" />
                Assign Money
              </button>
              <button
                type="button"
                onClick={() => navigate('/transactions')}
                className="flex items-center gap-space-sm rounded-lg border border-outline-variant bg-surface-base px-space-lg py-space-md text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="receipt_long" className="text-[18px]" />
                Record Transaction
              </button>
              <button
                type="button"
                onClick={() => navigate('/budgets')}
                className="flex items-center gap-space-sm rounded-lg border border-outline-variant bg-surface-base px-space-lg py-space-md text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="category" className="text-[18px]" />
                Manage Categories
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-space-xl">
            <div className="flex flex-col gap-space-lg rounded-xl border border-outline-variant bg-surface-base p-space-xl shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md font-bold text-on-surface">Accounts</h2>
                <Icon name="account_balance" className="text-on-surface-variant" />
              </div>
              <div className="flex flex-col gap-space-md">
                {accounts.length === 0 && (
                  <p className="text-body-sm text-on-surface-variant">
                    No linked accounts yet.
                  </p>
                )}
                {accounts.map((account, idx) => (
                  <div
                    key={account.id}
                    className={`flex items-center justify-between ${
                      idx < accounts.length - 1
                        ? 'border-b border-outline-variant pb-space-md'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <Icon
                        name={accountIcon(account.type)}
                        className="text-[20px] text-primary"
                      />
                      <div>
                        <div className="font-medium text-on-surface">{account.name}</div>
                        <div className="text-label-sm text-on-surface-variant">
                          {account.institution} {account.accountNumber}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-sm">
                      <span
                        className={`font-semibold ${
                          account.balance < 0 ? 'text-status-error' : 'text-on-surface'
                        }`}
                      >
                        {formatMoney(account.balance)}
                      </span>
                      <Icon
                        name={account.balance < 0 ? 'error' : 'check'}
                        className={`text-[16px] ${
                          account.balance < 0 ? 'text-status-error' : 'text-status-success'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-space-md rounded-xl border border-outline-variant bg-surface-base p-space-xl shadow-sm">
              <h3 className="text-headline-sm font-bold text-on-surface">Monthly Pace</h3>
              <p className="text-body-sm text-on-surface-variant">
                You have used {budgetUsedPct}% of your budgeted amount with{' '}
                {Math.max(daysInMonth - day, 0)} days remaining.
              </p>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-container">
                <div className="h-full bg-primary" style={{ width: `${budgetUsedPct}%` }} />
              </div>
              <div className="flex justify-between text-label-sm text-on-surface-variant">
                <span>
                  Day {day} of {daysInMonth}
                </span>
                <span>{budgetUsedPct > 100 ? 'Over budget' : 'On track'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
