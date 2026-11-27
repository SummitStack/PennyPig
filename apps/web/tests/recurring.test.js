import { describe, expect, it } from 'vitest'
import { advanceDate, dueItems, upcomingItems } from '../src/lib/recurring'

describe('advanceDate', () => {
  it('keeps the 31st after a short month', () => {
    expect(advanceDate('2026-01-31', 'monthly', 31)).toBe('2026-02-28')
    expect(advanceDate('2026-02-28', 'monthly', 31)).toBe('2026-03-31')
  })
  it('moves weekly and every two weeks', () => {
    expect(advanceDate('2026-12-28', 'weekly')).toBe('2027-01-04')
    expect(advanceDate('2026-12-28', 'biweekly')).toBe('2027-01-11')
  })
  it('handles leap years for yearly items', () => {
    expect(advanceDate('2028-02-29', 'yearly', 29)).toBe('2029-02-28')
  })
})

describe('due and upcoming', () => {
  const items = [
    { id: 'a', nextDate: '2026-11-20' },
    { id: 'b', nextDate: '2026-12-05' },
    { id: 'c', nextDate: '2027-02-01' },
  ]
  it('splits items by today and the next two weeks', () => {
    expect(dueItems(items, '2026-11-27').map((i) => i.id)).toEqual(['a'])
    expect(upcomingItems(items, '2026-11-27', 14).map((i) => i.id)).toEqual(['b'])
  })
})
