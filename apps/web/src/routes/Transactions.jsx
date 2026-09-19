import { useEffect, useState } from 'react'
import { useTransactionStore } from '../store/transactionStore'
import { useAccountStore } from '../store/accountStore'
import { useBudgetStore } from '../store/budgetStore'
import MainLayout from '../components/Layout/MainLayout'
import TransactionList from '../components/Transactions/TransactionList'
import { authFetch } from '../lib/authFetch'
import Icon from '../components/ui/Icon'
import { buildCategoryTree, getLeafCategories } from '../lib/categories'

function AddTransactionForm({ accounts, categories, onSubmit, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [payee, setPayee] = useState('')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [categoryId, setCategoryId] = useState('')
  const [memo, setMemo] = useState('')
  const [inflow, setInflow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const expenseTree = buildCategoryTree(categories, 'expense')
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
    })
    setSaving(false)
    if (!result?.success) {
      setError(result?.error || 'Could not add transaction')
      return
    }
  }

  const field =
    'rounded border border-border-hairline bg-surface px-2 py-1 text-body-sm text-on-surface outline-none focus:border-cool-blue'

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-2 space-y-2 rounded-lg border border-border-hairline bg-surface-container p-space-md"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-0.5 block text-label-sm text-on-surface-variant">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={field}
            required
          />
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="mb-0.5 block text-label-sm text-on-surface-variant">Payee</label>
          <input
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="Payee"
            className={`${field} w-full`}
            required
          />
        </div>
        <div>
          <label className="mb-0.5 block text-label-sm text-on-surface-variant">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${field} w-24`}
            required
          />
        </div>
        <div>
          <label className="mb-0.5 block text-label-sm text-on-surface-variant">Type</label>
          <select
            value={inflow ? 'in' : 'out'}
            onChange={(e) => setInflow(e.target.value === 'in')}
            className={field}
          >
            <option value="out">Outflow</option>
            <option value="in">Inflow</option>
          </select>
        </div>
        <div className="min-w-[8rem]">
          <label className="mb-0.5 block text-label-sm text-on-surface-variant">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={`${field} w-full`}
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="mb-0.5 block text-label-sm text-on-surface-variant">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={`${field} w-full`}
          >
            <option value="">Uncategorized</option>
            {(inflow ? incomeLeaves : expenseTree.flatMap((r) => (r.children.length ? r.children : [r]))).map(
              (cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              )
            )}
          </select>
        </div>
        <div className="min-w-[6rem] flex-1">
          <label className="mb-0.5 block text-label-sm text-on-surface-variant">Memo</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className={`${field} w-full`}
          />
        </div>
      </div>
      {error && <p className="text-label-md text-status-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || accounts.length === 0}
          className="rounded-lg bg-primary px-3 py-1 text-label-md font-semibold text-on-primary disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save transaction'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border-hairline px-3 py-1 text-label-md text-on-surface-variant"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function TransactionsPage() {
  const filter = useTransactionStore((state) => state.filter)
  const setFilter = useTransactionStore((state) => state.setFilter)
  const accounts = useTransactionStore((state) => state.accounts)
  const categories = useTransactionStore((state) => state.categories)
  const loadData = useTransactionStore((state) => state.loadData)
  const hydrated = useTransactionStore((state) => state.hydrated)
  const createTransaction = useTransactionStore((state) => state.createTransaction)
  const selectedIds = useTransactionStore((state) => state.selectedIds)
  const clearSelection = useTransactionStore((state) => state.clearSelection)

  const linkedAccounts = useAccountStore((state) => state.linkedAccounts)
  const loadAccounts = useAccountStore((state) => state.loadAccounts)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)

  const [syncLoading, setSyncLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (!hydrated) loadData()
  }, [hydrated, loadData])

  const expenseTree = buildCategoryTree(categories, 'expense')
  const incomeLeaves = getLeafCategories(categories, 'income')

  const handleSync = async () => {
    setSyncLoading(true)
    setFlash(null)
    try {
      if (linkedAccounts.length === 0) {
        throw new Error('Connect a bank account first')
      }
      for (const account of linkedAccounts) {
        const response = await authFetch('/api/plaid/sync', {
          method: 'POST',
          body: JSON.stringify({ account_id: account.id }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Sync failed')
      }
      await Promise.all([loadAccounts(), loadData(), loadBudgets()])
      setFlash('Bank import complete')
    } catch (err) {
      setFlash(err.message || 'Sync failed')
    } finally {
      setSyncLoading(false)
    }
  }

  const handleAdd = async (values) => {
    const result = await createTransaction(values)
    if (result.success) {
      setShowAdd(false)
      setFlash('Transaction added')
      await loadBudgets()
    }
    return result
  }

  const toolbarBtn =
    'inline-flex items-center gap-1 rounded px-2 py-1 text-label-md font-semibold text-cool-blue transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <MainLayout>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-0.5">
            <button
              type="button"
              className={toolbarBtn}
              onClick={() => setShowAdd((v) => !v)}
            >
              <Icon name="add" className="text-[16px]" />
              Add Transaction
            </button>
            <button
              type="button"
              className={toolbarBtn}
              onClick={handleSync}
              disabled={syncLoading}
            >
              <Icon
                name="cloud_download"
                className={`text-[16px] ${syncLoading ? 'animate-pulse' : ''}`}
              />
              {syncLoading ? 'Importing…' : 'Bank Import'}
            </button>
            <button
              type="button"
              className={toolbarBtn}
              disabled
              title="Coming soon"
            >
              <Icon name="draft" className="text-[16px]" />
              File Import
            </button>
            <button
              type="button"
              className={toolbarBtn}
              disabled={selectedIds.length === 0}
              onClick={() => clearSelection()}
              title={
                selectedIds.length
                  ? `${selectedIds.length} selected — clear selection`
                  : 'Select rows to edit'
              }
            >
              <Icon name="edit" className="text-[16px]" />
              Edit
            </button>
            <button type="button" className={toolbarBtn} disabled title="Coming soon">
              <Icon name="more_horiz" className="text-[16px]" />
              More
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex min-w-[14rem] items-center gap-1 rounded-full border border-border-hairline bg-surface-base px-3 py-1">
              <Icon name="search" className="text-[16px] text-on-surface-variant" />
              <input
                type="search"
                placeholder="Search payee, memo…"
                value={filter.search}
                onChange={(e) => setFilter({ search: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant"
              />
              {filter.category && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2 py-0.5 text-label-sm text-on-surface">
                  Category: {filter.category}
                  <button
                    type="button"
                    onClick={() => setFilter({ category: null })}
                    aria-label="Clear category filter"
                    className="text-on-surface-variant hover:text-on-surface"
                  >
                    <Icon name="close" className="text-[12px]" />
                  </button>
                </span>
              )}
              {(filter.search || filter.category) && (
                <button
                  type="button"
                  onClick={() => setFilter({ search: '', category: null })}
                  aria-label="Clear search"
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              )}
            </div>
            <select
              value={filter.category || ''}
              onChange={(e) => setFilter({ category: e.target.value || null })}
              className="rounded-lg border border-border-hairline bg-surface-base px-2 py-1 text-label-md text-on-surface"
            >
              <option value="">All categories</option>
              {expenseTree.map((root) =>
                root.children.length > 0 ? (
                  <optgroup key={root.id} label={`${root.emoji} ${root.name}`}>
                    {root.children.map((child) => (
                      <option key={child.id} value={child.name}>
                        {child.emoji} {child.name}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={root.id} value={root.name}>
                    {root.emoji} {root.name}
                  </option>
                )
              )}
              {incomeLeaves.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
            <select
              value={filter.accountId || ''}
              onChange={(e) => setFilter({ accountId: e.target.value || null })}
              className="rounded-lg border border-border-hairline bg-surface-base px-2 py-1 text-label-md text-on-surface"
            >
              <option value="">All accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {flash && (
          <p className="text-label-md text-sage-accent">{flash}</p>
        )}

        {showAdd && (
          <AddTransactionForm
            accounts={accounts}
            categories={categories}
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}

        <div className="overflow-hidden rounded-xl border border-border-hairline bg-surface-base shadow-sm">
          <TransactionList />
        </div>

        <p className="text-label-sm text-on-surface-variant">
          Tip: click a payee to rename it (e.g. “Exxon Mobil”). Matching bank merchants
          keep that name on future imports.
        </p>
      </div>
    </MainLayout>
  )
}
