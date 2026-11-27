/** Date helpers for recurring transactions. Dates are local YYYY-MM-DD strings. */

export const FREQUENCIES = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
]

function parse(date) {
  const [y, m, d] = String(date).slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

function fmt(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}

/**
 * The next occurrence after `date`. Monthly and yearly keep the day of month,
 * clamped to the month's length (Jan 31 → Feb 28), so a bill due on the 31st
 * doesn't drift.
 */
export function advanceDate(date, frequency, anchorDay = null) {
  const { y, m, d } = parse(date)
  if (frequency === 'weekly' || frequency === 'biweekly') {
    const dt = new Date(y, m - 1, d)
    dt.setDate(dt.getDate() + (frequency === 'weekly' ? 7 : 14))
    return fmt(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
  }
  const day = anchorDay || d
  if (frequency === 'yearly') {
    return fmt(y + 1, m, Math.min(day, daysInMonth(y + 1, m)))
  }
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return fmt(ny, nm, Math.min(day, daysInMonth(ny, nm)))
}

/** Items due on or before `today`, soonest first. */
export function dueItems(items, today) {
  return (items || [])
    .filter((r) => String(r.nextDate) <= today)
    .sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)))
}

/** Items due in the next `days` days (after today), soonest first. */
export function upcomingItems(items, today, days = 14) {
  const end = new Date(`${today}T12:00:00`)
  end.setDate(end.getDate() + days)
  const endKey = fmt(end.getFullYear(), end.getMonth() + 1, end.getDate())
  return (items || [])
    .filter((r) => String(r.nextDate) > today && String(r.nextDate) <= endKey)
    .sort((a, b) => String(a.nextDate).localeCompare(String(b.nextDate)))
}
