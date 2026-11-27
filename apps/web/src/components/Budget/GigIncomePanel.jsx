import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useBudgetStore } from '../../store/budgetStore'
import { useTransactionStore } from '../../store/transactionStore'
import { gigPayerSuggestions, gigSummary } from '../../lib/gigIncome'
import { incomeForMonth } from '../../lib/budgetMath'
import { formatMonthLabel, money, shiftMonth } from '../../lib/money'
import { getLeafCategories } from '../../lib/categories'
import Icon from '../ui/Icon'

/**
 * For irregular pay (DoorDash, Instacart…): this month's gig pay, the slowest
 * recent month to budget fixed bills around, and how much of next month the
 * pay you've set aside for it already covers.
 */
export default function GigIncomePanel() {
  const month = useBudgetStore((s) => s.currentMonth)
  const budgets = useBudgetStore((s) => s.budgets)
  const targets = useBudgetStore((s) => s.targets)
  const transactions = useTransactionStore((s) => s.transactions)
  const categories = useTransactionStore((s) => s.categories)
  const rules = useTransactionStore((s) => s.categoryRules)

  const summary = useMemo(() => gigSummary({ transactions, rules, month }), [transactions, rules, month])
  const suggestions = useMemo(
    () => (summary.hasGig ? [] : gigPayerSuggestions(transactions, rules)),
    [summary.hasGig, transactions, rules]
  )
  const next = shiftMonth(month, 1)
  const fundedNext = useMemo(() => incomeForMonth(transactions, categories, next), [transactions, categories, next])
  const assignedNow = useMemo(() => {
    const amounts = budgets[month] || {}
    return getLeafCategories(categories, 'expense').reduce((sum, c) => sum + (Number(amounts[c.id]) || 0), 0)
  }, [budgets, month, categories])

  if (!summary.hasGig) {
    if (suggestions.length === 0) return null
    return (
      <section className="card p-4" data-testid="gig-prompt">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <Icon name="delivery_dining" className="text-[18px]" />
          </span>
          <div>
            <h2 className="font-display text-headline-sm text-on-surface">Gig pay?</h2>
            <p className="text-body-sm text-on-surface-variant">
              Pay from {suggestions.map((s) => s.label).join(', ')} looks like gig work. Mark it to plan around slow months.
            </p>
            <Link to="/rules" className="mt-1 inline-block text-label-md font-semibold text-primary hover:underline">
              Set up gig income
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const usesNextMonth = rules.some((r) => r.isGig && r.forNextMonth)
  const hasTaxTarget = Object.values(targets).some((t) => t.targetType === 'percent_income')
  const max = Math.max(1, ...summary.history.map((h) => h.total), summary.thisMonth)
  const fundedPct = assignedNow > 0 ? Math.min(100, Math.round((fundedNext / assignedNow) * 100)) : 0
  const short = (m) => formatMonthLabel(m, { month: 'short' })

  return (
    <section className="card p-4" data-testid="gig-income">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-headline-sm text-on-surface">Gig income</h2>
        <Link to="/rules" className="text-label-md font-semibold text-primary hover:underline">
          Rules
        </Link>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="num font-display text-headline-md text-on-surface">{money(summary.thisMonth)}</span>
        <span className="text-label-md text-on-surface-variant">
          {summary.payouts} payout{summary.payouts === 1 ? '' : 's'} in {short(month)}
        </span>
      </div>

      <div className="mt-3 flex h-16 items-end gap-1.5" aria-label="Gig pay by month">
        {[...summary.history, { month, total: summary.thisMonth, current: true }].map((h) => (
          <div key={h.month} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t ${h.current ? 'bg-primary' : 'bg-primary/30'}`}
              style={{ height: `${Math.max(3, (h.total / max) * 48)}px` }}
              title={`${formatMonthLabel(h.month)}: ${money(h.total)}`}
            />
            <span className="text-[10px] leading-none text-on-surface-variant">{short(h.month)}</span>
          </div>
        ))}
      </div>

      <dl className="mt-3 space-y-1 text-body-sm">
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">Slowest month</dt>
          <dd className="num text-on-surface">{money(summary.lowest)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-on-surface-variant">Average</dt>
          <dd className="num text-on-surface">{money(summary.average)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-label-md text-on-surface-variant">
        Cover rent and bills with what you make in a slow month. Treat the rest as extra.
      </p>

      <div className="mt-3 border-t border-border-hairline pt-3">
        <div className="flex justify-between text-body-sm">
          <span className="text-on-surface-variant">{short(next)} funded so far</span>
          <span className="num text-on-surface">
            {money(fundedNext)}
            {assignedNow > 0 && <span className="text-on-surface-variant"> of {money(assignedNow)}</span>}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
          <div className="h-full rounded-full bg-sage-accent" style={{ width: `${fundedPct}%` }} />
        </div>
        {!usesNextMonth && (
          <p className="mt-2 text-label-md text-on-surface-variant">
            Turn on “Use this income next month” for your gig rules to live on last month’s pay.
          </p>
        )}
        {!hasTaxTarget && (
          <p className="mt-2 text-label-md text-on-surface-variant">
            Self-employed? Give your taxes category a “percent of income” target, like 25% of gig income.
          </p>
        )}
      </div>
    </section>
  )
}
