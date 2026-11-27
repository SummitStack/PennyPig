import { describe, expect, it } from 'vitest'
import { findCardPaymentIssues } from '../src/lib/cardPayments'

const categories = [
  { id: 'home', name: 'Household', type: 'expense', parentId: 'g' },
  { id: 'g', name: 'Bills', type: 'expense', parentId: null },
  { id: 'pay', name: 'Visa', type: 'expense', parentId: 'ccg', isCcPayment: true, linkedAccountId: 'visa' },
  { id: 'ccg', name: 'Credit Card Payments', type: 'expense', parentId: null },
]
const accounts = [
  { id: 'chk', type: 'checking', onBudget: true },
  { id: 'sav', type: 'savings', onBudget: true },
  { id: 'visa', type: 'credit', onBudget: true, mask: '3333', creditCardCategoryId: 'pay' },
]

describe('findCardPaymentIssues', () => {
  it('keeps a card-side payment filed as spending out of the budget', () => {
    const issues = findCardPaymentIssues({
      categories,
      accounts,
      transactions: [
        { id: 'a', accountId: 'visa', date: '2026-09-20', amount: 2078.5, payee: 'AUTOMATIC PAYMENT - THANK', categoryId: 'home' },
      ],
    })
    expect(issues).toHaveLength(1)
    expect(issues[0].kind).toBe('exclude')
  })

  it('files a cash-side payment under the card by its last digits', () => {
    const issues = findCardPaymentIssues({
      categories,
      accounts,
      transactions: [
        { id: 'b', accountId: 'sav', date: '2026-09-11', amount: 25, payee: 'CREDIT CARD 3333 PAYMENT *//', categoryId: 'home' },
      ],
    })
    expect(issues[0]).toMatchObject({ kind: 'pay', payCategoryId: 'pay', cardAccountId: 'visa' })
  })

  it('links both sides of one payment as a transfer', () => {
    const issues = findCardPaymentIssues({
      categories,
      accounts,
      transactions: [
        { id: 'c1', accountId: 'chk', date: '2026-09-11', amount: 400, payee: 'Card payment Visa', categoryId: null },
        { id: 'c2', accountId: 'visa', date: '2026-09-13', amount: -400, payee: 'AUTOPAY PAYMENT', categoryId: 'home' },
      ],
    })
    expect(issues).toHaveLength(1)
    expect(issues[0].kind).toBe('link')
    expect(issues[0].cash.id).toBe('c1')
  })

  it('leaves payments already under the payment category alone', () => {
    const issues = findCardPaymentIssues({
      categories,
      accounts,
      transactions: [
        { id: 'd', accountId: 'chk', date: '2026-09-11', amount: 25, payee: 'CREDIT CARD 3333 PAYMENT', categoryId: 'pay' },
      ],
    })
    expect(issues).toHaveLength(0)
  })
})
