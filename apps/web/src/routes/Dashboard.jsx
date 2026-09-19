import { useNavigate } from 'react-router-dom'
import { useBudgetStore } from '../store/budgetStore'
import { useTransactionStore } from '../store/transactionStore'
import MainLayout from '../components/Layout/MainLayout'

export default function Dashboard() {
  const navigate = useNavigate()
  const accounts = useTransactionStore((state) => state.accounts)
  const { budgets, currentMonth, getCategoryStatus, getTotalSpent, getTotalBudgeted } =
    useBudgetStore()
  const categories = Object.keys(budgets[currentMonth] || {})

  const netWorth = accounts.reduce((sum, acc) => {
    const balance = Number(acc.balance) || 0
    return acc.type === 'credit' ? sum - Math.abs(balance) : sum + balance
  }, 0)

  const totalSpent = getTotalSpent()
  const totalBudgeted = getTotalBudgeted()
  const totalRemaining = totalBudgeted - totalSpent
  const budgetHealth = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  const overBudget = categories.filter((cat) => getCategoryStatus(cat).status === 'over').length
  const underBudget = categories.filter((cat) => getCategoryStatus(cat).status === 'under').length

  const monthLabel = new Date(`${currentMonth}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Dashboard</h1>
          <p className="text-body-md text-on-surface-variant mt-2">{monthLabel}</p>
        </div>

        <div className="bg-gradient-to-r from-primary to-primary bg-opacity-10 rounded-lg p-8 border border-primary border-opacity-20">
          <p className="text-label-md text-on-surface-variant uppercase tracking-wide">
            Total Net Worth
          </p>
          <p className="text-5xl font-bold text-primary mt-2">${netWorth.toFixed(2)}</p>
          <p className="text-body-sm text-on-surface-variant mt-3">
            Assets minus credit balances
          </p>
        </div>

        <div>
          <h2 className="text-headline-sm font-bold text-on-surface mb-4">Account Balances</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-surface-container rounded-lg p-6 border border-border-hairline hover:border-primary transition-colors"
              >
                <p className="text-label-md text-on-surface-variant">{account.name}</p>
                <p className="text-headline-md font-bold text-on-surface mt-2">
                  ${Number(account.balance).toFixed(2)}
                </p>
                <p className="text-body-sm text-on-surface-variant mt-1 capitalize">{account.type}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-headline-sm font-bold text-on-surface mb-4">Budget Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
              <p className="text-label-md text-on-surface-variant">Overall Health</p>
              <p className="text-headline-md font-bold mt-2">
                <span
                  className={
                    budgetHealth > 100
                      ? 'text-status-error'
                      : budgetHealth > 80
                        ? 'text-status-warning'
                        : 'text-status-success'
                  }
                >
                  {budgetHealth}%
                </span>
              </p>
              <div className="w-full bg-surface rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    budgetHealth > 100
                      ? 'bg-status-error'
                      : budgetHealth > 80
                        ? 'bg-status-warning'
                        : 'bg-status-success'
                  }`}
                  style={{ width: `${Math.min(budgetHealth, 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
              <p className="text-label-md text-on-surface-variant">Budgeted</p>
              <p className="text-headline-md font-bold text-on-surface mt-2">
                ${totalBudgeted.toFixed(2)}
              </p>
              <p className="text-body-sm text-on-surface-variant mt-1">This month</p>
            </div>

            <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
              <p className="text-label-md text-on-surface-variant">Spent</p>
              <p className="text-headline-md font-bold text-on-surface mt-2">
                ${totalSpent.toFixed(2)}
              </p>
              <p className="text-body-sm text-on-surface-variant mt-1">This month</p>
            </div>

            <div
              className={`rounded-lg p-6 border ${
                totalRemaining >= 0
                  ? 'bg-status-success bg-opacity-10 border-status-success'
                  : 'bg-status-error bg-opacity-10 border-status-error'
              }`}
            >
              <p className="text-label-md text-on-surface-variant">Remaining</p>
              <p
                className={`text-headline-md font-bold mt-2 ${
                  totalRemaining >= 0 ? 'text-status-success' : 'text-status-error'
                }`}
              >
                ${totalRemaining.toFixed(2)}
              </p>
              <p className="text-body-sm text-on-surface-variant mt-1">Unspent</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-headline-sm font-bold text-on-surface mb-4">Category Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
              <div className="flex justify-between items-center mb-4">
                <p className="text-headline-sm font-bold text-on-surface">On Track</p>
                <span className="text-headline-md font-bold text-status-success">{underBudget}</span>
              </div>
              <div className="space-y-2">
                {categories
                  .filter((cat) => getCategoryStatus(cat).status === 'under')
                  .slice(0, 5)
                  .map((cat) => (
                    <div key={cat} className="flex justify-between text-body-sm">
                      <span className="text-on-surface">{cat}</span>
                      <span className="text-status-success">✓</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
              <div className="flex justify-between items-center mb-4">
                <p className="text-headline-sm font-bold text-on-surface">Over Budget</p>
                <span
                  className={`text-headline-md font-bold ${
                    overBudget > 0 ? 'text-status-error' : 'text-status-success'
                  }`}
                >
                  {overBudget}
                </span>
              </div>
              <div className="space-y-2">
                {categories
                  .filter((cat) => getCategoryStatus(cat).status === 'over')
                  .slice(0, 5)
                  .map((cat) => (
                    <div key={cat} className="flex justify-between text-body-sm">
                      <span className="text-on-surface">{cat}</span>
                      <span className="text-status-error">!</span>
                    </div>
                  ))}
                {overBudget === 0 && (
                  <p className="text-body-sm text-on-surface-variant">All categories in budget</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/transactions')}
            className="flex-1 py-3 bg-primary text-surface rounded font-medium hover:opacity-90 transition-opacity"
          >
            + Add Transaction
          </button>
          <button
            onClick={() => navigate('/transactions')}
            className="flex-1 py-3 bg-surface-container text-on-surface border border-border-hairline rounded font-medium hover:bg-surface-container-high transition-colors"
          >
            View Transactions
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
