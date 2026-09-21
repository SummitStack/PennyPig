/**
 * YNAB-lite budget math.
 *
 * Amounts: positive = outflow, negative = inflow (Plaid convention).
 * Available(cat, month) = carryover + assigned - activity
 * Carryover = max(0, prior Available)
 * Cash overspend (negative Available at month end) reduces next month's RTA.
 * RTA(month) = incomeInflows(month) + max(0, priorRTA) - priorCashOverspend - assigned(month)
 */

import { getLeafCategories } from './categories'
import {
  absAmount,
  earliestMonth,
  monthKeyFromDate,
  shiftMonth,
} from './money'

function categoryById(categories) {
  return Object.fromEntries(categories.map((c) => [c.id, c]))
}

function expenseLeaves(categories) {
  return getLeafCategories(categories, 'expense')
}

/**
 * Activity for a leaf expense category in a month = sum of outflows
 * (and split lines) attributed to it. Transfers excluded from budget
 * unless categorized. Income categories return 0 activity here.
 */
export function leafActivity({
  categoryId,
  month,
  transactions,
  splitsByTxn = {},
  categories,
}) {
  const byId = categoryById(categories)
  const cat = byId[categoryId]
  if (!cat || cat.type === 'income') return 0

  let total = 0
  for (const txn of transactions) {
    if (txn.excludeFromBudget) continue
    // Cleared = confirmed for budget (category reviewed)
    if (txn.cleared === false) continue
    // Pure transfers between accounts don't hit expense activity
    if (txn.transferAccountId && !txn.categoryId && !txn.isSplit) continue

    const key = monthKeyFromDate(txn.date)
    if (key !== month) continue

    if (txn.isSplit && splitsByTxn[txn.id]) {
      for (const split of splitsByTxn[txn.id]) {
        if (split.categoryId !== categoryId) continue
        // Split amounts stored as signed contribution matching parent sign
        total += Math.max(0, Number(split.amount) || 0)
      }
      continue
    }

    if (txn.categoryId !== categoryId) continue
    const amt = Number(txn.amount) || 0
    if (amt > 0) total += amt
  }
  return total
}

/** Cleared income (inflows) attributed to an income category in a month. */
export function incomeActivityForCategory({
  categoryId,
  month,
  transactions,
  categories,
}) {
  const byId = categoryById(categories)
  const cat = byId[categoryId]
  if (!cat || cat.type !== 'income') return 0

  let total = 0
  for (const txn of transactions) {
    if (txn.excludeFromBudget) continue
    if (txn.cleared === false) continue
    if (txn.transferAccountId && !txn.categoryId) continue
    const key = monthKeyFromDate(txn.date)
    if (key !== month) continue
    if (txn.categoryId !== categoryId) continue
    const amt = Number(txn.amount) || 0
    if (amt < 0) total += -amt
  }
  return total
}

export function leafAssigned(budgetsByMonth, categoryId, month) {
  return Number(budgetsByMonth[month]?.[categoryId] || 0)
}

/**
 * Compute carryover + available for all expense leaves from startMonth..endMonth.
 * Returns { available[month][catId], carryover[month][catId], overspend[month] }
 */
export function computeAvailability({
  categories,
  transactions,
  budgetsByMonth,
  splitsByTxn = {},
  endMonth,
  startMonth = null,
}) {
  const leaves = expenseLeaves(categories)
  const start = startMonth || earliestMonth(transactions)
  const available = {}
  const carryover = {}
  const overspend = {}

  let month = start
  // Walk forward until endMonth (inclusive)
  for (let guard = 0; guard < 240; guard += 1) {
    available[month] = {}
    carryover[month] = {}
    let monthOverspend = 0

    for (const leaf of leaves) {
      const prev = shiftMonth(month, -1)
      const prevAvail =
        available[prev]?.[leaf.id] !== undefined
          ? available[prev][leaf.id]
          : 0
      const carry = Math.max(0, prevAvail)
      const assigned = leafAssigned(budgetsByMonth, leaf.id, month)
      const activity = leafActivity({
        categoryId: leaf.id,
        month,
        transactions,
        splitsByTxn,
        categories,
      })
      const avail = carry + assigned - activity
      carryover[month][leaf.id] = carry
      available[month][leaf.id] = avail
      if (avail < 0 && !leaf.isCcPayment) {
        monthOverspend += -avail
      }
    }

    overspend[month] = monthOverspend
    if (month === endMonth) break
    month = shiftMonth(month, 1)
    if (month > endMonth) break
  }

  return { available, carryover, overspend }
}

export function incomeForMonth(transactions, categories, month) {
  const incomeIds = new Set(
    categories.filter((c) => c.type === 'income').map((c) => c.id)
  )
  let income = 0
  for (const txn of transactions) {
    if (txn.excludeFromBudget) continue
    if (txn.cleared === false) continue
    if (txn.transferAccountId && !txn.categoryId) continue
    const key = monthKeyFromDate(txn.date)
    if (key !== month) continue
    if (!incomeIds.has(txn.categoryId)) continue
    const amt = Number(txn.amount) || 0
    // Inflows are negative; contribute positive dollars to RTA
    if (amt < 0) income += -amt
  }
  return income
}

/**
 * RTA with rollover of unassigned dollars and deduction of prior cash overspend.
 */
export function computeReadyToAssign({
  categories,
  transactions,
  budgetsByMonth,
  splitsByTxn = {},
  month,
}) {
  const start = earliestMonth(transactions)
  const leaves = expenseLeaves(categories)
  const { overspend } = computeAvailability({
    categories,
    transactions,
    budgetsByMonth,
    splitsByTxn,
    endMonth: month,
    startMonth: start,
  })

  // Walk RTA month by month
  let rta = 0
  let cur = start
  for (let guard = 0; guard < 240; guard += 1) {
    const income = incomeForMonth(transactions, categories, cur)
    const assigned = leaves.reduce(
      (sum, leaf) => sum + leafAssigned(budgetsByMonth, leaf.id, cur),
      0
    )
    const priorOverspend =
      cur === start ? 0 : Number(overspend[shiftMonth(cur, -1)] || 0)
    // Leftover positive RTA carries; negative is clamped after overspend hit
    rta = Math.max(0, rta) + income - priorOverspend - assigned
    if (cur === month) return rta
    cur = shiftMonth(cur, 1)
    if (cur > month) return rta
  }
  return rta
}

/** Monthly target need, or by_date prorated into current month. */
export function targetNeededForMonth(target, month) {
  if (!target) return 0
  const amount = Number(target.amount) || 0
  if (target.targetType === 'monthly') return amount
  if (target.targetType === 'by_date' && target.targetDate) {
    const [y, m] = month.split('-').map(Number)
    const monthStart = new Date(y, m - 1, 1)
    const monthEnd = new Date(y, m, 0)
    const targetDate = new Date(target.targetDate + 'T00:00:00')
    if (targetDate < monthStart) return 0
    // Months remaining inclusive of current
    const monthsLeft =
      (targetDate.getFullYear() - monthStart.getFullYear()) * 12 +
      (targetDate.getMonth() - monthStart.getMonth()) +
      1
    if (monthsLeft <= 0) return amount
    return amount / monthsLeft
  }
  return amount
}

export function underfundedAmount({
  target,
  month,
  assigned,
  available,
}) {
  const needed = targetNeededForMonth(target, month)
  if (needed <= 0) return 0
  // Fund until available reaches the monthly need (YNAB Underfunded-ish)
  const gap = needed - assigned
  return Math.max(0, gap)
}
