import { useState } from 'react'
import { useAccountStore } from '../../store/accountStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { parseCsvTransactions } from '../../lib/csvImport'
import Icon from '../ui/Icon'

export default function CsvImportSection() {
  const accounts = useAccountStore((state) => state.linkedAccounts)
  const createTransaction = useTransactionStore((state) => state.createTransaction)
  const categories = useTransactionStore((state) => state.categories)
  const loadData = useTransactionStore((state) => state.loadData)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)

  const [accountId, setAccountId] = useState('')
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const categoryByName = Object.fromEntries(
    categories.map((c) => [c.name.toLowerCase(), c.id])
  )

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!accountId) {
      setError('Select an account first')
      return
    }

    setImporting(true)
    setError(null)
    setMessage(null)

    try {
      const text = await file.text()
      const rows = parseCsvTransactions(text)
      if (rows.length === 0) {
        setError('No valid rows found in CSV')
        return
      }

      let created = 0
      for (const row of rows) {
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
      setMessage(`Imported ${created} of ${rows.length} transactions`)
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border-hairline bg-surface-base p-space-lg shadow-sm">
      <div className="mb-space-md flex items-center gap-space-sm">
        <Icon name="upload_file" className="text-[20px] text-cool-blue" />
        <h2 className="text-headline-sm font-bold text-on-surface">CSV Import</h2>
      </div>
      <p className="mb-space-md text-body-sm text-on-surface-variant">
        Upload a CSV with columns: date, amount, payee, memo (optional category, type).
      </p>

      <div className="flex flex-col gap-space-md sm:flex-row sm:items-end">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-label-sm text-on-surface-variant">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full rounded-lg border border-border-hairline bg-surface px-space-md py-space-sm text-on-surface"
          >
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <label
          className={`inline-flex cursor-pointer items-center justify-center gap-space-sm rounded-lg border border-cool-blue/40 bg-cool-blue/10 px-space-md py-space-sm text-body-sm font-medium text-cool-blue hover:bg-cool-blue/20 ${
            importing || !accountId ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <Icon name="upload" className="text-[16px]" />
          {importing ? 'Importing…' : 'Choose CSV file'}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={importing || !accountId}
            onChange={handleFile}
          />
        </label>
      </div>

      {message && <p className="mt-space-md text-body-sm text-sage-accent">{message}</p>}
      {error && <p className="mt-space-md text-body-sm text-status-error">{error}</p>}
    </div>
  )
}
