import { useMemo, useState } from 'react'
import { useAccountStore } from '../../store/accountStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { applySignConvention, dedupeKey, parseCsvTransactions } from '../../lib/csvImport'
import { money, todayLocal } from '../../lib/money'
import Icon from '../ui/Icon'

function dateKey(d) {
  return d instanceof Date ? todayLocal(d) : String(d || '').slice(0, 10)
}

export default function CsvImportSection() {
  const allAccounts = useAccountStore((state) => state.linkedAccounts)
  const accounts = useMemo(() => allAccounts.filter((a) => !a.closed), [allAccounts])
  const createTransaction = useTransactionStore((state) => state.createTransaction)
  const categories = useTransactionStore((state) => state.categories)
  const transactions = useTransactionStore((state) => state.transactions)
  const loadData = useTransactionStore((state) => state.loadData)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)

  const [accountId, setAccountId] = useState('')
  const [parsed, setParsed] = useState(null) // { fileName, rows, negativeIsOutflow, signKnown }
  const [negativeIsOutflow, setNegativeIsOutflow] = useState(true)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const categoryByName = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name.toLowerCase(), c.id])),
    [categories]
  )

  // Rows already in this account are skipped so re-importing a file is safe.
  const existingKeys = useMemo(() => {
    const keys = new Set()
    for (const t of transactions) {
      if (t.accountId !== accountId) continue
      const d = dateKey(t.date)
      keys.add(dedupeKey(d, t.amount, t.merchant))
      keys.add(dedupeKey(d, t.amount, t.payee))
    }
    return keys
  }, [transactions, accountId])

  const preview = useMemo(() => {
    if (!parsed) return null
    const rows = applySignConvention(parsed.rows, negativeIsOutflow)
    let out = 0
    let inn = 0
    let dupes = 0
    const fresh = []
    for (const r of rows) {
      const signed = r.inflow ? -r.amount : r.amount
      if (existingKeys.has(dedupeKey(r.date, signed, r.payee))) {
        dupes += 1
        continue
      }
      fresh.push(r)
      if (r.inflow) inn += r.amount
      else out += r.amount
    }
    const dates = rows.map((r) => r.date).sort()
    return { fresh, dupes, out, inn, first: dates[0], last: dates[dates.length - 1] }
  }, [parsed, negativeIsOutflow, existingKeys])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setMessage(null)
    setParsed(null)
    try {
      const text = await file.text()
      const result = parseCsvTransactions(text)
      if (result.rows.length === 0) {
        setError('No transactions found in that file.')
        return
      }
      setNegativeIsOutflow(result.negativeIsOutflow)
      setParsed({ fileName: file.name, ...result })
    } catch (err) {
      setError(err.message || 'Could not read that file.')
    }
  }

  const handleImport = async () => {
    if (!preview || !accountId) return
    setImporting(true)
    setError(null)
    try {
      let created = 0
      for (const row of preview.fresh) {
        const categoryId = row.categoryName
          ? categoryByName[row.categoryName.toLowerCase()] || null
          : null
        const result = await createTransaction({
          date: row.date,
          payee: row.payee,
          amount: row.amount,
          inflow: row.inflow,
          memo: row.memo,
          categoryId,
          accountId,
        })
        if (result.success) created += 1
      }
      await Promise.all([loadData(), loadBudgets()])
      setMessage(
        `Imported ${created} transaction${created === 1 ? '' : 's'}` +
          (preview.dupes ? `, skipped ${preview.dupes} already in this account.` : '.')
      )
      setParsed(null)
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="card p-5 sm:p-6" id="csv-import">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cool-blue/10 text-cool-blue">
          <Icon name="upload_file" className="text-[20px]" />
        </span>
        <div>
          <h2 className="font-display text-headline-sm text-on-surface">Import a CSV</h2>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Works with most bank exports (Date, Description, Amount or Debit/Credit). You'll see a
            preview before anything is added.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="csv-account" className="field-label">
            Import into
          </label>
          <select
            id="csv-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="field"
          >
            <option value="">Choose an account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <label
          className={`btn btn-secondary py-2.5 ${!accountId || importing ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Icon name="folder_open" className="text-[18px]" />
          Choose file
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            disabled={!accountId || importing}
            onChange={handleFile}
            data-testid="csv-input"
          />
        </label>
      </div>

      {preview && (
        <div className="mt-4 animate-pop-in rounded-xl border border-border-hairline bg-surface-container-low p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-body-sm font-semibold text-on-surface">{parsed.fileName}</p>
            <p className="text-label-md text-on-surface-variant">
              {preview.first === preview.last ? preview.first : `${preview.first} to ${preview.last}`}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-base p-2">
              <div className="num text-headline-sm text-on-surface">{preview.fresh.length}</div>
              <div className="text-label-sm text-on-surface-variant">new</div>
            </div>
            <div className="rounded-lg bg-surface-base p-2">
              <div className="num text-headline-sm text-on-surface">{money(preview.out)}</div>
              <div className="text-label-sm text-on-surface-variant">money out</div>
            </div>
            <div className="rounded-lg bg-surface-base p-2">
              <div className="num text-headline-sm text-primary">{money(preview.inn)}</div>
              <div className="text-label-sm text-on-surface-variant">money in</div>
            </div>
          </div>
          {preview.dupes > 0 && (
            <p className="mt-2 text-label-md text-on-surface-variant">
              {preview.dupes} row{preview.dupes === 1 ? ' is' : 's are'} already in this account and will be
              skipped.
            </p>
          )}
          {!parsed.signKnown && (
            <label className="mt-3 flex items-center gap-2 text-body-sm text-on-surface">
              <input
                type="checkbox"
                checked={!negativeIsOutflow}
                onChange={(e) => setNegativeIsOutflow(!e.target.checked)}
              />
              Positive amounts are money out (flip signs)
            </label>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setParsed(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={importing || preview.fresh.length === 0}
              onClick={handleImport}
            >
              {importing ? 'Importing…' : `Import ${preview.fresh.length}`}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-body-sm text-primary">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-status-error/10 px-3 py-2 text-body-sm text-status-error">
          {error}
        </p>
      )}
    </section>
  )
}
