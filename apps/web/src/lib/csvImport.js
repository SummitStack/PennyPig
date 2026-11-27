/**
 * Bank CSV import.
 *
 * Accepts the app's own template (date, amount, payee, memo, category, type)
 * and common bank exports: "Transaction Date"/"Posting Date", "Description",
 * a single signed "Amount", or separate "Debit"/"Credit" columns.
 *
 * Banks disagree on the sign of Amount. Most write money out as negative; the
 * app stores money out as positive. parseCsvTransactions returns raw signed
 * amounts and a guess; applySignConvention turns them into
 * { amount, inflow } once the user has confirmed which way the file goes.
 */

function parseCsvLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields.map((f) => f.trim())
}

function normalizeHeader(h) {
  return String(h || '')
    .replace(/^﻿/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const HEADER_ALIASES = {
  date: ['date', 'transaction_date', 'trans_date', 'posting_date', 'posted_date', 'post_date'],
  payee: ['payee', 'description', 'merchant', 'name', 'payee_name', 'original_description'],
  amount: ['amount', 'transaction_amount', 'amount_usd'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'money_out', 'outflow'],
  credit: ['credit', 'deposit', 'deposits', 'money_in', 'inflow'],
  memo: ['memo', 'notes', 'note'],
  category: ['category'],
  // Chase checking puts DEBIT/CREDIT in "Details" and DEBIT_CARD/ACH_CREDIT in "Type".
  type: ['details', 'type', 'transaction_type'],
}

function findColumn(headers, key) {
  for (const alias of HEADER_ALIASES[key]) {
    const i = headers.indexOf(alias)
    if (i >= 0) return i
  }
  return -1
}

function toNumber(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  // "(12.34)" is accounting notation for -12.34
  const negParen = /^\(.*\)$/.test(s)
  const n = Number(s.replace(/[()$,\s]/g, ''))
  if (Number.isNaN(n)) return null
  return negParen ? -Math.abs(n) : n
}

function typeHint(raw) {
  const t = String(raw || '').trim().toLowerCase()
  if (['inflow', 'credit', 'deposit', 'ach_credit'].includes(t)) return 'in'
  if (['outflow', 'debit', 'withdrawal', 'ach_debit', 'debit_card'].includes(t)) return 'out'
  return null
}

/** Local YYYY-MM-DD. Handles ISO, MM/DD/YYYY, MM/DD/YY and M-D-YYYY. */
export function normalizeDate(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/**
 * @returns {{
 *   rows: Array<{ date: string, raw: number, hint: 'in'|'out'|null, payee: string, memo: string, categoryName: string|null }>,
 *   negativeIsOutflow: boolean,
 *   signKnown: boolean,
 * }}
 */
export function parseCsvTransactions(csvText) {
  const lines = String(csvText || '')
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], negativeIsOutflow: true, signKnown: false }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)
  const idx = Object.fromEntries(Object.keys(HEADER_ALIASES).map((k) => [k, findColumn(headers, k)]))
  const split = idx.amount < 0 && (idx.debit >= 0 || idx.credit >= 0)

  if (idx.date < 0 || idx.payee < 0 || (idx.amount < 0 && !split)) {
    throw new Error(
      'Could not find date, description and amount columns. Expected headers like Date, Description and Amount (or Debit and Credit).'
    )
  }

  const rows = []
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i])
    if (cols.every((c) => !c)) continue
    const date = normalizeDate(cols[idx.date])
    if (!date) continue

    let raw
    let hint = idx.type >= 0 ? typeHint(cols[idx.type]) : null
    if (split) {
      const out = idx.debit >= 0 ? toNumber(cols[idx.debit]) : null
      const inn = idx.credit >= 0 ? toNumber(cols[idx.credit]) : null
      if (out) {
        raw = -Math.abs(out)
        hint = 'out'
      } else if (inn) {
        raw = Math.abs(inn)
        hint = 'in'
      } else continue
    } else {
      raw = toNumber(cols[idx.amount])
    }
    if (!raw) continue

    rows.push({
      date,
      raw,
      hint,
      payee: cols[idx.payee] || 'Unknown',
      memo: idx.memo >= 0 ? cols[idx.memo] || '' : '',
      categoryName: idx.category >= 0 ? cols[idx.category]?.trim() || null : null,
    })
  }

  // Separate debit/credit columns or explicit types settle the sign. Otherwise
  // guess: in a bank export most rows are spending, so if most amounts are
  // negative, negative means money out.
  const signKnown = split || (rows.length > 0 && rows.every((r) => r.hint))
  const negatives = rows.filter((r) => r.raw < 0).length
  const negativeIsOutflow = split ? true : negatives >= rows.length / 2

  return { rows, negativeIsOutflow, signKnown }
}

/** Turn raw rows into the app's { amount (positive), inflow } shape. */
export function applySignConvention(rows, negativeIsOutflow) {
  return rows.map((r) => {
    let inflow
    if (r.hint) inflow = r.hint === 'in'
    else inflow = negativeIsOutflow ? r.raw > 0 : r.raw < 0
    return { ...r, amount: Math.abs(r.raw), inflow }
  })
}

/** Key used to skip rows already in the account (same date, amount and payee). */
export function dedupeKey(date, signedAmount, payee) {
  return `${date}|${Number(signedAmount).toFixed(2)}|${String(payee || '').trim().toLowerCase()}`
}
