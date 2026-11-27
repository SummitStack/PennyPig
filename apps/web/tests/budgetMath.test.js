import { describe, expect, it } from 'vitest'
import {
  computeAvailability,
  computeReadyToAssign,
  openingFunds,
  startMonthOptions,
} from '../src/lib/budgetMath'

const categories = [
  { id: 'inc', name: 'Salary', type: 'income', parentId: null },
  { id: 'living', name: 'Living', type: 'expense', parentId: null },
  { id: 'food', name: 'Groceries', type: 'expense', parentId: 'living' },
]

const accounts = [
  { id: 'chk', type: 'checking', balance: 1000, onBudget: true },
  { id: 'card', type: 'credit', balance: 300, onBudget: true },
  { id: 'loan', type: 'loan', balance: 50000, onBudget: false },
]

// Positive = money out, negative = money in.
const transactions = [
  { id: 't1', accountId: 'chk', date: '2026-09-01', amount: -2000, categoryId: 'inc', cleared: true },
  { id: 't2', accountId: 'chk', date: '2026-09-10', amount: 1500, categoryId: 'food', cleared: true },
  { id: 't3', accountId: 'chk', date: '2026-10-10', amount: 800, categoryId: 'food', cleared: true },
  { id: 't4', accountId: 'card', date: '2026-11-05', amount: 100, categoryId: 'food', cleared: true },
  { id: 't5', accountId: 'loan', date: '2026-11-01', amount: -400, categoryId: null, cleared: true },
]

describe('Ready to assign', () => {
  it('lets months nobody budgeted eat later income when there is no start month', () => {
    const rta = computeReadyToAssign({ categories, transactions, budgetsByMonth: {}, month: '2026-11' })
    // Sep: 2000 in, 1500 overspent. Oct: 500 left, 800 overspent. Nov: below zero.
    expect(rta).toBe(-300)
  })

  it('starts from what the budget accounts held on the 1st of the start month', () => {
    const rta = computeReadyToAssign({
      categories,
      transactions,
      accounts,
      budgetsByMonth: {},
      month: '2026-11',
      startMonth: '2026-11',
    })
    // Checking 1000, card owed 300 - 100 bought in Nov = 200 on Nov 1. Loan is off budget.
    expect(rta).toBe(800)
  })

  it('takes assigned money off the opening funds', () => {
    const rta = computeReadyToAssign({
      categories,
      transactions,
      accounts,
      budgetsByMonth: { '2026-11': { food: 50 } },
      month: '2026-11',
      startMonth: '2026-11',
    })
    expect(rta).toBe(750)
  })

  it('is zero for months before the start month', () => {
    const rta = computeReadyToAssign({
      categories,
      transactions,
      accounts,
      budgetsByMonth: {},
      month: '2026-10',
      startMonth: '2026-11',
    })
    expect(rta).toBe(0)
  })
})

describe('openingFunds', () => {
  it('splits cash from card debt and skips off-budget accounts', () => {
    const f = openingFunds({ accounts, transactions, month: '2026-11' })
    expect(f).toMatchObject({ cash: 1000, owed: 200, total: 800 })
    expect(f.byAccount.loan).toBeUndefined()
  })

  it('reads Date objects the way the app stores them', () => {
    const asDates = transactions.map((t) => ({ ...t, date: new Date(`${t.date}T00:00:00`) }))
    expect(openingFunds({ accounts, transactions: asDates, month: '2026-11' })).toMatchObject({ cash: 1000, owed: 200, total: 800 })
  })

  it('works back through transactions dated on or after the 1st', () => {
    const f = openingFunds({ accounts, transactions, month: '2026-10' })
    // Checking spent 800 in Oct, so it held 1800 on Oct 1.
    expect(f.byAccount.chk).toBe(1800)
  })
})

describe('computeAvailability', () => {
  it('ignores spending before the start month', () => {
    const { available, overspend } = computeAvailability({
      categories,
      transactions,
      budgetsByMonth: {},
      endMonth: '2026-11',
      startMonth: '2026-11',
    })
    expect(available['2026-11'].food).toBe(-100)
    expect(overspend['2026-10']).toBeUndefined()
  })
})

describe('startMonthOptions', () => {
  it('lists months newest first from the oldest transaction', () => {
    expect(startMonthOptions(transactions, '2026-11')).toEqual(['2026-11', '2026-10', '2026-09'])
  })
})
