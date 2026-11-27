import { authFetch } from './authFetch'

/** Bank-linked accounts only; manual accounts have no Plaid item to sync. */
export function linkedPlaidAccounts(accounts = []) {
  return accounts.filter((a) => a.plaidItemId && !a.isManual)
}

/**
 * Sync every linked bank once. The sync route syncs all accounts on the same
 * Plaid item, so one request per item is enough. One failing bank no longer
 * stops the others.
 */
export async function syncAllLinked(accounts = []) {
  const seen = new Set()
  const targets = []
  for (const a of linkedPlaidAccounts(accounts)) {
    if (seen.has(a.plaidItemId)) continue
    seen.add(a.plaidItemId)
    targets.push(a)
  }

  let synced = 0
  const errors = []
  const reconnect = []
  for (const account of targets) {
    try {
      const response = await authFetch('/api/plaid/sync', {
        method: 'POST',
        body: JSON.stringify({ account_id: account.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (data.reconnect) {
        reconnect.push(account.id)
        throw new Error('needs you to sign in again. Reconnect it on the Accounts page.')
      }
      if (!response.ok) throw new Error(data.error || 'Sync failed')
      synced += Number(data.synced || 0)
    } catch (err) {
      errors.push(`${account.institution || account.name}: ${err.message}`)
    }
  }
  return { banks: targets.length, synced, errors, reconnect }
}
