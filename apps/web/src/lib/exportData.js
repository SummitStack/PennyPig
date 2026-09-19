/** Browser download helpers for CSV / JSON exports. */

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function downloadText(filename, text, mime = 'text/plain') {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }))
}

export function downloadJson(filename, data) {
  downloadText(filename, JSON.stringify(data, null, 2), 'application/json')
}

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => csvEscape(c.label)).join(',')
  const lines = rows.map((row) =>
    columns.map((c) => csvEscape(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(',')
  )
  return [header, ...lines].join('\n')
}

export function downloadCsv(filename, rows, columns) {
  downloadText(filename, toCsv(rows, columns), 'text/csv')
}

function txnDateString(txn) {
  if (txn.date instanceof Date) {
    return `${txn.date.getFullYear()}-${String(txn.date.getMonth() + 1).padStart(2, '0')}-${String(txn.date.getDate()).padStart(2, '0')}`
  }
  return String(txn.date || '').slice(0, 10)
}

export function exportTransactionsCsv(transactions, filename = 'pennypig-transactions.csv') {
  downloadCsv(
    filename,
    transactions,
    [
      { label: 'Date', value: (t) => txnDateString(t) },
      { label: 'Payee', value: (t) => t.payee || t.merchant || '' },
      { label: 'Account', key: 'account' },
      { label: 'Category', key: 'category' },
      { label: 'Memo', key: 'memo' },
      { label: 'Amount', value: (t) => Number(t.amount) || 0 },
      { label: 'Cleared', value: (t) => (t.cleared ? 'yes' : 'no') },
      { label: 'Status', key: 'status' },
    ]
  )
}

export function exportBudgetCsv(rows, month, filename) {
  downloadCsv(filename || `pennypig-budget-${month}.csv`, rows, [
    { label: 'Category', key: 'name' },
    { label: 'Assigned', key: 'assigned' },
    { label: 'Activity', key: 'activity' },
    { label: 'Available', key: 'available' },
  ])
}

export function exportReportSummaryCsv(summary, filename = 'pennypig-report-summary.csv') {
  downloadCsv(filename, summary, [
    { label: 'Section', key: 'section' },
    { label: 'Label', key: 'label' },
    { label: 'Amount', key: 'amount' },
  ])
}
