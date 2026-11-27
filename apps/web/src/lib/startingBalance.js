/**
 * Starting balance for a newly linked bank account.
 *
 * Plaid only returns the last ~90 days of transactions, but the balance it
 * reports includes everything before that. Without a starting entry the money
 * that was already in a checking account never reaches Ready to Assign, and a
 * card's existing debt has no transaction behind it.
 *
 * Amounts use the app's convention: positive = money out, negative = money in.
 *
 * @param {{ type: string, balance: number, importedSum: number }} input
 *   balance: Plaid's current balance (for credit and loans, the amount owed, positive)
 *   importedSum: sum of the signed amounts of the transactions just imported
 * @returns {{ amount: number, inflow: boolean, excludeFromBudget: boolean } | null}
 */
export function startingBalanceEntry({ type, balance, importedSum }) {
  const b = Number(balance) || 0
  const s = Number(importedSum) || 0
  const isDebt = type === 'credit' || type === 'loan'

  // Cash: balance now = start - outflows, so start = now + outflows.
  // Debt: owed now = owed at start + purchases, so owed at start = now - purchases.
  const start = isDebt ? b - s : b + s
  const rounded = Math.round(start * 100) / 100
  if (Math.abs(rounded) < 0.005) return null

  if (isDebt) {
    // Debt owed before budgeting started is not this month's spending.
    return { amount: Math.abs(rounded), inflow: rounded < 0, excludeFromBudget: true }
  }
  // Positive cash becomes budgetable income; an overdraft is kept out of the budget.
  return { amount: Math.abs(rounded), inflow: rounded > 0, excludeFromBudget: rounded < 0 }
}

/** The day before the earliest imported transaction (YYYY-MM-DD), or today. */
export function startingBalanceDate(dates, today = new Date()) {
  const sorted = (dates || []).filter(Boolean).map((d) => String(d).slice(0, 10)).sort()
  if (sorted.length === 0) {
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return `${today.getFullYear()}-${m}-${d}`
  }
  const first = new Date(`${sorted[0]}T12:00:00Z`)
  first.setUTCDate(first.getUTCDate() - 1)
  return first.toISOString().slice(0, 10)
}
