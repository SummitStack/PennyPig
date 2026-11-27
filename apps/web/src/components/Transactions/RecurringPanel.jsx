import { useEffect, useState } from 'react'
import { useRecurringStore } from '../../store/recurringStore'
import { useTransactionStore } from '../../store/transactionStore'
import { FREQUENCIES, dueItems, upcomingItems } from '../../lib/recurring'
import { money, todayLocal } from '../../lib/money'
import Icon from '../ui/Icon'

const FREQ_LABEL = Object.fromEntries(FREQUENCIES.map((f) => [f.value, f.label]))

export function formatShortDate(key) {
  const d = new Date(`${key}T12:00:00`)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

function Row({ item, accountName, due, onEnter, onSkip, busy }) {
  return (
    <li className="flex items-center gap-3 py-2.5" data-testid={due ? 'recurring-due' : 'recurring-upcoming'}>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          due ? 'bg-status-warning/15 text-status-warning' : 'bg-surface-container text-on-surface-variant'
        }`}
      >
        <Icon name="event_repeat" className="text-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-medium text-on-surface">{item.payee}</p>
        <p className="truncate text-label-md text-on-surface-variant">
          {due ? 'Due ' : ''}
          {formatShortDate(item.nextDate)} · {accountName}
        </p>
      </div>
      <p className={`num shrink-0 text-body-sm font-semibold ${item.inflow ? 'text-primary' : 'text-on-surface'}`}>
        {item.inflow ? '+' : '-'}
        {money(item.amount)}
      </p>
      {due && (
        <div className="flex shrink-0 gap-1">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onEnter(item.id)} disabled={busy}>
            Enter
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSkip(item.id)} disabled={busy}>
            Skip
          </button>
        </div>
      )}
    </li>
  )
}

/**
 * Due and upcoming recurring transactions. Nothing is entered automatically:
 * Enter records it and moves to the next date, Skip just moves the date.
 * `compact` drops the full list (used on the dashboard).
 */
export default function RecurringPanel({ compact = false }) {
  const { items, loaded, available, load, enter, skip, remove } = useRecurringStore()
  const accounts = useTransactionStore((s) => s.accounts)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  useEffect(() => {
    if (!note) return undefined
    const t = setTimeout(() => setNote(null), 4000)
    return () => clearTimeout(t)
  }, [note])

  if (!available || items.length === 0) return null

  const today = todayLocal()
  const due = dueItems(items, today)
  const upcoming = upcomingItems(items, today, 14)
  const nameOf = (id) => accounts.find((a) => a.id === id)?.name || 'Account'

  if (compact && due.length === 0 && upcoming.length === 0) return null

  const act = async (fn, id, text) => {
    setBusy(true)
    const result = await fn(id)
    setBusy(false)
    setNote(result?.success === false ? result.error || 'Something went wrong' : text)
  }

  return (
    <section className="card p-4 sm:p-5" data-testid="recurring-panel">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-headline-sm text-on-surface">{compact ? 'Coming up' : 'Recurring'}</h2>
          <p className="text-label-md text-on-surface-variant">
            {due.length > 0
              ? `${due.length} due now. Enter adds it to your register.`
              : 'Nothing due. Next two weeks below.'}
          </p>
        </div>
      </div>

      {(due.length > 0 || upcoming.length > 0) && (
        <ul className="mt-2 divide-y divide-border-hairline">
          {due.map((item) => (
            <Row
              key={item.id}
              item={item}
              due
              accountName={nameOf(item.accountId)}
              busy={busy}
              onEnter={(id) => act(enter, id, `Entered ${item.payee}.`)}
              onSkip={(id) => act(skip, id, `Skipped ${item.payee} this time.`)}
            />
          ))}
          {upcoming.slice(0, compact ? 3 : 10).map((item) => (
            <Row key={item.id} item={item} accountName={nameOf(item.accountId)} />
          ))}
        </ul>
      )}

      {note && <p role="status" className="mt-2 text-label-md text-primary">{note}</p>}

      {!compact && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-label-md font-medium text-on-surface-variant">
            <Icon name="chevron_right" className="text-[16px] transition-transform group-open:rotate-90" />
            All recurring ({items.length})
          </summary>
          <ul className="mt-1 divide-y divide-border-hairline">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2 text-body-sm">
                <span className="min-w-0 flex-1 truncate text-on-surface">{item.payee}</span>
                <span className="hidden text-on-surface-variant sm:inline">{FREQ_LABEL[item.frequency]}</span>
                <span className="text-on-surface-variant">next {formatShortDate(item.nextDate)}</span>
                <span className="num w-24 text-right text-on-surface">
                  {item.inflow ? '+' : '-'}
                  {money(item.amount)}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost h-7 w-7 p-0 text-on-surface-variant hover:text-status-error"
                  aria-label={`Stop repeating ${item.payee}`}
                  title="Stop repeating"
                  onClick={() => act(remove, item.id, `${item.payee} will no longer repeat.`)}
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
