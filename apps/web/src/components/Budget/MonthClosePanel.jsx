import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudgetStore } from '../../store/budgetStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useAccountStore } from '../../store/accountStore'
import { useAuthStore } from '../../store/authStore'
import {
  buildMonthCloseChecklist,
  isMonthMarkedClosed,
  markMonthClosed,
  shiftMonth,
} from '../../lib/monthClose'
import Icon from '../ui/Icon'

export default function MonthClosePanel() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const currentMonth = useBudgetStore((s) => s.currentMonth)
  const setCurrentMonth = useBudgetStore((s) => s.setCurrentMonth)
  const loadBudgets = useBudgetStore((s) => s.loadBudgets)
  const copyFromLastMonth = useBudgetStore((s) => s.copyFromLastMonth)
  const getReadyToAssign = useBudgetStore((s) => s.getReadyToAssign)
  const budgets = useBudgetStore((s) => s.budgets)
  const transactions = useTransactionStore((s) => s.transactions)
  const categories = useTransactionStore((s) => s.categories)
  const splits = useTransactionStore((s) => s.splits)
  const accounts = useAccountStore((s) => s.linkedAccounts)

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [closedTick, setClosedTick] = useState(0)

  const splitsByTxn = useMemo(() => {
    const map = {}
    for (const s of splits || []) {
      if (!map[s.transactionId]) map[s.transactionId] = []
      map[s.transactionId].push(s)
    }
    return map
  }, [splits])

  const readyToAssign = getReadyToAssign()

  const checklist = useMemo(
    () =>
      buildMonthCloseChecklist({
        month: currentMonth,
        readyToAssign,
        transactions,
        categories,
        budgetsByMonth: budgets,
        splitsByTxn,
        accounts,
      }),
    [currentMonth, readyToAssign, transactions, categories, budgets, splitsByTxn, accounts, closedTick]
  )

  const doneCount = checklist.filter((c) => c.done).length
  const allDone = doneCount === checklist.length
  const markedClosed = isMonthMarkedClosed(user?.id, currentMonth)

  const nextMonth = shiftMonth(currentMonth, 1)
  const nextLabel = new Date(`${nextMonth}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const handleAdvance = async ({ copyForward }) => {
    setBusy(true)
    setMessage(null)
    try {
      markMonthClosed(user?.id, currentMonth, true)
      setCurrentMonth(nextMonth)
      await loadBudgets(nextMonth)
      if (copyForward) {
        const result = await copyFromLastMonth()
        if (!result.success) throw new Error(result.error || 'Copy failed')
      }
      setClosedTick((n) => n + 1)
      setMessage(
        copyForward
          ? `Moved to ${nextLabel} and copied last month’s assigned amounts.`
          : `Moved to ${nextLabel}.`
      )
    } catch (err) {
      setMessage(err.message || 'Could not advance month')
    } finally {
      setBusy(false)
    }
  }

  const handleUnmark = () => {
    markMonthClosed(user?.id, currentMonth, false)
    setClosedTick((n) => n + 1)
  }

  return (
    <div className="flex flex-col gap-space-sm rounded-xl border border-border-hairline bg-surface-base p-space-md shadow-sm">
      <div className="flex items-start justify-between gap-space-sm border-b border-border-hairline pb-1.5">
        <div>
          <div className="font-headline-sm font-bold text-on-surface">Month close</div>
          <div className="text-label-sm text-on-surface-variant">
            {doneCount}/{checklist.length} checklist items ready
          </div>
        </div>
        {markedClosed ? (
          <span className="rounded-md border border-sage-accent/30 bg-sage-accent/10 px-2 py-0.5 text-label-sm font-semibold text-sage-accent">
            Closed
          </span>
        ) : (
          <span className="rounded-md border border-border-hairline bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
            Open
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {checklist.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => item.href && navigate(item.href)}
              className="flex w-full items-start gap-space-sm rounded-lg px-1 py-1 text-left transition-colors hover:bg-surface-container"
            >
              <Icon
                name={item.done ? 'check_circle' : 'radio_button_unchecked'}
                className={`mt-0.5 text-[18px] ${
                  item.done ? 'text-status-success' : 'text-on-surface-variant'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium text-on-surface">
                  {item.label}
                </span>
                <span className="block text-label-sm text-on-surface-variant">{item.detail}</span>
              </span>
              {item.href && (
                <Icon name="chevron_right" className="mt-0.5 text-[16px] text-on-surface-variant" />
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1.5 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleAdvance({ copyForward: true })}
          className="flex w-full items-center justify-center gap-space-sm rounded-lg bg-primary px-space-md py-2 text-label-md font-semibold text-on-primary disabled:opacity-50"
        >
          <Icon name="content_copy" className="text-[16px]" />
          Close &amp; copy to {nextLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleAdvance({ copyForward: false })}
          className="flex w-full items-center justify-center gap-space-sm rounded-lg border border-border-hairline bg-surface-container px-space-md py-2 text-label-md font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
        >
          <Icon name="arrow_forward" className="text-[16px]" />
          Advance to {nextLabel}
        </button>
        {!allDone && (
          <p className="text-label-sm text-on-surface-variant">
            You can advance anytime — unfinished items stay visible when you return.
          </p>
        )}
        {markedClosed && (
          <button
            type="button"
            onClick={handleUnmark}
            className="text-label-sm text-cool-blue hover:underline"
          >
            Unmark this month as closed
          </button>
        )}
        {message && <p className="text-label-sm text-on-surface-variant">{message}</p>}
      </div>
    </div>
  )
}
