/**
 * Parse a simple CSV with headers: date, amount, payee, memo (optional category, type).
 * Amount: positive = outflow unless type says inflow; negative = inflow.
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
  return String(h || '').trim().toLowerCase().replace(/\s+/g, '_')
}

function parseAmount(rawAmount, rawType) {
  const amount = Number(String(rawAmount || '').replace(/[$,]/g, ''))
  if (Number.isNaN(amount)) return { amount: 0, inflow: false }

  const type = String(rawType || '').trim().toLowerCase()
  if (type === 'inflow' || type === 'credit' || type === 'deposit') {
    return { amount: Math.abs(amount), inflow: true }
  }
  if (type === 'outflow' || type === 'debit' || type === 'payment') {
    return { amount: Math.abs(amount), inflow: false }
  }
  if (amount < 0) return { amount: Math.abs(amount), inflow: true }
  return { amount: Math.abs(amount), inflow: false }
}

/**
 * @returns {Array<{ date: string, amount: number, inflow: boolean, payee: string, memo: string, categoryName: string|null }>}
 */
export function parseCsvTransactions(csvText) {
  const lines = String(csvText || '')
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)
  const idx = {
    date: headers.indexOf('date'),
    amount: headers.indexOf('amount'),
    payee: headers.indexOf('payee'),
    memo: headers.indexOf('memo'),
    category: headers.indexOf('category'),
    type: headers.indexOf('type'),
  }

  if (idx.date < 0 || idx.amount < 0 || idx.payee < 0) {
    throw new Error('CSV must include date, amount, and payee columns')
  }

  const rows = []
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i])
    if (cols.every((c) => !c)) continue

    const { amount, inflow } = parseAmount(
      cols[idx.amount],
      idx.type >= 0 ? cols[idx.type] : ''
    )
    if (amount === 0) continue

    const dateRaw = cols[idx.date] || ''
    const date = normalizeDate(dateRaw)
    if (!date) continue

    rows.push({
      date,
      amount,
      inflow,
      payee: cols[idx.payee] || 'Unknown',
      memo: idx.memo >= 0 ? cols[idx.memo] || '' : '',
      categoryName: idx.category >= 0 ? cols[idx.category]?.trim() || null : null,
    })
  }
  return rows
}

function normalizeDate(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}
