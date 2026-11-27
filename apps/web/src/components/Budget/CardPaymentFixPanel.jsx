import { useMemo, useState } from 'react'
import { useTransactionStore } from '../../store/transactionStore'
import { findCardPaymentIssues } from '../../lib/cardPayments'
import { money } from '../../lib/money'
import Icon from '../ui/Icon'

function shortDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function describe(issue, accountsById, categoriesById) {
  if (issue.kind === 'link') {
    return {
      title: issue.card.payee || issue.card.merchant,
      date: issue.card.date,
      amount: Math.abs(Number(issue.card.amount) || 0),
      action: `Mark as a transfer from ${accountsById[issue.cash.accountId]?.name || 'cash'}`,
    }
  }
  const txn = issue.txn
  const filed = txn.categoryId ? categoriesById[txn.categoryId]?.name : null
  return {
    title: txn.payee || txn.merchant,
    date: txn.date,
    amount: Math.abs(Number(txn.amount) || 0),
    action:
      issue.kind === 'pay'
        ? `Move${filed ? ` from ${filed}` : ''} to ${categoriesById[issue.payCategoryId]?.name || 'card'} payment`
        : `Leave out of the budget${filed ? ` (now in ${filed})` : ''}`,
  }
}

/**
 * Shows card payments that are being counted as spending and fixes them:
 * a payment moves money to a card you already budgeted for, so it shouldn't
 * also count as Household or Groceries.
 */
export default function CardPaymentFixPanel() {
  const transactions = useTransactionStore((s) => s.transactions)
  const accounts = useTransactionStore((s) => s.accounts)
  const categories = useTransactionStore((s) => s.categories)
  const categorizeTransaction = useTransactionStore((s) => s.categorizeTransaction)
  const setExcludeFromBudget = useTransactionStore((s) => s.setExcludeFromBudget)
  const linkAsTransfer = useTransactionStore((s) => s.linkAsTransfer)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)

  const issues = useMemo(
    () => findCardPaymentIssues({ transactions, accounts, categories }),
    [transactions, accounts, categories]
  )
  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts])
  const categoriesById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  if (issues.length === 0) return null

  const total = issues.reduce((sum, i) => sum + Math.abs(Number((i.txn || i.card).amount) || 0), 0)

  const fixOne = async (issue) => {
    if (issue.kind === 'link') return linkAsTransfer(issue.cash.id, issue.card.id)
    if (issue.kind === 'pay') return categorizeTransaction(issue.txn.id, issue.payCategoryId)
    return setExcludeFromBudget(issue.txn.id, true)
  }

  const run = async (list) => {
    setBusy(true)
    setError(null)
    for (const issue of list) {
      const result = await fixOne(issue)
      if (result?.success === false) {
        setError(result.error || 'Could not fix that one')
        break
      }
    }
    setBusy(false)
  }

  const shown = open ? issues : issues.slice(0, 3)

  return (
    <section className="card mb-5 p-4 sm:p-5" data-testid="card-payment-fix">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-status-warning/15 text-status-warning">
            <Icon name="credit_card" className="text-[20px]" />
          </span>
          <div>
            <h2 className="font-display text-headline-sm text-on-surface">
              {issues.length} card payment{issues.length === 1 ? ' is' : 's are'} counted as spending
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              {money(total)} of payments to your cards is filed like a purchase, so it counts twice. Paying a card only moves
              money you already budgeted.
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-primary shrink-0" disabled={busy} onClick={() => run(issues)}>
          {busy ? 'Fixing…' : 'Fix all'}
        </button>
      </div>

      <ul className="mt-3 divide-y divide-border-hairline">
        {shown.map((issue) => {
          const d = describe(issue, accountsById, categoriesById)
          const id = (issue.txn || issue.card).id
          return (
            <li key={id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-body-sm font-medium text-on-surface">{d.title}</div>
                <div className="truncate text-label-sm text-on-surface-variant">
                  {shortDate(d.date)} · {d.action}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="num text-body-sm text-on-surface">{money(d.amount)}</span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run([issue])}>
                  Fix
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {issues.length > 3 && (
        <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => setOpen((v) => !v)}>
          {open ? 'Show fewer' : `Show all ${issues.length}`}
        </button>
      )}
      {error && <p className="mt-2 text-label-md text-status-error">{error}</p>}
    </section>
  )
}
