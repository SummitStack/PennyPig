import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlaidApiError, assertPlaidOk, friendlyPlaidMessage } from '../src/lib/plaid'
import { fetchTransactionChanges } from '../src/lib/plaidSync'

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('Plaid errors', () => {
  it('asks for a reconnect when the bank login expired', () => {
    try {
      assertPlaidOk(new Response('{}', { status: 400 }), { error_code: 'ITEM_LOGIN_REQUIRED' }, 'x')
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(PlaidApiError)
      expect((err as PlaidApiError).needsReconnect).toBe(true)
    }
  })
  it('explains a bank that is down without asking for a reconnect', () => {
    expect(friendlyPlaidMessage('INSTITUTION_DOWN', 'raw')).toMatch(/not responding/)
  })
})

describe('fetchTransactionChanges', () => {
  const calls: any[] = []
  beforeEach(() => {
    process.env.PLAID_CLIENT_ID = 'test-client'
    process.env.PLAID_SECRET = 'test-secret'
    calls.length = 0
  })
  afterEach(() => vi.unstubAllGlobals())

  function stub(responses: Array<[number, unknown]>) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        calls.push(JSON.parse(String(init.body)))
        const [status, body] = responses.shift() || [500, {}]
        return reply(status, body)
      })
    )
  }

  it('pages until has_more is false and collects removals', async () => {
    stub([
      [200, { added: [{ transaction_id: 'a' }], modified: [], removed: [], next_cursor: 'c1', has_more: true, transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE' }],
      [200, { added: [], modified: [{ transaction_id: 'b' }], removed: [{ transaction_id: 'p' }], next_cursor: 'c2', has_more: false, transactions_update_status: 'HISTORICAL_UPDATE_COMPLETE' }],
    ])
    const r = await fetchTransactionChanges('token', 'c0')
    expect(r.added.map((t) => t.transaction_id)).toEqual(['a'])
    expect(r.modified.map((t) => t.transaction_id)).toEqual(['b'])
    expect(r.removed).toEqual(['p'])
    expect(r.nextCursor).toBe('c2')
    expect(r.historyReady).toBe(true)
    expect(calls.map((c) => c.cursor)).toEqual(['c0', 'c1'])
  })

  it('starts over from the same cursor when data changes mid-paging', async () => {
    stub([
      [200, { added: [{ transaction_id: 'x' }], modified: [], removed: [], next_cursor: 'c1', has_more: true }],
      [400, { error_code: 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' }],
      [200, { added: [{ transaction_id: 'y' }], modified: [], removed: [], next_cursor: 'c9', has_more: false }],
    ])
    const r = await fetchTransactionChanges('token', null)
    expect(r.added.map((t) => t.transaction_id)).toEqual(['y'])
    expect(calls[0].cursor).toBeUndefined()
    expect(calls[2].cursor).toBeUndefined()
  })

  it('reports history not ready for a brand new link', async () => {
    stub([[200, { added: [], modified: [], removed: [], next_cursor: '', has_more: false, transactions_update_status: 'NOT_READY' }]])
    const r = await fetchTransactionChanges('token', null)
    expect(r.historyReady).toBe(false)
  })

  it('turns an expired login into a reconnect error', async () => {
    stub([[400, { error_code: 'ITEM_LOGIN_REQUIRED' }]])
    await expect(fetchTransactionChanges('token', 'c0')).rejects.toMatchObject({ needsReconnect: true })
  })
})
