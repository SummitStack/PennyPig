import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudgetStore, useReadyToAssign } from '../store/budgetStore'
import { useAccountStore } from '../store/accountStore'
import { useTransactionStore } from '../store/transactionStore'
import { useAuthStore } from '../store/authStore'
import MainLayout from '../components/Layout/MainLayout'
import Icon from '../components/ui/Icon'
import Amount from '../components/ui/Amount'
import { getLeafCategories, isUnderSavingsGoals } from '../lib/categories'
import { monthSpending, incomeForMonth } from '../lib/budgetMath'
import { currentMonthKey, formatMonthLabel, money } from '../lib/money'
import { accountNetContribution, currentNetWorth, netWorthByMonth } from '../lib/reportMath'
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
          <Amount value={money(now)} className="mt-1 block text-[22px] font-medium leading-7 tracking-[-0.02em] text-on-surface" />
          <p className={`mt-0.5 text-label-md ${up ? 'text-primary' : 'text-on-surface-variant'}`}>
            {up ? '+' : '\u2212'}
            {money(Math.abs(change))} since {firstLabel}
          </p>
        </div>
        <button type="button" onClick={onOpen} className="btn btn-ghost btn-sm">
          Reports
          <Icon name="chevron_right" className="text-[16px]" />
        </button>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3 h-16 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="nw-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-primary))" stopOpacity="0.14" />
            <stop offset="100%" stopColor="rgb(var(--c-primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#nw-fill)" />
        <path
          d={line}
          fill="none"
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-primary"
        />
      </svg>
    </section>
  )
}

/** One cell of the summary strip: a quiet label over the number. */
function Stat({ label, value, tone = 'neutral', hint }) {
  const toneClass =
    tone === 'good' ? 'text-primary' : tone === 'bad' ? 'text-status-error' : 'text-on-surface'
  return (
    <div className="min-w-0 bg-surface-base px-4 py-4 sm:px-5">
      <div className="truncate text-label-md text-on-surface-variant">{label}</div>
      <Amount value={value} className={`mt-1.5 block text-[22px] font-medium leading-7 tracking-[-0.02em] ${toneClass}`} />
      {hint && <div className="mt-0.5 text-label-md text-on-surface-variant">{hint}</div>}
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
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-label-md font-semibold text-primary">
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
  const bankIssues = useAccountStore((state) => state.bankIssues)
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
    // Card payment categories hold money for the card bill, not spending.
    const leaves = getLeafCategories(categories, 'expense').filter(
      (cat) => !isUnderSavingsGoals(categories, cat) && !cat.isCcPayment
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

  // A first name if they gave one; never the part of their email before the @.
  const meta = user?.user_metadata || {}
  const name = String(meta.first_name || meta.full_name || meta.name || '').trim().split(/\s+/)[0] || ''

  // With nothing assigned or spent this month, show where the money already
  // sitting in categories is, instead of "$0.00 of $0.00".
  const groupAvailable =
    usedPct == null && spendSpent === 0
      ? categories
          .filter((g) => g.type === 'expense' && categories.some((c) => c.parentId === g.id && !categories.some((k) => k.parentId === c.id)))
          .map((g) => ({ id: g.id, name: g.name, emoji: g.emoji, available: getAvailableFor(g.id) }))
          .filter((g) => Math.abs(g.available) >= 0.005)
          .sort((a, b) => b.available - a.available)
      : []
  const totalHeld = groupAvailable.reduce((sum, g) => sum + g.available, 0)
  const newUser = accounts.length === 0

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{formatMonthLabel(currentMonth)}</p>
            <h1 className="mt-0.5 font-display text-headline-lg text-on-surface">
              {greeting()}
              {name ? `, ${name}` : ''}
            </h1>
          </div>
          {!newUser && (
            <div className="flex gap-2">
              <button type="button" onClick={() => navigate('/transactions')} className="btn btn-secondary">
                <Icon name="add" className="text-[16px]" />
                Transaction
              </button>
              <button type="button" onClick={() => navigate('/budgets')} className="btn btn-primary">
                <Icon name="account_balance_wallet" className="text-[16px]" />
                Assign money
              </button>
            </div>
          )}
        </div>

        {newUser && <Onboarding onGo={navigate} />}

        {bankIssues.length > 0 && (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-xl border border-border-hairline bg-surface-base px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            data-testid="bank-issue-notice"
          >
            <p className="flex items-start gap-2.5 text-body-sm text-on-surface">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-status-warning" aria-hidden="true" />
              {bankIssues.some((i) => i.needsReconnect)
                ? `${bankIssues.find((i) => i.needsReconnect).institution} needs you to sign in again, so new transactions aren't coming in.`
                : `${bankIssues[0].institution} didn't sync last time. It will try again tomorrow.`}
            </p>
            {bankIssues.some((i) => i.needsReconnect) && (
              <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={() => navigate('/accounts')}>
                Reconnect
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/budgets')}
          className={`card group p-5 text-left transition-colors hover:border-outline-variant sm:p-6 ${
            readyToAssign < 0 ? 'border-status-error/40' : ''
          }`}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${readyToAssign < 0 ? 'bg-status-error' : 'bg-primary'}`}
                  aria-hidden="true"
                />
                Ready to assign
              </div>
              <Amount
                value={money(readyToAssign)}
                className={`mt-1.5 block text-[40px] font-medium leading-[44px] tracking-[-0.03em] ${
                  readyToAssign < 0 ? 'text-status-error' : 'text-on-surface'
                }`}
              />
              <div className="mt-1 text-body-sm text-on-surface-variant">
                {readyToAssign < 0
                  ? 'You assigned more than you have. Move money out of a category.'
                  : readyToAssign > 0
                    ? 'Money waiting for a job.'
                    : 'Every dollar has a job.'}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-body-sm font-medium text-on-surface-variant group-hover:text-on-surface">
              Go to budget
              <Icon name="arrow_forward" className="text-[16px] transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border-hairline bg-border-hairline lg:grid-cols-4">
          <Stat label={`Money in · ${monthLabel}`} value={money(moneyIn)} tone="good" />
          <Stat
            label={`Money out · ${monthLabel}`}
            value={money(spent)}
            hint={uncategorized > 0 ? `${money(uncategorized)} uncategorized` : null}
          />
          <Stat
            label="Net this month"
            value={money(moneyIn - spent)}
            tone={moneyIn - spent < 0 ? 'bad' : 'neutral'}
          />
          <Stat label="Net worth" value={money(netWorth)} />
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
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
              <div className="rounded-lg border border-dashed border-outline-variant px-4 py-8 text-center text-body-sm text-on-surface-variant">
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
                          <span className="font-medium text-on-surface">{money(row.activity)}</span>
                          {' of '}
                          {money(row.budgeted)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
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
            {groupAvailable.length > 0 ? (
              <section className="card p-5 sm:p-6" data-testid="dashboard-held">
                <h2 className="font-display text-headline-sm text-on-surface">
                  {money(totalHeld)} ready in your categories
                </h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Nothing assigned or spent in {monthLabel} yet. This is what carried over.
                </p>
                <ul className="mt-3">
                  {groupAvailable.slice(0, 5).map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-3 border-b border-border-hairline py-2 last:border-0">
                      <span className="truncate text-body-sm text-on-surface">
                        {g.emoji ? `${g.emoji} ` : ''}
                        {g.name}
                      </span>
                      <span className={`num text-body-sm font-semibold ${g.available < 0 ? 'text-status-error' : 'text-on-surface'}`}>
                        {money(g.available)}
                      </span>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => navigate('/budgets')} className="btn btn-ghost btn-sm mt-2 px-0 text-primary">
                  Assign {monthLabel}
                  <Icon name="chevron_right" className="text-[16px]" />
                </button>
              </section>
            ) : (
            <section className="card p-5 sm:p-6">
              <h2 className="font-display text-headline-sm text-on-surface">{pace.title}</h2>
              <p className="mt-1 text-body-sm text-on-surface-variant">{pace.text}</p>
              <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
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
            )}

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
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
                        >
                          <Icon name={accountIcon(account.type)} className="text-[18px]" />
                        </span>
                        <span className="truncate text-body-md text-on-surface">{account.name}</span>
                      </div>
                      <Amount
                        value={money(accountNetContribution(account))}
                        className="shrink-0 text-body-md font-medium text-on-surface"
                        cents={false}
                      />
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
