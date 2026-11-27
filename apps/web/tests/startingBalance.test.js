import { describe, expect, it } from 'vitest'
import { startingBalanceDate, startingBalanceEntry } from '../src/lib/startingBalance'

describe('startingBalanceEntry', () => {
  it('turns cash that was already there into budgetable income', () => {
    // 500 now after 200 went out means 700 at the start.
    expect(startingBalanceEntry({ type: 'checking', balance: 500, importedSum: 200 })).toEqual({
      amount: 700,
      inflow: true,
      excludeFromBudget: false,
    })
  })

  it('keeps old card debt out of the budget', () => {
    expect(startingBalanceEntry({ type: 'credit', balance: 400, importedSum: 100 })).toEqual({
      amount: 300,
      inflow: false,
      excludeFromBudget: true,
    })
  })

  it('needs no entry when the history already adds up', () => {
    expect(startingBalanceEntry({ type: 'savings', balance: 50, importedSum: -50 })).toBeNull()
  })
})

describe('startingBalanceDate', () => {
  it('is the day before the oldest transaction', () => {
    expect(startingBalanceDate(['2026-09-03', '2026-08-01'])).toBe('2026-07-31')
  })
})
