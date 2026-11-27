import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactionStore } from '../store/transactionStore'
import { useAccountStore } from '../store/accountStore'
import { useBudgetStore } from '../store/budgetStore'
import MainLayout from '../components/Layout/MainLayout'
import TransactionList from '../components/Transactions/TransactionList'
import Icon from '../components/ui/Icon'
import { getLeafCategories } from '../lib/categories'
import { leafExpenseOptgroups } from '../lib/categorySuggest'
import { todayLocal } from '../lib/money'
import { linkedPlaidAccounts, syncAllLinked } from '../lib/plaidSyncClient'
import { FREQUENCIES, advanceDate } from '../lib/recurring'
import { useRecurringStore } from '../store/recurringStore'
import RecurringPanel, { formatShortDate } from '../components/Transactions/RecurringPanel'

function Field({ id, label, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
    </div>
  )
}

function FormShell({ title, onSubmit, onCancel, error, saving, submitLabel, disabled, notice, children }) {
  return (
    <form onSubmit={onSubmit} className="card animate-pop-in p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-headline-sm text-on-surface">{title}</h2>
        <button type="button" onClick={onCancel} className="btn btn-ghost h-8 w-8 p-0" aria-label="Close">
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
      {notice && <p className="mb-3 text-body-sm text-on-surface-variant">{notice}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">{children}</div>
      {error && <p className="mt-3 text-body-sm text-status-error">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving || disabled} className="btn btn-primary">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function AddTransactionForm({ accounts, categories, onSubmit, onCancel, canRepeat }) {
  const [date, setDate] = useState(todayLocal())
  const [payee, setPayee] = useState('')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [categoryId, setCategoryId] = useState('')
  const [memo, setMemo] = useState('')
  const [inflow, setInflow] = useState(false)
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Only leaf categories can hold money; groups like "Living" are headings.
  const expenseGroups = leafExpenseOptgroups(categories)
  const incomeLeaves = getLeafCategories(categories, 'income')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await onSubmit({
      date,
      payee,
      amount,
      accountId,
      categoryId: categoryId || null,
      memo,
      inflow,
      repeat: repeat || null,
    })
    setSaving(false)
    if (!result?.success) setError(result?.error || 'Could not add transaction')
  }

  return (
    <FormShell
      title="Add transaction"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      error={error}
      saving={saving}
      submitLabel="Save transaction"
      disabled={accounts.length === 0}
      notice={accounts.length === 0 ? 'Add an account on the Accounts page first.' : null}
    >
      <div className="col-span-2 sm:col-span-6">
        <div className="inline-flex rounded-lg bg-surface-container p-0.5" role="radiogroup" aria-label="Type">
          {[
            [false, 'Money out'],
            [true, 'Money in'],
          ].map(([val, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={inflow === val}
              onClick={() => {
                setInflow(val)
                setCategoryId('')
              }}
              className={`rounded-md px-3 py-1.5 text-label-md font-semibold transition-colors ${
                inflow === val
                  ? 'bg-surface-base text-on-surface shadow-card'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <Field id="tx-payee" label="Payee" className="col-span-2 sm:col-span-3">
        <input
          id="tx-payee"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
          placeholder="Who was it?"
          className="field"
          required
        />
      </Field>
      <Field id="tx-amount" label="Amount" className="col-span-1 sm:col-span-1">
        <input
          id="tx-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="field num"
          placeholder="0.00"
          required
        />
      </Field>
      <Field id="tx-date" label="Date" className="col-span-1 sm:col-span-2">
        <input
          id="tx-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field"
          required
        />
      </Field>
      <Field id="tx-category" label="Category" className="col-span-2 sm:col-span-3">
        <select
          id="tx-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="field"
        >
          <option value="">Uncategorized</option>
          {inflow
            ? incomeLeaves.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji ? `${cat.emoji} ` : ''}
                  {cat.name}
                </option>
              ))
            : expenseGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji ? `${cat.emoji} ` : ''}
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              ))}
        </select>
      </Field>
      <Field id="tx-account" label="Account" className="col-span-2 sm:col-span-3">
        <select
          id="tx-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="field"
          required
          disabled={accounts.length === 0}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="tx-memo" label="Memo (optional)" className={`col-span-2 ${canRepeat ? 'sm:col-span-4' : 'sm:col-span-6'}`}>
        <input id="tx-memo" value={memo} onChange={(e) => setMemo(e.target.value)} className="field" />
      </Field>
      {canRepeat && (
        <Field id="tx-repeat" label="Repeat" className="col-span-2 sm:col-span-2">
          <select id="tx-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)} className="field">
            <option value="">Doesn't repeat</option>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
      )}
    </FormShell>
  )
}

function TransferForm({ accounts, onSubmit, onCancel }) {
  const [date, setDate] = useState(todayLocal())
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await onSubmit({ date, fromAccountId, toAccountId, amount, memo })
    setSaving(false)
    if (!result?.success) setError(result?.error || 'Could not create transfer')
  }

  return (
    <FormShell
      title="Transfer between accounts"
      onSubmit={handleSubmit}
      onCancel={onCancel}
      error={error}
      saving={saving}
      submitLabel="Save transfer"
      disabled={accounts.length < 2}
      notice={accounts.length < 2 ? 'You need at least two accounts to record a transfer.' : null}
    >
      <Field id="tr-from" label="From" className="col-span-2 sm:col-span-3">
        <select
          id="tr-from"
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
          className="field"
          required
          disabled={accounts.length < 2}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="tr-to" label="To" className="col-span-2 sm:col-span-3">
        <select
          id="tr-to"
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          className="field"
          required
          disabled={accounts.length < 2}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="tr-amount" label="Amount" className="col-span-1 sm:col-span-2">
        <input
          id="tr-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="field num"
          placeholder="0.00"
          required
        />
      </Field>
      <Field id="tr-date" label="Date" className="col-span-1 sm:col-span-2">
        <input
          id="tr-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field"
          required
        />
      </Field>
      <Field id="tr-memo" label="Memo (optional)" className="col-span-2 sm:col-span-2">
        <input id="tr-memo" value={memo} onChange={(e) => setMemo(e.target.value)} className="field" />
      </Field>
    </FormShell>
  )
}

export default function TransactionsPage() {
  const navigate = useNavigate()
  const filter = useTransactionStore((state) => state.filter)
  const setFilter = useTransactionStore((state) => state.setFilter)
  const allAccounts = useTransactionStore((state) => state.accounts)
  // Closed accounts keep their history but drop out of pickers and filters.
  const accounts = useMemo(() => allAccounts.filter((a) => !a.closed), [allAccounts])
  const categories = useTransactionStore((state) => state.categories)
  const transactions = useTransactionStore((state) => state.transactions)
  const loadData = useTransactionStore((state) => state.loadData)
  const hydrated = useTransactionStore((state) => state.hydrated)
  const createTransaction = useTransactionStore((state) => state.createTransaction)
  const createRecurring = useRecurringStore((state) => state.create)
  const recurringAvailable = useRecurringStore((state) => state.available)
  const createTransfer = useTransactionStore((state) => state.createTransfer)
  const getUncategorizedTransactions = useTransactionStore(
    (state) => state.getUncategorizedTransactions
  )

  const linkedAccounts = useAccountStore((state) => state.linkedAccounts)
  const loadAccounts = useAccountStore((state) => state.loadAccounts)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)

  const [syncLoading, setSyncLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (!hydrated) loadData()
  }, [hydrated, loadData])

  useEffect(() => {
    loadBudgets()
  }, [loadBudgets])

  // Messages used to stay on screen forever.
  useEffect(() => {
    if (!flash) return undefined
    const t = setTimeout(() => setFlash(null), 4000)
    return () => clearTimeout(t)
  }, [flash])

  const expenseGroups = leafExpenseOptgroups(categories)
  const incomeLeaves = getLeafCategories(categories, 'income')
  const hasLinked = linkedPlaidAccounts(linkedAccounts).length > 0

  const uncategorizedCount = useMemo(
    () => getUncategorizedTransactions().length,
    [transactions, getUncategorizedTransactions]
  )

  const handleSync = async () => {
    setSyncLoading(true)
    setFlash(null)
    try {
      const result = await syncAllLinked(linkedAccounts)
      await Promise.all([loadAccounts(), loadData(), loadBudgets()])
      setFlash({
        tone: result.errors.length ? 'error' : 'ok',
        text: result.errors.length
          ? `Some banks didn't sync. ${result.errors.join(' ')}`
          : `Imported ${result.synced} new transaction${result.synced === 1 ? '' : 's'}.`,
      })
    } finally {
      setSyncLoading(false)
    }
  }

  const handleAdd = async ({ repeat, ...values }) => {
    const result = await createTransaction(values)
    if (result.success) {
      setShowAdd(false)
      let text = 'Transaction added.'
      if (repeat) {
        const rec = await createRecurring({
          ...values,
          frequency: repeat,
          nextDate: advanceDate(values.date, repeat),
        })
        text = rec.success
          ? `Transaction added. Next one is due ${formatShortDate(rec.item.nextDate)}.`
          : `Transaction added, but it couldn't be set to repeat: ${rec.error}`
      }
      setFlash({ tone: 'ok', text })
      await loadBudgets()
    }
    return result
  }

  const handleTransfer = async (values) => {
    const result = await createTransfer(values)
    if (result.success) {
      setShowTransfer(false)
      setFlash({ tone: 'ok', text: 'Transfer recorded.' })
      await loadBudgets()
    }
    return result
  }

  const anyFilter = filter.search || filter.category || filter.uncategorizedOnly || filter.accountId

  return (
    <MainLayout>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Activity</p>
            <h1 className="mt-1 font-display text-headline-lg text-on-surface">Transactions</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowAdd(false)
                setShowTransfer((v) => !v)
              }}
            >
              <Icon name="swap_horiz" className="text-[18px]" />
              Transfer
            </button>
            {hasLinked ? (
              <button type="button" className="btn btn-secondary" onClick={handleSync} disabled={syncLoading}>
                <Icon name="sync" className={`text-[18px] ${syncLoading ? 'animate-spin' : ''}`} />
                {syncLoading ? 'Importing…' : 'Sync banks'}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/accounts')}>
                <Icon name="upload_file" className="text-[18px]" />
                Import
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowTransfer(false)
                setShowAdd((v) => !v)
              }}
            >
              <Icon name="add" className="text-[18px]" />
              Add
            </button>
          </div>
        </div>

        {showAdd && (
          <AddTransactionForm
            accounts={accounts}
            categories={categories}
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
            canRepeat={recurringAvailable}
          />
        )}

        <RecurringPanel />

        {showTransfer && (
          <TransferForm
            accounts={accounts}
            onSubmit={handleTransfer}
            onCancel={() => setShowTransfer(false)}
          />
        )}

        {flash && (
          <div
            role="status"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-body-sm ${
              flash.tone === 'error'
                ? 'bg-status-error/10 text-status-error'
                : 'bg-primary/10 text-primary'
            }`}
          >
            <Icon name={flash.tone === 'error' ? 'error' : 'check_circle'} className="text-[18px]" />
            {flash.text}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex flex-1 items-center">
            <Icon name="search" className="pointer-events-none absolute left-3 text-[18px] text-on-surface-variant" />
            <input
              type="search"
              aria-label="Search transactions"
              placeholder="Search payee or memo"
              value={filter.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              className="field pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select
              aria-label="Filter by category"
              value={filter.category || ''}
              onChange={(e) => setFilter({ category: e.target.value || null })}
              className="field sm:w-48"
            >
              <option value="">All categories</option>
              {expenseGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.emoji ? `${cat.emoji} ` : ''}
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              {incomeLeaves.length > 0 && (
                <optgroup label="Income">
                  {incomeLeaves.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.emoji ? `${cat.emoji} ` : ''}
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <select
              aria-label="Filter by account"
              value={filter.accountId || ''}
              onChange={(e) => setFilter({ accountId: e.target.value || null })}
              className="field sm:w-44"
            >
              <option value="">All accounts</option>
              {allAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}{acc.closed ? " (closed)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(uncategorizedCount > 0 || anyFilter) && (
          <div className="flex flex-wrap items-center gap-2">
            {uncategorizedCount > 0 && !filter.uncategorizedOnly && (
              <button
                type="button"
                onClick={() => setFilter({ uncategorizedOnly: true })}
                className="chip bg-status-warning/15 px-3 py-1 text-status-warning hover:bg-status-warning/25"
              >
                <Icon name="label_off" className="text-[14px]" />
                {uncategorizedCount} {uncategorizedCount === 1 ? 'needs' : 'need'} a category
              </button>
            )}
            {filter.uncategorizedOnly && (
              <span className="chip bg-surface-container-high px-3 py-1 text-on-surface">
                Uncategorized only
                <button
                  type="button"
                  onClick={() => setFilter({ uncategorizedOnly: false })}
                  aria-label="Clear uncategorized filter"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              </span>
            )}
            {anyFilter && (
              <button
                type="button"
                onClick={() =>
                  setFilter({ search: '', category: null, uncategorizedOnly: false, accountId: null })
                }
                className="btn btn-ghost btn-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        <div className="card overflow-hidden">
          <TransactionList />
        </div>

        <p className="text-label-md text-on-surface-variant">
          Tip: tap a payee to rename it. Future imports from the same merchant keep your name.
        </p>
      </div>
    </MainLayout>
  )
}
