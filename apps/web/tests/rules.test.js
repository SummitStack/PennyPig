import { describe, expect, it } from 'vitest'
import { findCategoryRule, isGigTransaction } from '../src/lib/rules'

const rules = [
  { id: 1, matchKey: 'doordash', matchType: 'contains', categoryId: 'gig', isGig: true },
  { id: 2, matchKey: 'doordash dasher direct', matchType: 'contains', categoryId: 'gig2' },
  { id: 3, matchKey: "mcdonald's", matchType: 'exact', categoryId: 'dining' },
]

describe('findCategoryRule', () => {
  it('matches exact payees ignoring case and spaces', () => {
    expect(findCategoryRule(rules, { payee: "  McDonald's " }).categoryId).toBe('dining')
  })
  it('matches contains rules and prefers the longest', () => {
    expect(findCategoryRule(rules, { payee: 'DOORDASH DASHER DIRECT 22' }).id).toBe(2)
    expect(findCategoryRule(rules, { merchant: 'DoorDash Inc' }).id).toBe(1)
  })
  it('returns null with no match', () => {
    expect(findCategoryRule(rules, { payee: 'Shell' })).toBeNull()
  })
  it('flags gig payers', () => {
    expect(isGigTransaction({ payee: 'DOORDASH INC' }, rules)).toBe(true)
    expect(isGigTransaction({ payee: 'Acme payroll' }, rules)).toBe(false)
  })
})
