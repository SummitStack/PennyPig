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

/**
 * Real money out in a month: cleared outflows that are not transfers or
 * income, including transactions nobody has categorized yet. Budget
 * "activity" for savings goals counts money you set aside, so it can't be
 * used as spending.
 */
export function monthSpending({ transactions, categories, month }) {
  const byId = categoryById(categories)
  let total = 0
  let uncategorized = 0
  for (const txn of transactions) {
    if (txn.excludeFromBudget) continue
    if (txn.cleared === false) continue
    if (txn.transferAccountId && !txn.categoryId && !txn.isSplit) continue
    if (monthKeyFromDate(txn.date) !== month) continue
    const amt = Number(txn.amount) || 0
    if (amt <= 0) continue
    if (txn.categoryId && byId[txn.categoryId]?.type === 'income') continue
    total += amt
    if (!txn.categoryId && !txn.isSplit) uncategorized += amt
  }
  return { total, uncategorized }
}

/**
 * Cleared expense lines that make up Activity for one or more category ids
 * in a month (includes split contributions).
 */
export function listActivityLines({
  categoryIds,
  month,
  transactions,
  splitsByTxn = {},
  categories = [],
}) {
  const idSet = categoryIds instanceof Set ? categoryIds : new Set(categoryIds || [])
  const byId = categoryById(categories)
  const lines = []

  for (const txn of transactions) {
    if (txn.excludeFromBudget) continue
    if (txn.cleared === false) continue
    if (txn.transferAccountId && !txn.categoryId && !txn.isSplit) continue
    const key = monthKeyFromDate(txn.date)
    if (key !== month) continue

    if (txn.isSplit && splitsByTxn[txn.id]) {
      for (const split of splitsByTxn[txn.id]) {
        if (!idSet.has(split.categoryId)) continue
        const amt = Math.max(0, Number(split.amount) || 0)
        if (amt <= 0) continue
        const cat = byId[split.categoryId]
        lines.push({
          id: `${txn.id}:${split.id || split.categoryId}`,
          transactionId: txn.id,
          date: txn.date,
          payee: txn.payee || txn.merchant || 'Unknown',
          account: txn.account || '',
          amount: amt,
          categoryId: split.categoryId,
          categoryName: cat?.name || 'Split',
          isSplit: true,
        })
      }
      continue
    }

    if (!idSet.has(txn.categoryId)) continue
    const amt = Number(txn.amount) || 0
    if (amt <= 0) continue
    const cat = byId[txn.categoryId]
    lines.push({
      id: txn.id,
      transactionId: txn.id,
      date: txn.date,
      payee: txn.payee || txn.merchant || 'Unknown',
      account: txn.account || '',
      amount: amt,
      categoryId: txn.categoryId,
      categoryName: cat?.name || txn.category || 'Uncategorized',
      isSplit: false,
    })
  }

  lines.sort((a, b) => {
    const byDate = new Date(b.date) - new Date(a.date)
    if (byDate !== 0) return byDate
    return String(a.payee).localeCompare(String(b.payee))
  })
  return lines
}

/**
 * The month income counts toward. Income marked "for next month" (say, gig pay
 * that lands mid-month) funds the following month's budget.
 */
export function incomeMonthKey(txn) {
  const key = monthKeyFromDate(txn.date)
  return txn.forNextMonth ? shiftMonth(key, 1) : key
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
    const key = incomeMonthKey(txn)
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
 * Credit cards on budget that have a payment category.
 * Returns { payCatByAccount, accountByPayCat }.
 */
export function cardLinks(categories, accounts) {
  const payCatByAccount = {}
  const accountByPayCat = {}
  if (!accounts) return { payCatByAccount, accountByPayCat }
  const byId = categoryById(categories)
  for (const a of accounts) {
    if (a.type !== 'credit' || a.onBudget === false || a.closed) continue
    let catId = a.creditCardCategoryId
    if (!catId || !byId[catId]) {
      catId = categories.find((c) => c.isCcPayment && c.linkedAccountId === a.id)?.id
    }
    if (!catId) continue
    payCatByAccount[a.id] = catId
    accountByPayCat[catId] = a.id
  }
  return { payCatByAccount, accountByPayCat }
}

/**
 * One pass over a month: expense activity per leaf, spending on each credit
 * card per leaf, and payments into each card's payment category.
 */
function monthLedger({ month, transactions, splitsByTxn, leafIds, links }) {
  const activity = {}
  const cardSpend = {} // leafId -> { accountId: amount }
  const payments = {} // payCatId -> amount
  const { payCatByAccount, accountByPayCat } = links
  const add = (obj, k, v) => {
    obj[k] = (obj[k] || 0) + v
  }
  const pairedToPayCat = new Set()
  for (const txn of transactions) {
    if (txn.categoryId && accountByPayCat[txn.categoryId] && txn.transferTransactionId) {
      pairedToPayCat.add(txn.transferTransactionId)
    }
  }

  for (const txn of transactions) {
    if (txn.excludeFromBudget) continue
    if (txn.cleared === false) continue
    if (monthKeyFromDate(txn.date) !== month) continue
    const amt = Number(txn.amount) || 0
    const cardPayCat = payCatByAccount[txn.accountId]

    // A transfer into a card is a payment on it.
    if (txn.transferAccountId && !txn.categoryId && !txn.isSplit) {
      if (cardPayCat && amt < 0 && !pairedToPayCat.has(txn.id)) {
        add(payments, cardPayCat, -amt)
      }
      continue
    }

    const lines =
      txn.isSplit && splitsByTxn[txn.id]
        ? splitsByTxn[txn.id].map((s) => [s.categoryId, Math.max(0, Number(s.amount) || 0)])
        : [[txn.categoryId, amt > 0 ? amt : 0]]
    for (const [catId, value] of lines) {
      if (!value || !leafIds.has(catId)) continue
      add(activity, catId, value)
      if (cardPayCat && !accountByPayCat[catId]) {
        if (!cardSpend[catId]) cardSpend[catId] = {}
        add(cardSpend[catId], txn.accountId, value)
      }
    }
  }
  return { activity, cardSpend, payments }
}

/**
 * Compute carryover + available for all expense leaves from startMonth..endMonth.
 *
 * With `accounts`, credit cards work the YNAB way: spending on a card that the
 * category could cover moves into that card's payment category; spending it
 * couldn't cover is credit overspending, which becomes debt rather than
 * coming out of next month's Ready to assign. Payments on the card come out of
 * the payment category. With a start month, each payment category starts with
 * what the card owed on the 1st, matching the Ready to assign opening amount.
 *
 * Returns { available, carryover, activity, overspend, creditOverspend }:
 * per-month maps of leaf -> amount; overspend[month] is cash overspending only.
 */
export function computeAvailability({
  categories,
  transactions,
  budgetsByMonth,
  splitsByTxn = {},
  endMonth,
  startMonth = null,
  accounts = null,
}) {
  const leaves = expenseLeaves(categories)
  const leafIds = new Set(leaves.map((l) => l.id))
  const links = cardLinks(categories, accounts)
  const cardModel = Boolean(accounts)
  const start = startMonth || earliestMonth(transactions)
  const available = {}
  const carryover = {}
  const activityOut = {}
  const overspend = {}
  const creditOverspend = {}

  const seed = {}
  if (cardModel && startMonth) {
    const { byAccount } = openingFunds({ accounts, transactions, month: startMonth })
    for (const [acctId, catId] of Object.entries(links.payCatByAccount)) {
      seed[catId] = Math.max(0, -(Number(byAccount[acctId]) || 0))
    }
  }

  const round = (n) => Math.round(n * 100) / 100
  let month = start
  for (let guard = 0; guard < 240; guard += 1) {
    available[month] = {}
    carryover[month] = {}
    activityOut[month] = {}
    creditOverspend[month] = {}
    let monthOverspend = 0
    const prev = shiftMonth(month, -1)
    const { activity, cardSpend, payments } = monthLedger({
      month,
      transactions,
      splitsByTxn,
      leafIds,
      links,
    })
    const moved = {} // payCatId -> funded card spending moved in

    const carryFor = (leafId) => {
      if (month === start) return Number(seed[leafId] || 0)
      const prevAvail = available[prev]?.[leafId]
      return Math.max(0, prevAvail !== undefined ? prevAvail : 0)
    }

    for (const leaf of leaves) {
      if (links.accountByPayCat[leaf.id]) continue
      const carry = carryFor(leaf.id)
      const assigned = leafAssigned(budgetsByMonth, leaf.id, month)
      const spent = Number(activity[leaf.id] || 0)
      const avail = carry + assigned - spent
      carryover[month][leaf.id] = carry
      available[month][leaf.id] = avail
      activityOut[month][leaf.id] = spent

      const byCard = cardModel ? cardSpend[leaf.id] || {} : {}
      const cardTotal = Object.values(byCard).reduce((s, v) => s + v, 0)
      const over = avail < 0 ? -avail : 0
      const creditOver = Math.min(over, cardTotal)
      if (creditOver > 0) creditOverspend[month][leaf.id] = round(creditOver)
      if (!leaf.isCcPayment) monthOverspend += over - creditOver

      const funded = cardTotal - creditOver
      if (funded > 0 && cardTotal > 0) {
        for (const [acctId, value] of Object.entries(byCard)) {
          const payCat = links.payCatByAccount[acctId]
          moved[payCat] = (moved[payCat] || 0) + (funded * value) / cardTotal
        }
      }
    }

    for (const leaf of leaves) {
      if (!links.accountByPayCat[leaf.id]) continue
      const carry = carryFor(leaf.id)
      const assigned = leafAssigned(budgetsByMonth, leaf.id, month)
      // Money in from funded spending counts against activity; payments out add.
      const net = round(
        Number(activity[leaf.id] || 0) + Number(payments[leaf.id] || 0) - Number(moved[leaf.id] || 0)
      )
      const avail = round(carry + assigned - net)
      carryover[month][leaf.id] = carry
      available[month][leaf.id] = avail
      activityOut[month][leaf.id] = net
      if (avail < 0 && cardModel) monthOverspend += -avail
    }

    overspend[month] = round(monthOverspend)
    if (month === endMonth) break
    month = shiftMonth(month, 1)
    if (month > endMonth) break
  }

  return {
    available,
    carryover,
    activity: activityOut,
    overspend,
    creditOverspend,
  }
}

export function incomeForMonth(transactions, categories, month, { fromMonth = null } = {}) {
  const incomeIds = new Set(
    categories.filter((c) => c.type === 'income').map((c) => c.id)
  )
  let income = 0
  for (const txn of transactions) {
    if (txn.excludeFromBudget) continue
    if (txn.cleared === false) continue
    if (txn.transferAccountId && !txn.categoryId) continue
    // Money that arrived before the budget start is already in the opening amount.
    if (fromMonth && monthKeyFromDate(txn.date) < fromMonth) continue
    const key = incomeMonthKey(txn)
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
  startMonth = null,
  accounts = null,
}) {
  const start = startMonth || earliestMonth(transactions)
  const leaves = expenseLeaves(categories)
  // With a chosen start month, what the on-budget accounts held on the 1st of
  // it is the money to assign; older months are left out entirely.
  const opening =
    startMonth && accounts ? openingFunds({ accounts, transactions, month: startMonth }).total : 0
  if (month < start) return 0
  const { overspend } = computeAvailability({
    categories,
    transactions,
    budgetsByMonth,
    splitsByTxn,
    endMonth: month,
    startMonth,
    accounts,
  })

  // Walk RTA month by month
  let rta = 0
  let cur = start
  for (let guard = 0; guard < 240; guard += 1) {
    const income = incomeForMonth(transactions, categories, cur, { fromMonth: startMonth })
    const assigned = leaves.reduce(
      (sum, leaf) => sum + leafAssigned(budgetsByMonth, leaf.id, cur),
      0
    )
    const priorOverspend =
      cur === start ? 0 : Number(overspend[shiftMonth(cur, -1)] || 0)
    // Leftover positive RTA carries; negative is clamped after overspend hit
    rta = Math.max(0, rta) + (cur === start ? opening : 0) + income - priorOverspend - assigned
    if (cur === month) return rta
    cur = shiftMonth(cur, 1)
    if (cur > month) return rta
  }
  return rta
}

function addMonthsToDate(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1 + months, 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  const mm = String(next.getMonth() + 1).padStart(2, '0')
  const dd = String(Math.min(d, lastDay)).padStart(2, '0')
  return `${next.getFullYear()}-${mm}-${dd}`
}

/**
 * The date a by-date target is working toward in `month`. A repeating target
 * (every N months) starts over once its date has passed.
 */
export function targetDueDate(target, month) {
  if (!target?.targetDate) return null
  let due = String(target.targetDate).slice(0, 10)
  const repeat = Number(target.repeatMonths) || 0
  if (repeat > 0) {
    for (let guard = 0; guard < 600 && due.slice(0, 7) < month; guard += 1) {
      due = addMonthsToDate(due, repeat)
    }
  }
  return due
}

/**
 * What a target asks for in `month`:
 * - monthly: the amount
 * - by_date: the amount spread over the months left until the date
 * - percent_income: a percent of the income budgeted this month, all of it or
 *   gig pay only (`ctx.income`, `ctx.gigIncome`)
 */
export function targetNeededForMonth(target, month, ctx = {}) {
  if (!target) return 0
  const amount = Number(target.amount) || 0
  if (target.targetType === 'monthly') return amount
  if (target.targetType === 'percent_income') {
    const pct = Number(target.percent) || 0
    const base = target.percentOf === 'gig' ? Number(ctx.gigIncome) || 0 : Number(ctx.income) || 0
    return Math.round(((pct / 100) * base) * 100) / 100
  }
  if (target.targetType === 'by_date' && target.targetDate) {
    const due = targetDueDate(target, month)
    const [y, m] = month.split('-').map(Number)
    const monthStart = new Date(y, m - 1, 1)
    const targetDate = new Date(due + 'T00:00:00')
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
  income = 0,
  gigIncome = 0,
}) {
  const needed = targetNeededForMonth(target, month, { income, gigIncome })
  if (needed <= 0) return 0
  // Fund until available reaches the monthly need (YNAB Underfunded-ish)
  const gap = needed - assigned
  return Math.max(0, gap)
}

/** YYYY-MM-DD for a Date (local day, as the store keeps them) or a date string. */
function dayKey(date) {
  if (date instanceof Date) {
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${m}-${d}`
  }
  return String(date || '').slice(0, 10)
}

function isDebtAccount(account) {
  return account?.type === 'credit' || account?.type === 'loan'
}

/**
 * What each on-budget account held at the start of `month` (YYYY-MM), worked
 * back from today's balance through the transactions dated on or after the 1st.
 * Cash counts as positive, card and loan balances as negative.
 * Returns { total, cash, owed, byAccount }.
 */
export function openingFunds({ accounts, transactions, month }) {
  const from = `${month}-01`
  const since = {}
  for (const t of transactions || []) {
    if (!t.accountId) continue
    if (dayKey(t.date) < from) continue
    since[t.accountId] = (since[t.accountId] || 0) + (Number(t.amount) || 0)
  }
  let cash = 0
  let owed = 0
  const byAccount = {}
  for (const a of accounts || []) {
    if (a.onBudget === false || a.closed) continue
    const bal = Number(a.balance) || 0
    const now = isDebtAccount(a) ? -Math.abs(bal) : bal
    // Money out (positive) lowered the value since then, so add it back.
    const value = Math.round((now + (since[a.id] || 0)) * 100) / 100
    byAccount[a.id] = value
    if (value >= 0) cash += value
    else owed += -value
  }
  const round = (n) => Math.round(n * 100) / 100
  return { total: round(cash - owed), cash: round(cash), owed: round(owed), byAccount }
}

/** Months a budget can start from: earliest transaction month up to `upTo`. */
export function startMonthOptions(transactions, upTo) {
  const out = []
  let m = earliestMonth(transactions)
  for (let guard = 0; guard < 240 && m <= upTo; guard += 1) {
    out.push(m)
    m = shiftMonth(m, 1)
  }
  return out.reverse()
}
