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

describe('credit cards', () => {
  const cats = [
    { id: 'g', name: 'Everyday', type: 'expense', parentId: null },
    { id: 'food', name: 'Groceries', type: 'expense', parentId: 'g' },
    { id: 'ccg', name: 'Credit Card Payments', type: 'expense', parentId: null },
    { id: 'pay', name: 'Visa', type: 'expense', parentId: 'ccg', isCcPayment: true, linkedAccountId: 'visa' },
    { id: 'inc', name: 'Paycheck', type: 'income', parentId: null },
  ]
  const accounts = [
    { id: 'chk', type: 'checking', balance: 1000, onBudget: true },
    { id: 'visa', type: 'credit', balance: 0, onBudget: true, creditCardCategoryId: 'pay' },
  ]
  const d = (s) => new Date(s + 'T00:00:00')

  it('moves funded card spending into the payment category', () => {
    const transactions = [
      { id: 't1', accountId: 'visa', date: d('2026-11-03'), amount: 60, categoryId: 'food' },
    ]
    const { available, activity, overspend } = computeAvailability({
      categories: cats,
      transactions,
      budgetsByMonth: { '2026-11': { food: 100 } },
      endMonth: '2026-11',
      accounts,
    })
    expect(available['2026-11'].food).toBe(40)
    expect(available['2026-11'].pay).toBe(60)
    expect(activity['2026-11'].pay).toBe(-60)
    expect(overspend['2026-11']).toBe(0)
  })

  it('treats uncovered card spending as credit overspending, not cash', () => {
    const transactions = [
      { id: 't1', accountId: 'visa', date: d('2026-11-03'), amount: 150, categoryId: 'food' },
    ]
    const { available, overspend, creditOverspend } = computeAvailability({
      categories: cats,
      transactions,
      budgetsByMonth: { '2026-11': { food: 100 } },
      endMonth: '2026-11',
      accounts,
    })
    expect(available['2026-11'].food).toBe(-50)
    expect(creditOverspend['2026-11'].food).toBe(50)
    expect(available['2026-11'].pay).toBe(100)
    expect(overspend['2026-11']).toBe(0)
  })

  it('takes a transfer payment out of the payment category', () => {
    const transactions = [
      { id: 't1', accountId: 'visa', date: d('2026-11-03'), amount: 60, categoryId: 'food' },
      { id: 'p1', accountId: 'chk', date: d('2026-11-20'), amount: 60, transferAccountId: 'visa', transferTransactionId: 'p2' },
      { id: 'p2', accountId: 'visa', date: d('2026-11-20'), amount: -60, transferAccountId: 'chk', transferTransactionId: 'p1' },
    ]
    const { available } = computeAvailability({
      categories: cats,
      transactions,
      budgetsByMonth: { '2026-11': { food: 100 } },
      endMonth: '2026-11',
      accounts,
    })
    expect(available['2026-11'].pay).toBe(0)
  })

  it('counts a cash payment categorized to the payment category once', () => {
    const transactions = [
      { id: 't1', accountId: 'visa', date: d('2026-11-03'), amount: 60, categoryId: 'food' },
      { id: 'p1', accountId: 'chk', date: d('2026-11-20'), amount: 60, categoryId: 'pay' },
    ]
    const { available } = computeAvailability({
      categories: cats,
      transactions,
      budgetsByMonth: { '2026-11': { food: 100 } },
      endMonth: '2026-11',
      accounts,
    })
    expect(available['2026-11'].pay).toBe(0)
  })

  it('starts the payment category with what the card owed on the start month', () => {
    const owing = [
      { id: 'chk', type: 'checking', balance: 1000, onBudget: true },
      { id: 'visa', type: 'credit', balance: 300, onBudget: true, creditCardCategoryId: 'pay' },
    ]
    const { available } = computeAvailability({
      categories: cats,
      transactions: [],
      budgetsByMonth: {},
      endMonth: '2026-11',
      startMonth: '2026-11',
      accounts: owing,
    })
    expect(available['2026-11'].pay).toBe(300)
    const rta = computeReadyToAssign({
      categories: cats,
      transactions: [],
      budgetsByMonth: {},
      month: '2026-11',
      startMonth: '2026-11',
      accounts: owing,
    })
    expect(rta).toBe(700)
  })

  it('makes an unfunded payment cash overspending', () => {
    const transactions = [
      { id: 'p1', accountId: 'chk', date: d('2026-10-20'), amount: 80, categoryId: 'pay' },
      { id: 'i1', accountId: 'chk', date: d('2026-10-01'), amount: -500, categoryId: 'inc' },
    ]
    const { overspend } = computeAvailability({
      categories: cats,
      transactions,
      budgetsByMonth: {},
      endMonth: '2026-10',
      accounts,
    })
    expect(overspend['2026-10']).toBe(80)
  })
})
