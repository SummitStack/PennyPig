import type { SupabaseClient } from '@supabase/supabase-js'
import { assertPlaidOk, plaidRequest } from './plaid'
import { isParentCategory } from './categories'
import { resolveToLeafCategoryId, suggestLeafCategoryId } from './categorySuggest'
import { startingBalanceDate, startingBalanceEntry } from './startingBalance'
import { mapPlaidAccountType, plaidAccountOnBudget, serviceRoleClient } from './supabaseServer'

type AccountRow = {
  id: string
  plaid_account_id: string | null
}

function normalizePayeeKey(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function mapCategoryRow(row: {
  id: string
  name: string
  parent_id?: string | null
  type?: string
  sort_order?: number
}) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id || null,
    type: row.type || 'expense',
    sortOrder: row.sort_order ?? 0,
  }
}

/**
 * Reads the item's Plaid access token on the server.
 *
 * With SUPABASE_SERVICE_ROLE_KEY set, the token is read with the service role,
 * so the database can stop handing it to signed-in browsers (see the
 * 20261127_plaid_token_server_only migration). Without the key it falls back to
 * the older RPC, which any signed-in user can also call from their browser.
 */
export async function getPlaidAccessToken(
  supabase: SupabaseClient,
  plaidItemId: string,
  userId?: string
): Promise<string> {
  const admin = serviceRoleClient()
  if (admin && userId) {
    const { data, error } = await admin
      .from('plaid_items')
      .select('access_token')
      .eq('id', plaidItemId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data?.access_token) throw new Error('Plaid access token not found for this item')
    return data.access_token as string
  }

  const { data, error } = await supabase.rpc('get_plaid_access_token', {
    p_plaid_item_id: plaidItemId,
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Plaid access token not found for this item')
  return data as string
}

type SyncOptions = {
  /** plaid_items.id; with it the sync keeps a cursor and only fetches changes. */
  plaidItemId?: string | null
  /** Client that can read and write plaid_items sync state (the service role when set). */
  stateClient?: SupabaseClient | null
}

export type SyncResult = {
  synced: number
  removed: number
  /** False while Plaid is still pulling the first history for a new link. */
  historyReady: boolean
}

type TransactionChanges = {
  added: any[]
  modified: any[]
  removed: string[]
  nextCursor: string
  historyReady: boolean
}

/**
 * Pages through Plaid's /transactions/sync from `cursor`. Plaid asks callers
 * to start over from the same cursor if the data changes mid-pagination.
 */
export async function fetchTransactionChanges(
  accessToken: string,
  cursor: string | null
): Promise<TransactionChanges> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const added: any[] = []
    const modified: any[] = []
    const removed: string[] = []
    let next = cursor || ''
    let status = ''
    let restart = false
    for (let page = 0; page < 100; page += 1) {
      const { response, data } = await plaidRequest('/transactions/sync', {
        access_token: accessToken,
        ...(next ? { cursor: next } : {}),
        count: 500,
      })
      if (!response.ok && data?.error_code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') {
        restart = true
        break
      }
      assertPlaidOk(response, data, 'Failed to fetch transactions')
      added.push(...(data.added || []))
      modified.push(...(data.modified || []))
      for (const r of data.removed || []) if (r?.transaction_id) removed.push(r.transaction_id)
      next = data.next_cursor || next
      status = data.transactions_update_status || status
      if (!data.has_more) break
    }
    if (!restart) {
      return {
        added,
        modified,
        removed,
        nextCursor: next,
        // Older API versions don't send a status; treat a cursor as ready.
        historyReady: status ? status !== 'NOT_READY' : Boolean(next),
      }
    }
  }
  throw new Error('Your bank kept changing while syncing. Try again in a minute.')
}

/** The saved cursor, or undefined when the sync-state columns don't exist yet. */
async function readCursor(
  client: SupabaseClient,
  plaidItemId: string,
  userId: string
): Promise<string | null | undefined> {
  const { data, error } = await client
    .from('plaid_items')
    .select('sync_cursor')
    .eq('id', plaidItemId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return undefined
  return (data as { sync_cursor?: string | null } | null)?.sync_cursor ?? null
}

/**
 * Remembers how the last sync of a bank went, so the dashboard can say when it
 * needs the user to sign in again. Does nothing before the migration that adds
 * these columns is applied.
 */
export async function recordItemSyncState(
  client: SupabaseClient,
  plaidItemId: string,
  userId: string,
  state: { cursor?: string; error?: unknown }
) {
  const err = state.error
  const patch: Record<string, unknown> = err
    ? {
        needs_reconnect: Boolean((err as { needsReconnect?: boolean })?.needsReconnect),
        last_sync_error: err instanceof Error ? err.message.slice(0, 300) : 'Sync failed',
      }
    : { needs_reconnect: false, last_sync_error: null, last_synced_at: new Date().toISOString() }
  if (state.cursor !== undefined) patch.sync_cursor = state.cursor
  const { error } = await client.from('plaid_items').update(patch).eq('id', plaidItemId).eq('user_id', userId)
  if (error) console.warn('Could not save bank sync state:', error.message)
}

/** Older full-window fetch, used until the sync-state migration is applied. */
async function fetchLast90Days(accessToken: string): Promise<TransactionChanges> {
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = new Date().toISOString().split('T')[0]
  const { response, data } = await plaidRequest('/transactions/get', {
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
  })
  if (!response.ok && data?.error_code === 'PRODUCT_NOT_READY') {
    return { added: [], modified: [], removed: [], nextCursor: '', historyReady: false }
  }
  assertPlaidOk(response, data, 'Failed to fetch transactions')
  return { added: data.transactions || [], modified: [], removed: [], nextCursor: '', historyReady: true }
}

async function refreshBalances(supabase: SupabaseClient, userId: string, accessToken: string) {
  const accountsResult = await plaidRequest('/accounts/get', {
    access_token: accessToken,
  })
  if (!accountsResult.response.ok) return
  const { data: storedTypes } = await supabase
    .from('accounts')
    .select('plaid_account_id, account_type')
    .eq('user_id', userId)
    .not('plaid_account_id', 'is', null)
  const typeByPlaidId = new Map(
    (storedTypes || []).map((r: any) => [r.plaid_account_id, r.account_type])
  )
  for (const plaidAccount of accountsResult.data.accounts || []) {
    // Repair loans saved as 'other' by the old type mapping, so they count
    // as debts in net worth and stay out of the budget.
    const mapped = mapPlaidAccountType(plaidAccount.type, plaidAccount.subtype)
    const repair =
      typeByPlaidId.get(plaidAccount.account_id) === 'other' && mapped === 'loan'
        ? { account_type: mapped, on_budget: plaidAccountOnBudget(plaidAccount.type) }
        : {}
    await supabase
      .from('accounts')
      .update({
        balance: plaidAccount.balances?.current ?? 0,
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...repair,
      })
      .eq('user_id', userId)
      .eq('plaid_account_id', plaidAccount.account_id)
  }
}

/**
 * Pulls what changed at the bank and saves it. With a plaid item id and the
 * sync-state migration applied, it uses Plaid's /transactions/sync, which
 * reports edits, removals and pending charges that posted; otherwise it falls
 * back to re-reading the last 90 days.
 */
export async function syncTransactionsForAccounts(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  accounts: AccountRow[],
  options: SyncOptions = {}
): Promise<SyncResult> {
  const stateClient = options.stateClient || supabase
  const cursor = options.plaidItemId
    ? await readCursor(stateClient, options.plaidItemId, userId)
    : undefined
  const useSync = cursor !== undefined

  const changes = useSync
    ? await fetchTransactionChanges(accessToken, cursor)
    : await fetchLast90Days(accessToken)

  await refreshBalances(supabase, userId, accessToken)

  const synced = await saveTransactions(supabase, userId, accounts, [...changes.added, ...changes.modified])

  let removed = 0
  if (changes.removed.length > 0) {
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .in('plaid_transaction_id', changes.removed)
      .select('id')
    if (error) throw new Error(error.message)
    removed = (data || []).length
  }

  if (useSync && options.plaidItemId) {
    await recordItemSyncState(stateClient, options.plaidItemId, userId, { cursor: changes.nextCursor })
  }

  return { synced, removed, historyReady: changes.historyReady }
}

async function saveTransactions(
  supabase: SupabaseClient,
  userId: string,
  accounts: AccountRow[],
  plaidTransactions: any[]
): Promise<number> {
  if (plaidTransactions.length === 0) return 0

  const accountMap = new Map(
    accounts
      .filter((a) => a.plaid_account_id)
      .map((a) => [a.plaid_account_id as string, a.id])
  )

  const [{ data: categories }, { data: renameRules }, { data: categoryRules }] =
    await Promise.all([
      supabase
        .from('categories')
        .select('id, name, parent_id, type, sort_order')
        .eq('user_id', userId),
      supabase
        .from('payee_rename_rules')
        .select('match_key, rename_to')
        .eq('user_id', userId),
      supabase
        .from('payee_category_rules')
        .select('match_key, category_id')
        .eq('user_id', userId),
    ])

  const mappedCategories = (categories || []).map(mapCategoryRow)

  const renameByKey = new Map(
    (renameRules || []).map((r: { match_key: string; rename_to: string }) => [
      r.match_key,
      r.rename_to,
    ])
  )

  const categoryRuleByKey = new Map(
    (categoryRules || []).map(
      (r: { match_key: string; category_id: string }) => [
        r.match_key,
        r.category_id,
      ]
    )
  )

  // A posted charge arrives with the id of the pending one it replaces.
  const pendingIdFor = new Map<string, string>()

  const incoming = plaidTransactions
    .map((txn: any) => {
      const accountId = accountMap.get(txn.account_id)
      if (!accountId) return null
      if (txn.pending_transaction_id) pendingIdFor.set(txn.transaction_id, txn.pending_transaction_id)

      const pfc = txn.personal_finance_category || {}
      const merchant = txn.merchant_name || txn.name || 'Unknown'
      const matchKey = normalizePayeeKey(merchant)
      const payee = renameByKey.get(matchKey) || merchant
      const pending = Boolean(txn.pending)
      // Plaid: positive = money leaving account (outflow). Keep signed.
      const signed = Number(txn.amount) || 0
      const ruleId = categoryRuleByKey.get(matchKey)
      const suggestedCategoryId = suggestLeafCategoryId({
        categories: mappedCategories,
        payee,
        merchant,
        plaidPrimary: pfc.primary || '',
        plaidDetailed: pfc.detailed || '',
        ...(ruleId ? { ruleCategoryId: ruleId } : {}),
      })

      return {
        user_id: userId,
        account_id: accountId,
        plaid_transaction_id: txn.transaction_id,
        date: txn.date,
        amount: signed,
        merchant,
        payee,
        category_id: suggestedCategoryId,
        description: txn.name || null,
        status: pending ? 'pending' : 'posted',
        // Uncleared until user reviews category and clears → budget
        cleared: false,
        last_sync_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (incoming.length === 0) return 0

  const plaidIds = incoming.map((r) => r.plaid_transaction_id as string)
  const lookupIds = Array.from(new Set([...plaidIds, ...Array.from(pendingIdFor.values())]))
  const { data: existingRows } = await supabase
    .from('transactions')
    .select('plaid_transaction_id, category_id, payee, merchant, memo, cleared')
    .eq('user_id', userId)
    .in('plaid_transaction_id', lookupIds)

  const existingByPlaid = new Map(
    (existingRows || []).map((row: any) => [row.plaid_transaction_id, row])
  )

  const rows = incoming.map((row) => {
    const id = row.plaid_transaction_id as string
    // Keep what the user did to the pending charge once it posts.
    const existing = existingByPlaid.get(id) || existingByPlaid.get(pendingIdFor.get(id) || '')
    if (!existing) return row

    // Preserve user categorization and memo; re-apply rename rules to payee
    const merchant = String(row.merchant)
    const matchKey = normalizePayeeKey(merchant)
    const renamed = renameByKey.get(matchKey)
    const preservedCategory = existing.category_id
      ? isParentCategory(mappedCategories, existing.category_id)
        ? suggestLeafCategoryId({
            categories: mappedCategories,
            payee: String(existing.payee || merchant),
            merchant,
          }) || resolveToLeafCategoryId(mappedCategories, existing.category_id)
        : existing.category_id
      : row.category_id
    return {
      ...row,
      category_id: preservedCategory,
      memo: existing.memo ?? null,
      payee: renamed || existing.payee || merchant,
      // Keep manual cleared state if user already cleared
      cleared:
        existing.cleared !== null && existing.cleared !== undefined
          ? existing.cleared
          : false,
    }
  })

  const { error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'plaid_transaction_id' })

  if (error) throw new Error(error.message)
  return rows.length
}

/**
 * After a bank is first linked, add one "Starting balance" transaction per
 * account so its register adds up to the bank's balance and existing cash
 * reaches Ready to Assign. Skips accounts that already have one, so it is
 * safe to call more than once.
 */
export async function recordStartingBalances(
  supabase: SupabaseClient,
  userId: string,
  accountIds: string[]
): Promise<number> {
  if (accountIds.length === 0) return 0

  const [{ data: accounts }, { data: txns }, { data: categories }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, account_type, balance, on_budget')
      .eq('user_id', userId)
      .in('id', accountIds),
    supabase
      .from('transactions')
      .select('account_id, amount, date, payee')
      .eq('user_id', userId)
      .in('account_id', accountIds),
    supabase
      .from('categories')
      .select('id, name, parent_id, type, sort_order')
      .eq('user_id', userId)
      .eq('type', 'income'),
  ])

  const incomeCats = (categories || []).map(mapCategoryRow)
  const incomeLeaves = incomeCats.filter((c) => !incomeCats.some((k) => k.parentId === c.id))
  const incomeCategoryId =
    incomeLeaves.find((c) => /other income/i.test(c.name))?.id || incomeLeaves[0]?.id || null

  let created = 0
  for (const account of accounts || []) {
    const rows = (txns || []).filter((t: any) => t.account_id === account.id)
    if (rows.some((t: any) => t.payee === 'Starting balance')) continue
    // An 'other' account could be cash or a debt, and guessing wrong would put
    // a whole loan into Ready to Assign. Wait until its type is set.
    if (account.account_type === 'other') continue
    const entry = startingBalanceEntry({
      type: account.account_type,
      balance: Number(account.balance) || 0,
      importedSum: rows.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0),
    })
    if (!entry) continue
    const offBudget = account.on_budget === false || entry.excludeFromBudget
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      account_id: account.id,
      date: startingBalanceDate(rows.map((t: any) => t.date)),
      amount: entry.inflow ? -entry.amount : entry.amount,
      merchant: 'Starting balance',
      payee: 'Starting balance',
      description: 'Starting balance',
      category_id: offBudget || !entry.inflow ? null : incomeCategoryId,
      status: 'posted',
      cleared: true,
      exclude_from_budget: offBudget,
    })
    if (!error) created += 1
  }
  return created
}

/**
 * Syncs one bank connection end to end: transactions, balances, sync state and
 * any missing starting balances. Starting balances still run when the bank
 * needs the user to sign in again, using the balances from the last good sync,
 * but wait while Plaid is still pulling a new link's history.
 */
export async function syncPlaidItem(
  supabase: SupabaseClient,
  userId: string,
  plaidItemId: string,
  stateClient: SupabaseClient | null = null
): Promise<{ synced: number; removed: number; startingBalances: number; error: unknown }> {
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('plaid_item_id', plaidItemId)
  if (accountsError) throw new Error(accountsError.message)
  const accountIds = (accounts || []).map((a: { id: string }) => a.id)

  let result: SyncResult | null = null
  let syncError: unknown = null
  try {
    const accessToken = await getPlaidAccessToken(supabase, plaidItemId, userId)
    result = await syncTransactionsForAccounts(supabase, userId, accessToken, accounts || [], {
      plaidItemId,
      stateClient,
    })
  } catch (err) {
    syncError = err
    await recordItemSyncState(stateClient || supabase, plaidItemId, userId, { error: err })
  }

  let startingBalances = 0
  if (!result || result.historyReady) {
    try {
      startingBalances = await recordStartingBalances(supabase, userId, accountIds)
    } catch (startErr) {
      console.error('Starting balance warning:', startErr)
    }
  }

  return {
    synced: result?.synced || 0,
    removed: result?.removed || 0,
    startingBalances,
    error: syncError,
  }
}
