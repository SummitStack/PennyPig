/**
 * Gig income: pay from payers that a rule marks as gig work (DoorDash,
 * Instacart, Uber…). It comes weekly or daily and swings month to month, so
 * the panel shows the slow-month baseline to budget around and how much of
 * next month is already funded.
 */
import { incomeMonthKey } from './budgetMath'
import { monthKeyFromDate, shiftMonth } from './money'
import { isGigTransaction } from './rules'

// Payers that usually mean gig or platform work.
export const GIG_PAYERS =
  /doordash|instacart|uber|lyft|grubhub|shipt|spark driver|amazon flex|gopuff|postmates|roadie|upwork|fiverr|taskrabbit|rover|etsy|airbnb|turo/i

/** Inflows from gig platforms that no rule marks as gig pay yet, by platform. */
export function gigPayerSuggestions(transactions, rules) {
  const seen = new Map()
  for (const t of transactions || []) {
    if (Number(t.amount) >= 0) continue
    if (t.transferAccountId && !t.categoryId && !t.isSplit) continue
    const hit = String(t.payee || t.merchant || '').match(GIG_PAYERS)
    if (!hit) continue
    if (isGigTransaction(t, rules)) continue
    const key = hit[0].toLowerCase()
    if (!seen.has(key)) seen.set(key, { key, label: hit[0], count: 0 })
    seen.get(key).count += 1
  }
  return [...seen.values()]
}

function isGigPay(txn, rules) {
  if (txn.excludeFromBudget) return false
  if (txn.transferAccountId && !txn.categoryId) return false
  if ((Number(txn.amount) || 0) >= 0) return false
  return isGigTransaction(txn, rules)
}

/**
 * Gig pay in a month. By default by the month it funds (income marked for
 * next month counts there); `byArrival` uses the date it landed.
 */
export function gigIncomeForMonth({ transactions, rules, month, byArrival = false }) {
  let total = 0
  for (const txn of transactions || []) {
    if (!isGigPay(txn, rules)) continue
    const key = byArrival ? monthKeyFromDate(txn.date) : incomeMonthKey(txn)
    if (key !== month) continue
    total += -Number(txn.amount)
  }
  return Math.round(total * 100) / 100
}

/**
 * Summary for the Gig income panel, by the month the money arrived.
 * Returns { thisMonth, payouts, history: [{ month, total }], lowest, average, hasGig }.
 * History covers the `months` full months before `month`; lowest and average
 * skip months with no gig pay before the first one you had.
 */
export function gigSummary({ transactions, rules, month, months = 6 }) {
  const gig = (transactions || []).filter((t) => isGigPay(t, rules))
  const totals = {}
  let payouts = 0
  for (const t of gig) {
    const key = monthKeyFromDate(t.date)
    totals[key] = (totals[key] || 0) + -Number(t.amount)
    if (key === month) payouts += 1
  }
  const history = []
  for (let i = months; i >= 1; i -= 1) {
    const m = shiftMonth(month, -i)
    history.push({ month: m, total: Math.round((totals[m] || 0) * 100) / 100 })
  }
  const firstIdx = history.findIndex((h) => h.total > 0)
  const counted = firstIdx === -1 ? [] : history.slice(firstIdx)
  const lowest = counted.length ? Math.min(...counted.map((h) => h.total)) : 0
  const average = counted.length ? counted.reduce((s, h) => s + h.total, 0) / counted.length : 0
  return {
    hasGig: gig.length > 0,
    thisMonth: Math.round((totals[month] || 0) * 100) / 100,
    payouts,
    history,
    lowest: Math.round(lowest * 100) / 100,
    average: Math.round(average * 100) / 100,
  }
}
