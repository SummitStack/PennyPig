import { useEffect, useMemo, useState } from 'react'
import MainLayout from '../components/Layout/MainLayout'
import Icon from '../components/ui/Icon'
import { useBudgetStore } from '../store/budgetStore'
import { useTransactionStore } from '../store/transactionStore'
import { useAccountStore } from '../store/accountStore'
import {
  spendingByCategory,
  incomeVsExpense,
  monthlyTrend,
  netWorthByMonth,
  currentNetWorth,
  formatMonthLabel,
  monthBounds,
  shiftMonth,
} from '../lib/reportMath'
import {
  downloadJson,
  exportTransactionsCsv,
  exportBudgetCsv,
  exportReportSummaryCsv,
} from '../lib/exportData'
import { getLeafCategories } from '../lib/categories'
import { formatMoney } from '../lib/money'

function money(n) {
  return formatMoney(n)
}

function RangeBar({ value, max, tone = 'primary' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const color =
    tone === 'income'
      ? 'bg-status-success'
      : tone === 'expense'
        ? 'bg-status-error'
        : tone === 'net-pos'
          ? 'bg-sage-accent'
          : tone === 'net-neg'
            ? 'bg-status-error'
            : 'bg-cool-blue'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

const TABS = [
  { id: 'spending', label: 'Spending' },
  { id: 'income', label: 'Income vs Expense' },
  { id: 'trends', label: 'Trends' },
  { id: 'networth', label: 'Net Worth' },
  { id: 'export', label: 'Export' },
]

export default function Reports() {
  const currentMonth = useBudgetStore((s) => s.currentMonth)
  const budgets = useBudgetStore((s) => s.budgets)
  const getBudgetedFor = useBudgetStore((s) => s.getBudgetedFor)
  const getActivityFor = useBudgetStore((s) => s.getActivityFor)
  const getAvailableFor = useBudgetStore((s) => s.getAvailableFor)
  const loadBudgetHistory = useBudgetStore((s) => s.loadBudgetHistory)

  const transactions = useTransactionStore((s) => s.transactions)
  const categories = useTransactionStore((s) => s.categories)
  const splits = useTransactionStore((s) => s.splits)
  const loadData = useTransactionStore((s) => s.loadData)

  const accounts = useAccountStore((s) => s.linkedAccounts)
  const loadAccounts = useAccountStore((s) => s.loadAccounts)

  const [tab, setTab] = useState('spending')
  const [dateFrom, setDateFrom] = useState(() => monthBounds(currentMonth).from)
  const [dateTo, setDateTo] = useState(() => monthBounds(currentMonth).to)

  useEffect(() => {
    loadData()
    loadAccounts()
    loadBudgetHistory()
  }, [loadData, loadAccounts, loadBudgetHistory])

  useEffect(() => {
    const b = monthBounds(currentMonth)
    setDateFrom(b.from)
    setDateTo(b.to)
  }, [currentMonth])

  const splitsByTxn = useMemo(() => {
    const map = {}
    for (const s of splits || []) {
      if (!map[s.transactionId]) map[s.transactionId] = []
      map[s.transactionId].push(s)
    }
    return map
  }, [splits])

  const spending = useMemo(
    () =>
      spendingByCategory({
        transactions,
        categories,
        splitsByTxn,
        dateFrom,
        dateTo,
      }),
    [transactions, categories, splitsByTxn, dateFrom, dateTo]
  )

  const ive = useMemo(
    () =>
      incomeVsExpense({
        transactions,
        categories,
        splitsByTxn,
        dateFrom,
        dateTo,
      }),
    [transactions, categories, splitsByTxn, dateFrom, dateTo]
  )

  const trendStart = shiftMonth(currentMonth, -5)
  const trend = useMemo(
    () =>
      monthlyTrend({
        transactions,
        categories,
        splitsByTxn,
        startMonth: trendStart,
        endMonth: currentMonth,
      }),
    [transactions, categories, splitsByTxn, trendStart, currentMonth]
  )

  const netWorthSeries = useMemo(
    () =>
      netWorthByMonth({
        accounts,
        transactions,
        endMonth: currentMonth,
      }),
    [accounts, transactions, currentMonth]
  )

  const netNow = currentNetWorth(accounts)
  const maxSpend = spending.rows[0]?.amount || 0
  const maxTrend = Math.max(1, ...trend.map((t) => Math.max(t.income, t.expense)))
  const maxNw = Math.max(1, ...netWorthSeries.map((p) => Math.abs(p.netWorth)), Math.abs(netNow))

  const setPreset = (preset) => {
    if (preset === 'this') {
      const b = monthBounds(currentMonth)
      setDateFrom(b.from)
      setDateTo(b.to)
      return
    }
    if (preset === 'last') {
      const last = shiftMonth(currentMonth, -1)
      const b = monthBounds(last)
      setDateFrom(b.from)
      setDateTo(b.to)
      return
    }
    if (preset === 'ytd') {
      const year = currentMonth.slice(0, 4)
      setDateFrom(`${year}-01-01`)
      setDateTo(monthBounds(currentMonth).to)
      return
    }
    if (preset === '12m') {
      const fromMonth = shiftMonth(currentMonth, -11)
      setDateFrom(monthBounds(fromMonth).from)
      setDateTo(monthBounds(currentMonth).to)
    }
  }

  const handleExportTransactions = () => {
    const filtered = transactions.filter((t) => {
      const d =
        t.date instanceof Date
          ? `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}-${String(t.date.getDate()).padStart(2, '0')}`
          : String(t.date || '').slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
      return true
    })
    exportTransactionsCsv(filtered, `pennypig-transactions-${dateFrom}_to_${dateTo}.csv`)
  }

  const handleExportBudget = () => {
    const leaves = getLeafCategories(categories, 'expense')
    const rows = leaves.map((leaf) => ({
      name: leaf.name,
      assigned: getBudgetedFor(leaf.id, currentMonth),
      activity: getActivityFor(leaf.id, currentMonth),
      available: getAvailableFor(leaf.id, currentMonth),
    }))
    exportBudgetCsv(rows, currentMonth)
  }

  const handleExportSummary = () => {
    const rows = [
      { section: 'Range', label: 'From', amount: dateFrom },
      { section: 'Range', label: 'To', amount: dateTo },
      { section: 'Income vs Expense', label: 'Income', amount: ive.income },
      { section: 'Income vs Expense', label: 'Expense', amount: ive.expense },
      { section: 'Income vs Expense', label: 'Net', amount: ive.net },
      { section: 'Net Worth', label: 'Current', amount: netNow },
      ...spending.rows.map((r) => ({
        section: 'Spending',
        label: r.name,
        amount: r.amount,
      })),
    ]
    exportReportSummaryCsv(rows, `pennypig-report-${dateFrom}_to_${dateTo}.csv`)
  }

  const handleExportJson = () => {
    downloadJson(`pennypig-export-${dateFrom}_to_${dateTo}.json`, {
      exportedAt: new Date().toISOString(),
      range: { dateFrom, dateTo },
      currentMonth,
      incomeVsExpense: ive,
      spending: spending.rows,
      trend,
      netWorth: netWorthSeries,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: a.balance,
        onBudget: a.onBudget,
      })),
      budgets: budgets[currentMonth] || {},
      transactionCount: transactions.length,
    })
  }

  return (
    <MainLayout>
      <div className="mb-space-md flex flex-col gap-space-sm md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline-sm text-2xl font-bold tracking-tight text-on-surface">
            Reports
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            Spending, cash flow, trends, and net worth for any date range.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          <label className="flex flex-col gap-0.5 text-label-sm text-on-surface-variant">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-border-hairline bg-surface-container-high px-2 py-1.5 text-body-sm text-on-surface"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-label-sm text-on-surface-variant">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-border-hairline bg-surface-container-high px-2 py-1.5 text-body-sm text-on-surface"
            />
          </label>
          <div className="flex flex-wrap gap-1 pt-4">
            {[
              ['this', 'This month'],
              ['last', 'Last month'],
              ['ytd', 'YTD'],
              ['12m', '12 mo'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPreset(id)}
                className="rounded-lg border border-border-hairline bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-space-md flex gap-1 overflow-x-auto border-b border-border-hairline pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cursor-pointer whitespace-nowrap rounded-t-lg px-space-md py-2 text-sm transition-colors ${
              tab === t.id
                ? 'bg-surface-container-high font-semibold text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'spending' && (
        <div className="rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm">
          <div className="mb-space-md flex items-center justify-between">
            <div>
              <div className="font-headline-sm font-bold text-on-surface">Spending by category</div>
              <div className="text-label-sm text-on-surface-variant">
                Total {money(spending.total)}
              </div>
            </div>
            <Icon name="pie_chart" className="text-[22px] text-cool-blue" />
          </div>
          {spending.rows.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No spending in this range.</p>
          ) : (
            <ul className="flex flex-col gap-space-sm">
              {spending.rows.map((row) => (
                <li key={row.categoryId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-space-sm">
                    <span className="text-body-sm text-on-surface">
                      {row.emoji ? `${row.emoji} ` : ''}
                      {row.name}
                    </span>
                    <span className="text-body-sm font-semibold text-on-surface">
                      {money(row.amount)}
                    </span>
                  </div>
                  <RangeBar value={row.amount} max={maxSpend} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'income' && (
        <div className="grid grid-cols-1 gap-space-md lg:grid-cols-3">
          {[
            { label: 'Income', value: ive.income, tone: 'income', icon: 'trending_up' },
            { label: 'Expense', value: ive.expense, tone: 'expense', icon: 'trending_down' },
            {
              label: 'Net',
              value: ive.net,
              tone: ive.net >= 0 ? 'net-pos' : 'net-neg',
              icon: 'account_balance',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm"
            >
              <div className="mb-space-sm flex items-center justify-between">
                <span className="text-label-md uppercase tracking-wider text-on-surface-variant">
                  {card.label}
                </span>
                <Icon name={card.icon} className="text-[20px] text-on-surface-variant" />
              </div>
              <div className="text-headline-md font-bold text-on-surface">{money(card.value)}</div>
              <div className="mt-space-sm">
                <RangeBar
                  value={Math.abs(card.value)}
                  max={Math.max(ive.income, ive.expense, 1)}
                  tone={card.tone}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'trends' && (
        <div className="rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm">
          <div className="mb-space-md font-headline-sm font-bold text-on-surface">
            Last 6 months
          </div>
          <div className="flex flex-col gap-space-md">
            {trend.map((row) => (
              <div key={row.month} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium text-on-surface">
                    {formatMonthLabel(row.month)}
                  </span>
                  <span
                    className={`text-label-sm font-semibold ${
                      row.net >= 0 ? 'text-status-success' : 'text-status-error'
                    }`}
                  >
                    Net {money(row.net)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-space-sm">
                  <div>
                    <div className="mb-0.5 flex justify-between text-label-sm text-on-surface-variant">
                      <span>In</span>
                      <span>{money(row.income)}</span>
                    </div>
                    <RangeBar value={row.income} max={maxTrend} tone="income" />
                  </div>
                  <div>
                    <div className="mb-0.5 flex justify-between text-label-sm text-on-surface-variant">
                      <span>Out</span>
                      <span>{money(row.expense)}</span>
                    </div>
                    <RangeBar value={row.expense} max={maxTrend} tone="expense" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'networth' && (
        <div className="rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm">
          <div className="mb-space-md flex items-end justify-between gap-space-sm">
            <div>
              <div className="text-label-md uppercase tracking-wider text-on-surface-variant">
                Current net worth
              </div>
              <div className="text-headline-lg font-bold text-on-surface">{money(netNow)}</div>
            </div>
            <p className="max-w-sm text-right text-label-sm text-on-surface-variant">
              Reconstructed from current balances and transaction history.
            </p>
          </div>
          {netWorthSeries.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Add accounts to track net worth.</p>
          ) : (
            <ul className="flex flex-col gap-space-sm">
              {netWorthSeries.map((point) => (
                <li key={point.month} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm text-on-surface">
                      {formatMonthLabel(point.month)}
                    </span>
                    <span className="text-body-sm font-semibold text-on-surface">
                      {money(point.netWorth)}
                    </span>
                  </div>
                  <RangeBar
                    value={Math.abs(point.netWorth)}
                    max={maxNw}
                    tone={point.netWorth >= 0 ? 'net-pos' : 'net-neg'}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'export' && (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
          {[
            {
              title: 'Transactions CSV',
              detail: `Rows in ${dateFrom} → ${dateTo}`,
              icon: 'table_rows',
              onClick: handleExportTransactions,
            },
            {
              title: 'Budget CSV',
              detail: `Assigned / activity / available for ${formatMonthLabel(currentMonth)}`,
              icon: 'account_balance_wallet',
              onClick: handleExportBudget,
            },
            {
              title: 'Report summary CSV',
              detail: 'Income, expense, spending breakdown, net worth',
              icon: 'summarize',
              onClick: handleExportSummary,
            },
            {
              title: 'Full JSON dump',
              detail: 'Accounts, budgets, report series for the range',
              icon: 'data_object',
              onClick: handleExportJson,
            },
          ].map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={card.onClick}
              className="flex items-start gap-space-md rounded-xl border border-border-hairline bg-surface-base p-space-md text-left shadow-sm transition-colors hover:border-cool-blue/40 hover:bg-surface-container"
            >
              <Icon name={card.icon} className="text-[22px] text-cool-blue" />
              <span>
                <span className="block font-headline-sm font-bold text-on-surface">
                  {card.title}
                </span>
                <span className="block text-label-sm text-on-surface-variant">{card.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </MainLayout>
  )
}
