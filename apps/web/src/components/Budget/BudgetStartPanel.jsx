import { useMemo, useState } from 'react'
import { useBudgetStore } from '../../store/budgetStore'
import { useTransactionStore } from '../../store/transactionStore'
import { openingFunds, startMonthOptions } from '../../lib/budgetMath'
import { currentMonthKey, earliestMonth, formatMonthLabel, money } from '../../lib/money'
import { ModalBackdrop, modalPanel } from '../ui/Modal'
import Icon from '../ui/Icon'

function firstOfMonth(month) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StartModal({ initial, onClose }) {
  const transactions = useTransactionStore((s) => s.transactions)
  const accounts = useTransactionStore((s) => s.accounts)
  const setBudgetStart = useBudgetStore((s) => s.setBudgetStart)
  const options = useMemo(() => startMonthOptions(transactions, currentMonthKey()), [transactions])
  const [month, setMonth] = useState(initial || options[0] || currentMonthKey())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const funds = useMemo(
    () => (month === 'all' ? null : openingFunds({ accounts, transactions, month })),
    [accounts, transactions, month]
  )

  const save = async () => {
    setBusy(true)
    setError(null)
    const result = await setBudgetStart(month === 'all' ? null : month)
    setBusy(false)
    if (result?.success === false) setError(result.error || 'Could not save')
    else onClose()
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div role="dialog" aria-labelledby="bs-title" className={`${modalPanel} max-w-md p-5`} data-testid="budget-start-modal">
        <div className="flex items-start justify-between gap-3">
          <h3 id="bs-title" className="font-display text-headline-sm text-on-surface">
            Start your budget from
          </h3>
          <button type="button" className="btn btn-ghost h-8 w-8 p-0" aria-label="Close" onClick={onClose}>
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          What your budget accounts hold on the 1st becomes money to assign. Earlier months stay in your register but no
          longer count against your budget.
        </p>

        <label htmlFor="bs-month" className="mt-4 block text-label-md font-medium text-on-surface">
          Month
        </label>
        <select id="bs-month" className="field mt-1 w-full" value={month} onChange={(e) => setMonth(e.target.value)}>
          {options.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
          <option value="all">All history (no start month)</option>
        </select>

        {funds && (
          <dl className="mt-4 space-y-1.5 rounded-xl bg-surface-container p-3 text-body-sm" data-testid="budget-start-preview">
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Cash on {firstOfMonth(month)}</dt>
              <dd className="num text-on-surface">{money(funds.cash)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-on-surface-variant">Owed on cards</dt>
              <dd className="num text-on-surface">{funds.owed > 0 ? `-${money(funds.owed)}` : money(0)}</dd>
            </div>
            <div className="flex justify-between border-t border-border-hairline pt-1.5 font-semibold">
              <dt className="text-on-surface">To assign</dt>
              <dd className={`num ${funds.total < 0 ? 'text-status-error' : 'text-primary'}`}>{money(funds.total)}</dd>
            </div>
          </dl>
        )}
        {funds && funds.total < 0 && (
          <p className="mt-2 text-label-md text-on-surface-variant">
            Your cards owe more than your cash holds, so you start below zero until income comes in.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-label-md text-status-error">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy} data-testid="budget-start-save">
            Save
          </button>
        </div>
      </div>
    </ModalBackdrop>
  )
}

/**
 * Lets the user pick the month their budget starts. Without one, every month
 * back to the oldest imported transaction counts, and months nobody budgeted
 * show up as overspending that eats Ready to Assign.
 */
export default function BudgetStartPanel() {
  const startMonth = useBudgetStore((s) => s.budgetStartMonth)
  const viewing = useBudgetStore((s) => s.currentMonth)
  const transactions = useTransactionStore((s) => s.transactions)
  const [open, setOpen] = useState(false)
  const thisMonth = currentMonthKey()
  const hasOldHistory = transactions.length > 0 && earliestMonth(transactions) < thisMonth

  let body = null
  if (startMonth && viewing < startMonth) {
    body = (
      <p className="text-body-sm text-on-surface-variant">
        This month is before your budget starts in {formatMonthLabel(startMonth)}, so nothing here counts.
      </p>
    )
  } else if (startMonth) {
    body = (
      <p className="text-body-sm text-on-surface-variant">
        Budget starts {formatMonthLabel(startMonth)}.
      </p>
    )
  } else if (hasOldHistory) {
    body = (
      <p className="text-body-sm text-on-surface">
        Months you never budgeted count as overspending and hold Ready to assign down. Start from{' '}
        {formatMonthLabel(thisMonth)} to budget what your accounts hold now.
      </p>
    )
  }
  if (!body) return null

  return (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-xl px-4 py-2.5 ring-1 sm:flex-row sm:items-center sm:justify-between ${
        startMonth ? 'bg-surface-base ring-border-hairline' : 'bg-status-warning/[0.06] ring-status-warning/25'
      }`}
      data-testid="budget-start-panel"
    >
      <div className="flex items-start gap-2">
        <Icon name="flag" className="mt-0.5 text-[18px] text-on-surface-variant" />
        {body}
      </div>
      <button
        type="button"
        className={`btn btn-sm shrink-0 ${startMonth ? 'btn-ghost' : 'btn-primary'}`}
        onClick={() => setOpen(true)}
        data-testid="budget-start-open"
      >
        {startMonth ? 'Change' : 'Choose a start month'}
      </button>
      {open && <StartModal initial={startMonth || thisMonth} onClose={() => setOpen(false)} />}
    </div>
  )
}
