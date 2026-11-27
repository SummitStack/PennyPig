import { describe, expect, it } from 'vitest'
import { gigIncomeForMonth, gigSummary } from '../src/lib/gigIncome'
import { targetDueDate, targetNeededForMonth } from '../src/lib/budgetMath'

const rules = [{ id: 1, matchKey: 'doordash', matchType: 'contains', isGig: true, categoryId: 'inc' }]
const pay = (id, date, amt, extra = {}) => ({ id, date, amount: -amt, payee: 'DOORDASH INC', categoryId: 'inc', ...extra })

describe('gig income', () => {
  const transactions = [
    pay('a', '2026-08-04', 300),
    pay('b', '2026-09-01', 250),
    pay('c', '2026-09-08', 250),
    pay('d', '2026-10-06', 400),
    pay('e', '2026-11-03', 200, { forNextMonth: true }),
    { id: 'x', date: '2026-11-04', amount: -1000, payee: 'Acme payroll', categoryId: 'inc' },
  ]
  it('totals gig pay by the month it funds', () => {
    expect(gigIncomeForMonth({ transactions, rules, month: '2026-11' })).toBe(0)
    expect(gigIncomeForMonth({ transactions, rules, month: '2026-12' })).toBe(200)
    expect(gigIncomeForMonth({ transactions, rules, month: '2026-11', byArrival: true })).toBe(200)
  })
  it('finds the slow-month baseline from the first gig month on', () => {
    const s = gigSummary({ transactions, rules, month: '2026-11', months: 6 })
    expect(s.thisMonth).toBe(200)
    expect(s.payouts).toBe(1)
    expect(s.lowest).toBe(300)
    expect(s.average).toBe(400)
  })
})

describe('targets', () => {
  it('asks for a percent of gig pay', () => {
    const t = { targetType: 'percent_income', percent: 25, percentOf: 'gig' }
    expect(targetNeededForMonth(t, '2026-11', { income: 3000, gigIncome: 800 })).toBe(200)
    expect(targetNeededForMonth({ ...t, percentOf: 'all' }, '2026-11', { income: 3000 })).toBe(750)
  })
  it('starts a repeating by-date target over after its date', () => {
    const t = { targetType: 'by_date', amount: 300, targetDate: '2026-09-15', repeatMonths: 3 }
    expect(targetDueDate(t, '2026-10')).toBe('2026-12-15')
    expect(targetNeededForMonth(t, '2026-10')).toBe(100)
    expect(targetNeededForMonth({ ...t, repeatMonths: null }, '2026-10')).toBe(0)
  })
})
