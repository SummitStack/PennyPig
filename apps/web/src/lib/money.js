/** Plaid / YNAB-lite signed amounts: positive = outflow, negative = inflow. */

export function toOutflow(amount) {
  return Math.abs(Number(amount) || 0)
}

export function toInflow(amount) {
  return -Math.abs(Number(amount) || 0)
}

export function signedAmount(amount, inflow = false) {
  const n = Math.abs(Number(amount) || 0)
  return inflow ? -n : n
}

export function isInflow(amount) {
  return Number(amount) < 0
}

export function isOutflow(amount) {
  return Number(amount) > 0
}

/** Display magnitude (always non-negative). */
export function absAmount(amount) {
  return Math.abs(Number(amount) || 0)
}

export function formatMoney(amount, { signed = false } = {}) {
  const n = Number(amount) || 0
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (!signed) return `$${formatted}`
  if (n < 0) return `+$${formatted}`
  if (n > 0) return `-$${formatted}`
  return `$${formatted}`
}

export function monthKeyFromDate(date) {
  const d = date instanceof Date ? date : new Date(String(date) + (String(date).length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(month, delta) {
  const [y, m] = String(month).split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthsBetween(fromMonth, toMonth) {
  const result = []
  let cur = fromMonth
  // Safety cap
  for (let i = 0; i < 240; i += 1) {
    result.push(cur)
    if (cur === toMonth) break
    cur = shiftMonth(cur, 1)
    if (cur > toMonth && fromMonth <= toMonth) break
    if (cur < toMonth && fromMonth > toMonth) break
  }
  return result
}

export function earliestMonth(transactions) {
  if (!transactions?.length) return new Date().toISOString().slice(0, 7)
  let min = null
  for (const t of transactions) {
    const key = monthKeyFromDate(t.date)
    if (key && (!min || key < min)) min = key
  }
  return min || new Date().toISOString().slice(0, 7)
}
