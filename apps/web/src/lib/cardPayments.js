/**
 * Finds credit card payments that are filed as spending.
 *
 * A card payment moves money between your own accounts. Filed under a
 * spending category it counts twice: once when you bought things on the card
 * and again when you paid the card off.
 *
 * Each issue is one of:
 * - { kind: 'link', cash, card, cardAccountId }: both sides of one payment;
 *   mark them as a transfer.
 * - { kind: 'pay', txn, payCategoryId, cardAccountId }: money leaving a cash
 *   account to pay a card; file it under the card's payment category.
 * - { kind: 'exclude', txn, cardAccountId }: the card's side of a payment with
 *   no matching cash side; keep it out of the budget.
 */
import { cardLinks } from './budgetMath'

export const CARD_PAYMENT_RE =
  /automatic payment|autopay|payment\s*-\s*thank|credit card .*payment|card payment|\bpayment to .*card\b/i

const DAY = 24 * 60 * 60 * 1000

function payeeText(txn) {
  return `${txn.payee || ''} ${txn.merchant || ''}`
}

function looksLikeCardPayment(txn) {
  return CARD_PAYMENT_RE.test(payeeText(txn))
}

function isPureTransfer(txn) {
  return txn.transferAccountId && !txn.categoryId && !txn.isSplit
}

/** Which card a cash-side payment is for: by the card's last digits, or the only card. */
function cardForPayment(txn, cards) {
  const text = payeeText(txn)
  const byMask = cards.filter((a) => a.mask && new RegExp(`\\b${a.mask}\\b`).test(text))
  if (byMask.length === 1) return byMask[0]
  if (cards.length === 1) return cards[0]
  return null
}

export function findCardPaymentIssues({ transactions, accounts, categories }) {
  const { payCatByAccount, accountByPayCat } = cardLinks(categories, accounts)
  const accountsById = Object.fromEntries((accounts || []).map((a) => [a.id, a]))
  const cards = (accounts || []).filter((a) => payCatByAccount[a.id])
  if (cards.length === 0) return []

  const candidates = (transactions || []).filter(
    (t) => !t.isSplit && !isPureTransfer(t) && !t.excludeFromBudget && looksLikeCardPayment(t)
  )
  const cardSide = candidates.filter((t) => payCatByAccount[t.accountId])
  const cashSide = candidates.filter((t) => {
    const acct = accountsById[t.accountId]
    if (!acct || acct.type === 'credit' || acct.type === 'loan' || acct.onBudget === false) return false
    if (Number(t.amount) <= 0) return false
    return true
  })

  const issues = []
  const usedCash = new Set()

  for (const card of cardSide) {
    const amt = Number(card.amount) || 0
    // A real payment shows as money in on the card and money out of cash.
    const pair =
      amt < 0
        ? cashSide.find(
            (c) =>
              !usedCash.has(c.id) &&
              Math.abs(Number(c.amount) - -amt) < 0.005 &&
              Math.abs(new Date(c.date) - new Date(card.date)) <= 5 * DAY
          )
        : null
    if (pair) {
      usedCash.add(pair.id)
      issues.push({ kind: 'link', cash: pair, card, cardAccountId: card.accountId })
    } else {
      issues.push({ kind: 'exclude', txn: card, cardAccountId: card.accountId })
    }
  }

  for (const cash of cashSide) {
    if (usedCash.has(cash.id)) continue
    if (accountByPayCat[cash.categoryId]) continue
    const card = cardForPayment(cash, cards)
    if (!card) continue
    issues.push({
      kind: 'pay',
      txn: cash,
      payCategoryId: payCatByAccount[card.id],
      cardAccountId: card.id,
    })
  }

  return issues.sort((a, b) => new Date((b.txn || b.card).date) - new Date((a.txn || a.card).date))
}
