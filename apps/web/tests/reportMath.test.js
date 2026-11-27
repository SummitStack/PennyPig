import { describe, it, expect } from 'vitest'
import { spendingByCategory, incomeVsExpense } from '../src/lib/reportMath'

const categories = [
  { id: 'g', name: 'Needs', type: 'expense', parentId: null },
  { id: 'food', name: 'Food', type: 'expense', parentId: 'g' },
  { id: 'pay', name: 'Visa', type: 'expense', parentId: 'g', isCcPayment: true },
  { id: 'inc', name: 'Income', type: 'income', parentId: null },
]
const d = (s) => new Date(s + 'T12:00:00')
const transactions = [
  { id: '1', date: d('2026-11-03'), amount: 40, categoryId: 'food' },
  { id: '2', date: d('2026-11-10'), amount: 40, categoryId: 'pay' },
  { id: '3', date: d('2026-11-01'), amount: -500, categoryId: 'inc' },
]
const range = { dateFrom: '2026-11-01', dateTo: '2026-11-30' }

describe('reports and card payments', () => {
  it('leaves card payments out of spending', () => {
    const { rows, total } = spendingByCategory({ transactions, categories, ...range })
    expect(rows.map((r) => r.categoryId)).toEqual(['food'])
    expect(total).toBe(40)
  })
  it('leaves card payments out of expense totals', () => {
    expect(incomeVsExpense({ transactions, categories, ...range })).toEqual({ income: 500, expense: 40, net: 460 })
  })
})
