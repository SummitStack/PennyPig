/**
 * Payee → category rules.
 *
 * An exact rule matches a payee (or the bank's merchant text) as a whole,
 * ignoring case and spacing. A "contains" rule matches any payee that
 * includes its text, so "doordash" catches "DOORDASH DASHER 4821". Exact
 * rules win; among "contains" rules the longest text wins.
 */
import { normalizePayeeKey } from './payee'

export function mapCategoryRuleRow(row) {
  return {
    id: row.id,
    matchKey: row.match_key,
    matchPayee: row.match_payee,
    categoryId: row.category_id,
    matchType: row.match_type === 'contains' ? 'contains' : 'exact',
    forNextMonth: Boolean(row.for_next_month),
    isGig: Boolean(row.is_gig),
  }
}

export function findCategoryRule(rules, { payee, merchant } = {}) {
  const keys = [normalizePayeeKey(payee), normalizePayeeKey(merchant)].filter(Boolean)
  if (!keys.length || !rules?.length) return null
  const exact = rules.find((r) => r.matchType !== 'contains' && keys.includes(r.matchKey))
  if (exact) return exact
  let best = null
  for (const r of rules) {
    if (r.matchType !== 'contains' || !r.matchKey) continue
    if (!keys.some((k) => k.includes(r.matchKey))) continue
    if (!best || r.matchKey.length > best.matchKey.length) best = r
  }
  return best
}

/** True when a rule marks this payer as gig work (DoorDash, Instacart…). */
export function isGigTransaction(txn, rules) {
  return Boolean(findCategoryRule(rules, txn)?.isGig)
}

/** Transactions a rule would apply to. */
export function transactionsMatchingRule(rule, transactions) {
  if (!rule) return []
  return (transactions || []).filter((t) => findCategoryRule([rule], t))
}
