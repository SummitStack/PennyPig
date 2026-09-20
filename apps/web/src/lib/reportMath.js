/**
 * Client-side reporting aggregations for Tier 2.
 * Amounts: positive = outflow, negative = inflow.
 */

import { getLeafCategories } from './categories'
import {
  earliestMonth,
  monthKeyFromDate,
  monthsBetween,
  shiftMonth,
} from './money'
import { incomeForMonth, leafActivity } from './budgetMath'

function isLiability(account) {
  return account?.type === 'credit' || account?.type === 'loan'
}

/** Net-worth contribution of one account balance. */
export function accountNetContribution(account) {
  const bal = Number(account?.balance) || 0
  if (isLiability(account)) return -Math.abs(bal)
  return bal
}

export function currentNetWorth(accounts) {
  return (accounts || [])
    .filter((a) => !a.closed)
    .reduce((sum, a) => sum + accountNetContribution(a), 0)
}

function txnDateKey(txn) {
  if (txn.date instanceof Date) {
    return `${txn.date.getFullYear()}-${String(txn.date.getMonth() + 1).padStart(2, '0')}-${String(txn.date.getDate()).padStart(2, '0')}`
  }
  return String(txn.date || '').slice(0, 10)
}

function inDateRange(txn, dateFrom, dateTo) {
  const key = txnDateKey(txn)
  if (!key) return false
  if (dateFrom && key < dateFrom) return false
  if (dateTo && key > dateTo) return false
  return true
}

function monthBounds(month) {
  const [y, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const last = new Date(y, m, 0).getDate()
  const to = `${month}-${String(last).padStart(2, '0')}`
  return { from, to }
}

/**
 * Spending by leaf expense category in a date range (or single month).
 */
export function spendingByCategory({
  transactions,
  categories,
  splitsByTxn = {},
  dateFrom,
  dateTo,
  month = null,
}) {
  let from = dateFrom
  let to = dateTo
  if (month && !from && !to) {
    const b = monthBounds(month)
    from = b.from
    to = b.to
  }

  const leaves = getLeafCategories(categories, 'expense')
  const rows = []

  for (const leaf of leaves) {
    let total = 0
    if (month && from === monthBounds(month).from && to === monthBounds(month).to) {
      total = leafActivity({
        categoryId: leaf.id,
        month,
        transactions,
        splitsByTxn,
        categories,
      })
    } else {
      for (const txn of transactions) {
        if (txn.excludeFromBudget) continue
        if (txn.cleared === false) continue
        if (txn.transferAccountId && !txn.categoryId && !txn.isSplit) continue
        if (!inDateRange(txn, from, to)) continue

        if (txn.isSplit && splitsByTxn[txn.id]) {
          for (const split of splitsByTxn[txn.id]) {
            if (split.categoryId !== leaf.id) continue
            total += Math.max(0, Number(split.amount) || 0)
          }
          continue
        }

        if (txn.categoryId !== leaf.id) continue
        const amt = Number(txn.amount) || 0
        if (amt > 0) total += amt
      }
    }
    if (total === 0) continue
    rows.push({
      categoryId: leaf.id,
      name: leaf.name,
      emoji: leaf.emoji || '',
      amount: total,
    })
  }

  rows.sort((a, b) => b.amount - a.amount)
  const total = rows.reduce((sum, r) => sum + r.amount, 0)
  return { rows, total }
}

/**
 * Income vs expense totals for a date range.
 */
export function incomeVsExpense({
  transactions,
  categories,
  splitsByTxn = {},
  dateFrom,
  dateTo,
}) {
  const incomeIds = new Set(
    categories.filter((c) => c.type === 'income').map((c) => c.id)
  )
  let income = 0
  let expense = 0

  for (const txn of transactions) {
    if (txn.excludeFromBudget) continue
    if (txn.cleared === false) continue
    if (txn.transferAccountId && !txn.categoryId && !txn.isSplit) continue
    if (!inDateRange(txn, dateFrom, dateTo)) continue

    if (txn.isSplit && splitsByTxn[txn.id]) {
      for (const split of splitsByTxn[txn.id]) {
        const cat = categories.find((c) => c.id === split.categoryId)
        const amt = Math.abs(Number(split.amount) || 0)
        if (cat?.type === 'income') income += amt
        else expense += amt
      }
      continue
    }

    const amt = Number(txn.amount) || 0
    if (incomeIds.has(txn.categoryId) && amt < 0) {
      income += -amt
    } else if (amt > 0) {
      expense += amt
    }
  }

  return { income, expense, net: income - expense }
}

/**
 * Monthly income / expense / net trend from startMonth..endMonth.
 */
export function monthlyTrend({
  transactions,
  categories,
  splitsByTxn = {},
  startMonth,
  endMonth,
}) {
  const start = startMonth || earliestMonth(transactions)
  const end = endMonth || new Date().toISOString().slice(0, 7)
  const months = monthsBetween(start, end)

  return months.map((month) => {
    const income = incomeForMonth(transactions, categories, month)
    const leaves = getLeafCategories(categories, 'expense')
    const expense = leaves.reduce(
      (sum, leaf) =>
        sum +
        leafActivity({
          categoryId: leaf.id,
          month,
          transactions,
          splitsByTxn,
          categories,
        }),
      0
    )
    return { month, income, expense, net: income - expense }
  })
}

/**
 * Reconstruct month-end net worth by walking account balances backward
 * from current balances using transaction effects (balance delta = -amount).
 */
export function netWorthByMonth({ accounts, transactions, endMonth = null }) {
  const openAccounts = (accounts || []).filter((a) => !a.closed)
  if (openAccounts.length === 0) return []

  const balances = Object.fromEntries(
    openAccounts.map((a) => [a.id, Number(a.balance) || 0])
  )
  const types = Object.fromEntries(openAccounts.map((a) => [a.id, a.type]))

  const netFromBalances = () =>
    Object.entries(balances).reduce((sum, [id, bal]) => {
      if (types[id] === 'credit' || types[id] === 'loan') return sum - Math.abs(bal)
      return sum + bal
    }, 0)

  const end = endMonth || new Date().toISOString().slice(0, 7)
  const start = earliestMonth(transactions)
  const months = monthsBetween(start, end).reverse() // newest → oldest

  const sorted = [...(transactions || [])].sort((a, b) => {
    const ka = txnDateKey(a)
    const kb = txnDateKey(b)
    if (ka === kb) return 0
    return ka < kb ? 1 : -1 // newest first
  })

  let txnIdx = 0
  const points = []

  for (const month of months) {
    // Snapshot = balances after all txns in this month (and later) have been reversed
    // i.e. month-end ≈ current state before reversing this month's activity
    points.push({ month, netWorth: netFromBalances() })

    // Reverse all transactions in this month
    while (txnIdx < sorted.length) {
      const txn = sorted[txnIdx]
      const key = monthKeyFromDate(txn.date)
      if (key > month) {
        txnIdx += 1
        continue
      }
      if (key < month) break
      const accountId = txn.accountId
      if (accountId && balances[accountId] !== undefined) {
        // Forward effect was -amount; reverse with +amount
        balances[accountId] += Number(txn.amount) || 0
      }
      txnIdx += 1
    }
  }

  return points.reverse()
}

export function formatMonthLabel(month) {
  const d = new Date(`${month}-01T00:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export { monthBounds, shiftMonth }
