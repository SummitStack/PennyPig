import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudgetStore, useReadyToAssign } from '../store/budgetStore'
import { useAccountStore } from '../store/accountStore'
import { useTransactionStore } from '../store/transactionStore'
import { useAuthStore } from '../store/authStore'
import MainLayout from '../components/Layout/MainLayout'
import Icon from '../components/ui/Icon'
import { getLeafCategories, isUnderSavingsGoals } from '../lib/categories'
import { monthSpending, incomeForMonth } from '../lib/budgetMath'
import { currentMonthKey, formatMonthLabel, money } from '../lib/money'
import { accountNetContribution, currentNetWorth, isLiability, netWorthByMonth } from '../lib/reportMath'
import RecurringPanel from '../components/Transactions/RecurringPanel'

function accountIcon(type) {
  if (type === 'credit') return 'credit_card'
  if (type === 'savings') return 'savings'
  if (type === 'loan') return 'real_estate_agent'
  return 'account_balance'
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function NetWorthTrend({ points, now, onOpen }) {
  const series = points.slice(-12)
  if (series.length < 2) return null
  const values = series.map((p) => p.netWorth)
  const first = values[0]
  const change = now - first
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 240
  const h = 64
  const step = w / (series.length - 1)
  const pts = values.map((v, i) => [i * step, h - 4 - ((v - min) / span) * (h - 8)])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const up = change >= 0
  const firstLabel = new Date(`${series[0].month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
    <section className="card p-5 sm:p-6" data-testid="networth-trend">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-headline-sm text-on-surface">Net worth</h2>
          <p className="num mt-1 text-headline-sm font-semibold text-on-surface">{money(now)}</p>
          <p className={`text-label-md ${up ? 'text-primary' : 'text-status-error'}`}>
            {up ? '+' : '-'}
            {money(Math.abs(change))} since {firstLabel}
          </p>
        </div>
        <button type="button" onClick={onOpen} className="btn btn-ghost btn-sm">
          Reports
          <Icon name="chevron_right" className="text-[16px]" />
        </button>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3 h-16 w-full" aria-hidden="true">
        <path d={area} className={up ? 'fill-primary/10' : 'fill-status-error/10'} />
        <path
          d={line}
          fill="none"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          className={up ? 'stroke-primary' : 'stroke-status-error'}
        />
      </svg>
    </section>
  )
}

function Stat({ label, value, icon, tone = 'neutral', hint }) {
  const toneClass =
    tone === 'good' ? 'text-primary' : tone === 'bad' ? 'text-status-error' : 'text-on-surface'
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-label-md font-medium text-on-surface-variant">{label}</span>
        <Icon name={icon} className="text-[18px] text-on-surface-variant" />
      </div>
      <div className={`num mt-2 font-display text-headline-md sm:text-headline-lg ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-label-md text-on-surface-variant">{hint}</div>}
    </div>
  )
}

const ONBOARDING_STEPS = [
  {
    title: 'Add an account',
    text: 'Link your bank or add a checking account by hand with its current balance.',
    to: '/accounts',
    cta: 'Add account',
  },
  {
    title: 'Give every dollar a job',
    text: 'Assign your money to categories like rent, groceries and savings.',
    to: '/budgets',
    cta: 'Open budget',
  },
  {
    title: 'Track spending',
    text: 'Import from your bank or a CSV, or record transactions as you go.',
    to: '/transactions',
    cta: 'Add transaction',
  },
]

function Onboarding({ onGo }) {
  return (
    <section className="card overflow-hidden">
      <div className="relative border-b border-border-hairline bg-surface-container-low px-5 py-6 sm:px-6">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
          aria-hidden="true"
        />
        <p className="eyebrow">Get started</p>
        <h2 className="mt-1 font-display text-headline-md text-on-surface">
          Three steps to your first budget
        </h2>
      </div>
      <ol className="grid divide-y divide-border-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
        {ONBOARDING_STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-2 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-label-md font-bold text-primary">
                {i + 1}
              </span>
              <span className="font-display text-headline-sm text-on-surface">{s.title}</span>
            </div>
            <p className="flex-1 text-body-sm text-on-surface-variant">{s.text}</p>
            <button
              type="button"
              onClick={() => onGo(s.to)}
              className={`btn mt-1 self-start ${i === 0 ? 'btn-primary' : 'btn-secondary'}`}
            >
              {s.cta}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const allAccounts = useAccountStore((state) => state.linkedAccounts)
  const accounts = useMemo(() => allAccounts.filter((a) => !a.closed), [allAccounts])
  const categories = useTransactionStore((state) => state.categories)
  const transactions = useTransactionStore((state) => state.transactions)
  const budgets = useBudgetStore((state) => state.budgets)
  const currentMonth = useBudgetStore((state) => state.currentMonth)
  const getBudgetedFor = useBudgetStore((state) => state.getBudgetedFor)
  const getActivityFor = useBudgetStore((state) => state.getActivityFor)
  const getAvailableFor = useBudgetStore((state) => state.getAvailableFor)
  const readyToAssign = useReadyToAssign()

  const isThisMonth = currentMonth === currentMonthKey()
  const monthLabel = formatMonthLabel(currentMonth, { month: 'long' })

  // Real money in and out. Money Out used to add savings-goal funding and
  // leave out uncategorized spending.
  const { moneyIn, spent, uncategorized } = useMemo(() => {
    const s = monthSpending({ transactions, categories, month: currentMonth })
    return {
      moneyIn: incomeForMonth(transactions, categories, currentMonth),
      spent: s.total,
      uncategorized: s.uncategorized,
    }
  }, [transactions, categories, currentMonth])

  const { categoryRows, spendBudgeted, spendSpent } = useMemo(() => {
    // Savings goals are money set aside, not spending, so leave them out here.
    const leaves = getLeafCategories(categories, 'expense').filter(
      (cat) => !isUnderSavingsGoals(categories, cat)
    )
    const rows = leaves
      .map((cat) => {
        const budgeted = getBudgetedFor(cat.id)
        const activity = getActivityFor(cat.id)
        if (budgeted === 0 && activity === 0) return null
        return {
          id: cat.id,
          name: cat.name,
          emoji: cat.emoji,
          budgeted,
          activity,
          available: getAvailableFor(cat.id),
        }
      })
      .filter(Boolean)
    return {
      categoryRows: [...rows].sort((a, b) => b.activity - a.activity).slice(0, 6),
      spendBudgeted: rows.reduce((sum, r) => sum + r.budgeted, 0),
      spendSpent: rows.reduce((sum, r) => sum + r.activity, 0),
    }
    // budgets and transactions drive the getters' results
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, budgets, transactions, currentMonth])

  const netWorth = currentNetWorth(accounts)
  const netWorthSeries = useMemo(
    () => netWorthByMonth({ accounts, transactions, endMonth: currentMonth }),
    [accounts, transactions, currentMonth]
  )

  const now = new Date()
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const timePct = Math.round((day / daysInMonth) * 100)
  const usedPct = spendBudgeted > 0 ? Math.round((spendSpent / spendBudgeted) * 100) : null

  // Pace used to say "0% … On track" when nothing was assigned.
  let pace
  if (usedPct == null) {
    pace = {
      tone: 'neutral',
      title: spendSpent > 0 ? 'Nothing assigned to spending' : 'No budget yet',
      text:
        spendSpent > 0
          ? `You've spent ${money(spendSpent)} in categories with nothing assigned.`
          : 'Assign money to categories to track your pace.',
    }
  } else if (usedPct > 100) {
    pace = { tone: 'bad', title: 'Over budget', text: `${usedPct}% of assigned spending is used.` }
  } else if (isThisMonth && usedPct > timePct + 10) {
    pace = {
      tone: 'warn',
      title: 'Spending ahead of pace',
      text: `${usedPct}% used with ${timePct}% of the month gone.`,
    }
  } else {
    pace = {
      tone: 'good',
      title: 'On track',
      text: isThisMonth
        ? `${usedPct}% used with ${timePct}% of the month gone.`
        : `${usedPct}% of assigned spending used.`,
    }
  }

  const paceColor = {
    good: 'bg-primary',
    warn: 'bg-status-warning',
    bad: 'bg-status-error',
    neutral: 'bg-outline-variant',
  }[pace.tone]

  const name = (user?.email || '').split('@')[0]
  const newUser = accounts.length === 0

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{formatMonthLabel(currentMonth)}</p>
            <h1 className="mt-1 font-display text-headline-lg text-on-surface">
              {greeting()}
              {name ? `, ${name}` : ''}
            </h1>
          </div>
          {!newUser && (
            <div className="flex gap-2">
              <button type="button" onClick={() => navigate('/transactions')} className="btn btn-secondary">
                <Icon name="add" className="text-[18px]" />
                Transaction
              </button>
              <button type="button" onClick={() => navigate('/budgets')} className="btn btn-primary">
                <Icon name="account_balance_wallet" className="text-[18px]" />
                Assign money
              </button>
            </div>
          )}
        </div>

        {newUser && <Onboarding onGo={navigate} />}

        <button
          type="button"
          onClick={() => navigate('/budgets')}
          className={`group relative overflow-hidden rounded-2xl p-5 text-left ring-1 transition-shadow hover:shadow-pop sm:p-6 ${
            readyToAssign < 0
              ? 'bg-status-error/10 ring-status-error/25'
              : 'bg-gradient-to-br from-primary/15 via-primary/5 to-cool-blue/10 ring-primary/20'
          }`}
        >
          <div
            className={`pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full blur-3xl ${
              readyToAssign < 0 ? 'bg-status-error/20' : 'bg-primary/25'
            }`}
            aria-hidden="true"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div
                className={`text-label-md font-semibold ${
                  readyToAssign < 0 ? 'text-status-error' : 'text-primary'
                }`}
              >
                Ready to assign
              </div>
              <div
                className={`num mt-1 font-display text-headline-xl ${
                  readyToAssign < 0 ? 'text-status-error' : 'text-on-surface'
                }`}
              >
                {money(readyToAssign)}
              </div>
              <div className="mt-1 text-body-sm text-on-surface-variant">
                {readyToAssign < 0
                  ? 'You assigned more than you have. Move money out of a category.'
                  : readyToAssign > 0
                    ? 'Money waiting for a job.'
                    : 'Every dollar has a job.'}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary">
              Go to budget
              <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={`Money in · ${monthLabel}`} value={money(moneyIn)} icon="south_west" tone="good" />
          <Stat
            label={`Money out · ${monthLabel}`}
            value={money(spent)}
            icon="north_east"
            hint={uncategorized > 0 ? `${money(uncategorized)} uncategorized` : null}
          />
          <Stat
            label="Net this month"
            value={money(moneyIn - spent)}
            icon="balance"
            tone={moneyIn - spent < 0 ? 'bad' : 'neutral'}
          />
          <Stat label="Net worth" value={money(netWorth)} icon="monitoring" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="card p-5 sm:p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-headline-sm text-on-surface">Top categories</h2>
                <p className="text-body-sm text-on-surface-variant">Spent against assigned this month</p>
              </div>
              <button type="button" onClick={() => navigate('/budgets')} className="btn btn-ghost btn-sm">
                All
                <Icon name="chevron_right" className="text-[16px]" />
              </button>
            </div>

            {categoryRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant px-4 py-8 text-center text-body-sm text-on-surface-variant">
                No spending yet this month.
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {categoryRows.map((row) => {
                  const pct =
                    row.budgeted > 0 ? (row.activity / row.budgeted) * 100 : row.activity > 0 ? 100 : 0
                  const over = row.available < 0
                  const bar = over ? 'bg-status-error' : pct >= 85 ? 'bg-status-warning' : 'bg-primary'
                  return (
                    <li key={row.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-body-md font-medium text-on-surface">
                          <span aria-hidden="true">{row.emoji || '•'}</span>
                          <span className="truncate">{row.name}</span>
                        </span>
                        <span className="num shrink-0 text-body-sm text-on-surface-variant">
                          <span className="font-semibold text-on-surface">{money(row.activity)}</span>
                          {' of '}
                          {money(row.budgeted)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
                        <div
                          className={`h-full rounded-full ${bar} transition-[width] duration-500`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      {over && (
                        <p className="mt-1 text-label-md text-status-error">
                          Overspent by {money(Math.abs(row.available))}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-5">
            <RecurringPanel compact />
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-headline-sm text-on-surface">{pace.title}</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">{pace.text}</p>
              <div className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-container">
                <div
                  className={`h-full rounded-full ${paceColor}`}
                  style={{ width: `${Math.min(usedPct ?? 0, 100)}%` }}
                />
                {isThisMonth && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-on-surface/60"
                    style={{ left: `${timePct}%` }}
                    title="Today"
                  />
                )}
              </div>
              <div className="mt-2 flex justify-between text-label-md text-on-surface-variant">
                <span className="num">
                  {money(spendSpent)} of {money(spendBudgeted)}
                </span>
                {isThisMonth && (
                  <span>
                    Day {day} of {daysInMonth}
                  </span>
                )}
              </div>
            </section>

            <NetWorthTrend points={netWorthSeries} now={netWorth} onOpen={() => navigate('/reports')} />
            <section className="card p-5 sm:p-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-display text-headline-sm text-on-surface">Accounts</h2>
                <button type="button" onClick={() => navigate('/accounts')} className="btn btn-ghost btn-sm">
                  Manage
                  <Icon name="chevron_right" className="text-[16px]" />
                </button>
              </div>
              {accounts.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No accounts yet.</p>
              ) : (
                <ul>
                  {accounts.map((account) => (
                    <li
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
                        <span className="truncate text-body-md text-on-surface">{account.name}</span>
                      </div>
                      <span
                        className={`num shrink-0 text-body-md font-semibold ${
                          accountNetContribution(account) < 0 ? 'text-status-error' : 'text-on-surface'
                        }`}
                      >
                        {money(accountNetContribution(account))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
