/**
 * Month-close checklist helpers (YNAB-inspired).
 */

import { getLeafCategories } from './categories'
import { monthKeyFromDate, shiftMonth } from './money'
import { computeAvailability } from './budgetMath'

function isPureTransfer(txn) {
  return txn.transferAccountId && !txn.categoryId && !txn.isSplit
}

export function uncategorizedInMonth(transactions, month) {
  return (transactions || []).filter((t) => {
    if (isPureTransfer(t)) return false
    if (monthKeyFromDate(t.date) !== month) return false
    if (t.isSplit) return (t.splits || []).some((s) => !s.categoryId)
    return !t.categoryId
  })
}

export function unclearedInMonth(transactions, month) {
  return (transactions || []).filter((t) => {
    if (monthKeyFromDate(t.date) !== month) return false
    return t.cleared === false || t.status === 'pending'
  })
}

export function overspentLeaves({
  categories,
  transactions,
  budgetsByMonth,
  splitsByTxn,
  month,
}) {
  const leaves = getLeafCategories(categories, 'expense')
  const { available } = computeAvailability({
    categories,
    transactions,
    budgetsByMonth,
    splitsByTxn,
    endMonth: month,
  })
  return leaves
    .map((leaf) => ({
      id: leaf.id,
      name: leaf.name,
      emoji: leaf.emoji || '',
      available: Number(available[month]?.[leaf.id] || 0),
      isCcPayment: Boolean(leaf.isCcPayment),
    }))
    .filter((row) => row.available < 0 && !row.isCcPayment)
}

/**
 * Build checklist items for closing `month`.
 * Each item: { id, label, done, detail, href?, action? }
 */
export function buildMonthCloseChecklist({
  month,
  readyToAssign,
  transactions,
  categories,
  budgetsByMonth,
  splitsByTxn,
  accounts,
}) {
  const uncategorized = uncategorizedInMonth(transactions, month)
  const overspent = overspentLeaves({
    categories,
    transactions,
    budgetsByMonth,
    splitsByTxn,
    month,
  })
  const uncleared = unclearedInMonth(transactions, month)
  const onBudgetAccounts = (accounts || []).filter((a) => a.onBudget !== false && !a.closed)
  const rta = Number(readyToAssign) || 0

  return [
    {
      id: 'categorize',
      label: 'Categorize all transactions',
      done: uncategorized.length === 0,
      detail:
        uncategorized.length === 0
          ? 'Every transaction this month has a category'
          : `${uncategorized.length} still uncategorized`,
      href: '/transactions',
    },
    {
      id: 'assign',
      label: 'Assign Ready to Assign',
      done: Math.abs(rta) < 0.005,
      detail:
        Math.abs(rta) < 0.005
          ? 'Nothing left to assign'
          : rta > 0
            ? `$${rta.toFixed(2)} still ready to assign`
            : `Overassigned by $${Math.abs(rta).toFixed(2)}`,
      href: '/budgets',
    },
    {
      id: 'cover',
      label: 'Cover overspending',
      done: overspent.length === 0,
      detail:
        overspent.length === 0
          ? 'No overspent categories'
          : `${overspent.length} categor${overspent.length === 1 ? 'y' : 'ies'} overspent`,
      href: '/budgets',
      meta: { overspent },
    },
    {
      id: 'clear',
      label: 'Clear / reconcile accounts',
      done: uncleared.length === 0,
      detail:
        uncleared.length === 0
          ? onBudgetAccounts.length
            ? 'No uncleared transactions this month'
            : 'No on-budget accounts yet'
          : `${uncleared.length} uncleared or pending`,
      href: '/accounts',
    },
  ]
}

export function monthCloseStorageKey(userId, month) {
  return `pennypig:month-closed:${userId || 'local'}:${month}`
}

export function isMonthMarkedClosed(userId, month) {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(monthCloseStorageKey(userId, month)) === '1'
  } catch {
    return false
  }
}

export function markMonthClosed(userId, month, closed = true) {
  if (typeof window === 'undefined') return
  try {
    const key = monthCloseStorageKey(userId, month)
    if (closed) window.localStorage.setItem(key, '1')
    else window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export { shiftMonth }
