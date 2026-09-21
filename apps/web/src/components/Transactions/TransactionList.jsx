import { useEffect, useMemo, useRef, useState } from 'react'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { getLeafCategories } from '../../lib/categories'
import { leafExpenseOptgroups, resolveToLeafCategoryId } from '../../lib/categorySuggest'
import { absAmount, formatMoney, isInflow } from '../../lib/money'
import Icon from '../ui/Icon'

function formatDate(d) {
  const date = new Date(d)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

const SORTABLE_COLUMNS = [
  { key: 'account', label: 'Account', align: 'left', className: 'w-28 px-2 py-1.5' },
  { key: 'date', label: 'Date', align: 'left', className: 'w-24 px-2 py-1.5' },
  { key: 'payee', label: 'Payee', align: 'left', className: 'min-w-[9rem] px-2 py-1.5' },
  { key: 'category', label: 'Category', align: 'left', className: 'w-36 px-2 py-1.5' },
  { key: 'memo', label: 'Memo', align: 'left', className: 'min-w-[5rem] px-2 py-1.5' },
  {
    key: 'outflow',
    label: 'Outflow',
    align: 'right',
    className: 'w-24 border-l border-border-hairline/80 px-2 py-1.5 text-right',
  },
  {
    key: 'inflow',
    label: 'Inflow',
    align: 'right',
    className: 'w-24 border-l border-border-hairline/50 px-2 py-1.5 text-right',
  },
  {
    key: 'available',
    label: 'Available',
    align: 'right',
    className: 'w-24 border-l border-border-hairline/50 px-2 py-1.5 text-right',
  },
  {
    key: 'balance',
    label: 'Balance',
    align: 'right',
    className: 'w-24 border-l border-border-hairline/50 px-2 py-1.5 text-right',
  },
  {
    key: 'cleared',
    label: 'Action',
    align: 'center',
    className: 'w-24 border-l border-border-hairline/80 px-2 py-1.5 text-center',
  },
]

function categorySortLabel(txn) {
  if (txn.transferAccountId) return 'Transfer'
  if (txn.isSplit) {
    return (txn.splits || [])
      .map((s) => s.category || 'Uncategorized')
      .join(', ')
      .toLowerCase()
  }
  return String(txn.category || 'Uncategorized').toLowerCase()
}

function sortValue(txn, key, { getAvailableFor, accountsById } = {}) {
  switch (key) {
    case 'account':
      return String(txn.account || '').toLowerCase()
    case 'date':
      return new Date(txn.date).getTime() || 0
    case 'payee':
      return String(txn.payee || txn.merchant || '').toLowerCase()
    case 'category':
      return categorySortLabel(txn)
    case 'memo':
      return String(txn.memo || '').toLowerCase()
    case 'outflow':
      return !isInflow(txn.amount) ? absAmount(txn.amount) : null
    case 'inflow':
      return isInflow(txn.amount) ? absAmount(txn.amount) : null
    case 'available': {
      if (txn.transferAccountId || txn.isSplit || !txn.categoryId) return null
      return getAvailableFor?.(txn.categoryId) ?? null
    }
    case 'balance': {
      const bal = accountsById?.[txn.accountId]?.balance
      return bal == null ? null : Number(bal)
    }
    case 'cleared':
      return txn.cleared === false ? 0 : 1
    default:
      return 0
  }
}

function compareSortValues(a, b, direction) {
  const dir = direction === 'asc' ? 1 : -1
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b) * dir
  }
  if (a < b) return -1 * dir
  if (a > b) return 1 * dir
  return 0
}

function SortableTh({ column, sortKey, sortDir, onSort }) {
  const active = sortKey === column.key
  const icon = !active ? 'unfold_more' : sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'
  const justify =
    column.align === 'right'
      ? 'justify-end'
      : column.align === 'center'
        ? 'justify-center'
        : 'justify-start'

  return (
    <th className={column.className} aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(column.key)}
        className={`inline-flex w-full items-center gap-0.5 ${justify} rounded px-0.5 py-0.5 text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant hover:bg-surface-container hover:text-on-surface`}
        title={`Sort by ${column.label}`}
      >
        <span>{column.label}</span>
        <Icon
          name={icon}
          className={`text-[14px] ${active ? 'text-cool-blue' : 'opacity-50'}`}
        />
      </button>
    </th>
  )
}

function CategorySelect({ value, categories, onChange, disabled = false }) {
  const expenseGroups = leafExpenseOptgroups(categories)
  const incomeLeaves = getLeafCategories(categories, 'income')
  const resolvedValue = resolveToLeafCategoryId(categories, value) || value || ''

  return (
    <select
      className="w-full max-w-[10rem] cursor-pointer truncate rounded border border-transparent bg-transparent py-0.5 text-body-sm text-on-surface hover:border-border-hairline focus:border-cool-blue focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      value={resolvedValue}
      onChange={(e) => onChange(e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
      disabled={disabled}
      title="Pick a subcategory (final budget category)"
    >
      <option value="">Uncategorized</option>
      {expenseGroups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.items.map((leaf) => (
            <option key={leaf.id} value={leaf.id}>
              {leaf.emoji ? `${leaf.emoji} ` : ''}
              {leaf.name}
            </option>
          ))}
        </optgroup>
      ))}
      {incomeLeaves.length > 0 && (
        <optgroup label="Income">
          {incomeLeaves.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.emoji ? `${cat.emoji} ` : ''}
              {cat.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}

function EditablePayee({ txn, displayPayee, onSave, readOnly = false }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(txn.payee)
  const inputRef = useRef(null)

  useEffect(() => {
    setValue(txn.payee)
  }, [txn.payee])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = async () => {
    setEditing(false)
    if (value.trim() && value.trim() !== txn.payee) {
      await onSave(txn.id, value.trim())
    } else {
      setValue(txn.payee)
    }
  }

  if (readOnly) {
    return (
      <span
        className="block w-full truncate px-1 py-0.5 text-body-sm font-medium text-on-surface"
        title={displayPayee}
      >
        {displayPayee}
      </span>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setValue(txn.payee)
            setEditing(false)
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded border border-cool-blue bg-surface px-1 py-0.5 text-body-sm text-on-surface outline-none"
        title={txn.merchant !== txn.payee ? `Bank: ${txn.merchant}` : undefined}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      className="w-full truncate rounded px-1 py-0.5 text-left text-body-sm font-medium text-on-surface hover:bg-surface-container"
      title={
        txn.merchant !== txn.payee
          ? `Bank name: ${txn.merchant} (click to rename)`
          : 'Click to rename payee'
      }
    >
      {displayPayee}
    </button>
  )
}

function EditableMemo({ txn, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(txn.memo || '')
  const inputRef = useRef(null)

  useEffect(() => {
    setValue(txn.memo || '')
  }, [txn.memo])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = async () => {
    setEditing(false)
    if ((value || '') !== (txn.memo || '')) {
      await onSave(txn.id, value)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setValue(txn.memo || '')
            setEditing(false)
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded border border-cool-blue bg-surface px-1 py-0.5 text-body-sm text-on-surface outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      className="w-full truncate rounded px-1 py-0.5 text-left text-body-sm text-on-surface-variant hover:bg-surface-container"
    >
      {txn.memo || <span className="opacity-40">—</span>}
    </button>
  )
}

function SplitEditor({ txn, categories, onSave, onClear, onClose }) {
  const targetTotal = absAmount(txn.amount)
  const [lines, setLines] = useState(() =>
    (txn.splits?.length ? txn.splits : [{ categoryId: '', amount: targetTotal, memo: '' }]).map(
      (s) => ({
        categoryId: s.categoryId || '',
        amount: String(s.amount ?? ''),
        memo: s.memo || '',
      })
    )
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const lineTotal = lines.reduce((sum, line) => sum + Math.abs(Number(line.amount) || 0), 0)
  const balanced = Math.abs(lineTotal - targetTotal) < 0.01

  const field =
    'rounded border border-border-hairline bg-surface px-1.5 py-0.5 text-body-sm text-on-surface outline-none focus:border-cool-blue'

  const addLine = () => {
    const remaining = Math.max(0, targetTotal - lineTotal)
    setLines((prev) => [
      ...prev,
      { categoryId: '', amount: remaining > 0 ? String(remaining) : '', memo: '' },
    ])
  }

  const updateLine = (index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!balanced) {
      setError(`Splits must total ${formatMoney(targetTotal)}`)
      return
    }
    setSaving(true)
    setError(null)
    const result = await onSave(
      txn.id,
      lines.map((line) => ({
        categoryId: line.categoryId || null,
        amount: Math.abs(Number(line.amount) || 0),
        memo: line.memo || '',
      }))
    )
    setSaving(false)
    if (!result?.success) {
      setError(result?.error || 'Could not save splits')
      return
    }
    onClose()
  }

  const handleClear = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setSaving(true)
    setError(null)
    const result = await onClear(txn.id)
    setSaving(false)
    if (!result?.success) {
      setError(result?.error || 'Could not clear splits')
      return
    }
    onClose()
  }

  return (
    <form
      onSubmit={handleSave}
      onClick={(e) => e.stopPropagation()}
      className="space-y-2 rounded-lg border border-border-hairline bg-surface-container p-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-sm font-semibold text-on-surface">Split transaction</span>
        <span className="text-label-sm tabular-nums text-on-surface-variant">
          {formatMoney(lineTotal)} / {formatMoney(targetTotal)}
        </span>
      </div>
      <div className="space-y-1">
        {lines.map((line, index) => (
          <div key={index} className="flex flex-wrap items-center gap-1">
            <CategorySelect
              value={line.categoryId}
              categories={categories}
              onChange={(id) => updateLine(index, { categoryId: id || '' })}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={line.amount}
              onChange={(e) => updateLine(index, { amount: e.target.value })}
              className={`${field} w-20 tabular-nums`}
              placeholder="0.00"
            />
            <input
              value={line.memo}
              onChange={(e) => updateLine(index, { memo: e.target.value })}
              placeholder="Memo"
              className={`${field} min-w-[6rem] flex-1`}
            />
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                aria-label="Remove split line"
              >
                <Icon name="close" className="text-[14px]" />
              </button>
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-label-sm text-status-error">{error}</p>}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={addLine}
          className="rounded px-2 py-0.5 text-label-sm text-cool-blue hover:bg-surface-container-high"
        >
          + Add line
        </button>
        <button
          type="submit"
          disabled={saving || !balanced}
          className="rounded bg-primary px-2 py-0.5 text-label-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {txn.isSplit && (
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="rounded border border-border-hairline px-2 py-0.5 text-label-sm text-on-surface-variant"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="rounded px-2 py-0.5 text-label-sm text-on-surface-variant hover:bg-surface-container-high"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function TransactionRow({
  txn,
  accountsById,
  categories,
  selected,
  splitOpen,
  categoryAvailable,
  accountBalance,
  onToggleSelected,
  onToggleSplit,
  onCategorize,
  onRenamePayee,
  onUpdateMemo,
  onToggleCleared,
  onSetSplits,
  onClearSplits,
  onDelete,
}) {
  const isTransfer = Boolean(txn.transferAccountId)
  const otherAccountName = isTransfer
    ? accountsById[txn.transferAccountId]?.name || 'Account'
    : null
  const displayPayee = isTransfer ? `Transfer: ${otherAccountName}` : txn.payee

  const outflow = !isInflow(txn.amount) ? absAmount(txn.amount) : null
  const inflowAmt = isInflow(txn.amount) ? absAmount(txn.amount) : null

  return (
    <>
      <tr
        className={`border-b border-border-hairline/70 transition-colors hover:bg-surface-container/60 ${
          selected ? 'bg-primary/10' : ''
        } ${!txn.cleared && !isTransfer ? 'bg-surface-container-low/40' : ''}`}
        onClick={() => onToggleSelected(txn.id)}
      >
        <td className="px-2 py-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(txn.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${displayPayee}`}
            className="accent-primary"
          />
        </td>
        <td
          className="max-w-[7rem] truncate px-2 py-1 text-body-sm font-medium text-on-surface"
          title={txn.account}
        >
          {txn.account || '…'}
        </td>
        <td className="whitespace-nowrap px-2 py-1 text-on-surface">
          {formatDate(txn.date)}
        </td>
        <td className="px-1 py-1">
          <EditablePayee
            txn={txn}
            displayPayee={displayPayee}
            onSave={onRenamePayee}
            readOnly={isTransfer}
          />
        </td>
        <td className="px-1 py-1">
          {isTransfer ? (
            <span className="px-1 text-body-sm text-on-surface-variant">Transfer</span>
          ) : txn.isSplit ? (
            <div className="flex min-w-0 items-center gap-1 px-1">
              <span className="shrink-0 rounded bg-surface-container-high px-1.5 py-0.5 text-label-sm font-semibold text-cool-blue">
                Split
              </span>
              <span className="truncate text-body-sm text-on-surface-variant">
                {(txn.splits || [])
                  .map((s) => s.category || 'Uncategorized')
                  .join(', ')}
              </span>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1">
              <span className="shrink-0 text-sm leading-none" aria-hidden>
                {txn.categoryEmoji || '💸'}
              </span>
              <CategorySelect
                value={txn.categoryId}
                categories={categories}
                onChange={(id) => onCategorize(txn.id, id)}
              />
            </div>
          )}
        </td>
        <td className="px-1 py-1">
          <EditableMemo txn={txn} onSave={onUpdateMemo} />
        </td>
        <td className="border-l border-border-hairline/80 bg-surface-container-lowest/30 px-2 py-1 text-right tabular-nums text-on-surface">
          {outflow != null ? formatMoney(outflow) : ''}
        </td>
        <td className="border-l border-border-hairline/50 bg-sage-accent/5 px-2 py-1 text-right tabular-nums text-sage-accent">
          {inflowAmt != null ? `+${formatMoney(inflowAmt)}` : ''}
        </td>
        <td
          className="border-l border-border-hairline/50 px-2 py-1 text-right tabular-nums text-on-surface"
          title="Left in category this month"
        >
          {categoryAvailable == null
            ? ''
            : `${categoryAvailable < 0 ? '-' : ''}${formatMoney(Math.abs(categoryAvailable))}`}
        </td>
        <td
          className="border-l border-border-hairline/50 px-2 py-1 text-right tabular-nums text-on-surface-variant"
          title="Account balance"
        >
          {accountBalance == null
            ? ''
            : `${accountBalance < 0 ? '-' : ''}${formatMoney(Math.abs(accountBalance))}`}
        </td>
        <td className="border-l border-border-hairline/80 px-2 py-1">
          <div className="flex items-center justify-center gap-0.5">
            {!isTransfer && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSplit(txn.id)
                }}
                className="rounded p-0.5 text-on-surface-variant hover:bg-surface-container-high hover:text-cool-blue"
                title={splitOpen ? 'Close split editor' : 'Split transaction'}
                aria-label="Split transaction"
              >
                <Icon name="call_split" className="text-[16px]" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleCleared(txn.id)
              }}
              className="inline-flex cursor-pointer items-center justify-center rounded p-0.5 text-status-success hover:bg-status-success/10"
              title={
                txn.cleared
                  ? 'Locked & cleared — on budget. Click to unlock (unclear).'
                  : 'Uncleared — not on budget yet. Click to clear and lock.'
              }
              aria-label={txn.cleared ? 'Unlock and unclear' : 'Clear and lock'}
            >
              {txn.cleared ? (
                <Icon name="lock" className="text-[18px]" filled />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-status-success text-[11px] font-bold text-status-success">
                  C
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(txn)
              }}
              className="rounded p-0.5 text-on-surface-variant hover:bg-status-error/10 hover:text-status-error"
              title="Delete transaction"
              aria-label="Delete transaction"
            >
              <Icon name="delete" className="text-[16px]" />
            </button>
          </div>
        </td>
      </tr>
      {splitOpen && !isTransfer && (
        <tr className="border-b border-border-hairline/70 bg-surface-container/40">
          <td colSpan={11} className="px-3 py-2">
            <SplitEditor
              txn={txn}
              categories={categories}
              onSave={onSetSplits}
              onClear={onClearSplits}
              onClose={() => onToggleSplit(txn.id)}
            />
          </td>
        </tr>
      )}
    </>
  )
}

export default function TransactionList() {
  const transactions = useTransactionStore((state) => state.transactions)
  const filter = useTransactionStore((state) => state.filter)
  const categories = useTransactionStore((state) => state.categories)
  const accounts = useTransactionStore((state) => state.accounts)
  const selectedIds = useTransactionStore((state) => state.selectedIds)
  const toggleSelected = useTransactionStore((state) => state.toggleSelected)
  const setSelectedIds = useTransactionStore((state) => state.setSelectedIds)
  const categorizeTransaction = useTransactionStore(
    (state) => state.categorizeTransaction
  )
  const renamePayee = useTransactionStore((state) => state.renamePayee)
  const updateMemo = useTransactionStore((state) => state.updateMemo)
  const toggleCleared = useTransactionStore((state) => state.toggleCleared)
  const setSplits = useTransactionStore((state) => state.setSplits)
  const clearSplits = useTransactionStore((state) => state.clearSplits)
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction)
  const getAvailableFor = useBudgetStore((state) => state.getAvailableFor)
  const budgets = useBudgetStore((state) => state.budgets)
  const currentMonth = useBudgetStore((state) => state.currentMonth)

  const [splitOpenId, setSplitOpenId] = useState(null)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const accountsById = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  )

  const filtered = useMemo(() => {
    const rows = useTransactionStore.getState().getFilteredTransactions()
    if (!sortKey) return rows
    const ctx = { getAvailableFor, accountsById }
    return [...rows].sort((a, b) => {
      const primary = compareSortValues(
        sortValue(a, sortKey, ctx),
        sortValue(b, sortKey, ctx),
        sortDir
      )
      if (primary !== 0) return primary
      const byDate = new Date(b.date) - new Date(a.date)
      if (byDate !== 0) return byDate
      return String(a.id).localeCompare(String(b.id))
    })
  }, [
    transactions,
    filter,
    sortKey,
    sortDir,
    getAvailableFor,
    accountsById,
    budgets,
    currentMonth,
  ])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(
      key === 'date' ||
        key === 'outflow' ||
        key === 'inflow' ||
        key === 'available' ||
        key === 'balance'
        ? 'desc'
        : 'asc'
    )
  }

  const allSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.includes(t.id))

  const toggleAll = () => {
    if (allSelected) setSelectedIds([])
    else setSelectedIds(filtered.map((t) => t.id))
  }

  const toggleSplit = (id) => {
    setSplitOpenId((current) => (current === id ? null : id))
  }

  const handleDelete = async (txn) => {
    const label = txn.transferAccountId
      ? 'Delete this transfer (both sides)?'
      : `Delete "${txn.payee}"?`
    if (!window.confirm(label)) return
    await deleteTransaction(txn.id)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[68rem] border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-border-hairline text-left text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            <th className="w-8 px-2 py-1.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all"
                className="accent-primary"
              />
            </th>
            {SORTABLE_COLUMNS.map((column) => (
              <SortableTh
                key={column.key}
                column={column}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={11}
                className="px-4 py-8 text-center text-body-sm text-on-surface-variant"
              >
                No transactions yet. Use Bank Import to sync, or Add Transaction.
              </td>
            </tr>
          )}
          {filtered.map((txn) => {
            const categoryAvailable =
              txn.transferAccountId || txn.isSplit || !txn.categoryId
                ? null
                : getAvailableFor(txn.categoryId)
            const accountBalance =
              txn.accountId != null && accountsById[txn.accountId]
                ? Number(accountsById[txn.accountId].balance) || 0
                : null
            return (
              <TransactionRow
                key={txn.id}
                txn={txn}
                accountsById={accountsById}
                categories={categories}
                selected={selectedIds.includes(txn.id)}
                splitOpen={splitOpenId === txn.id}
                categoryAvailable={categoryAvailable}
                accountBalance={accountBalance}
                onToggleSelected={toggleSelected}
                onToggleSplit={toggleSplit}
                onCategorize={categorizeTransaction}
                onRenamePayee={renamePayee}
                onUpdateMemo={updateMemo}
                onToggleCleared={toggleCleared}
                onSetSplits={setSplits}
                onClearSplits={clearSplits}
                onDelete={handleDelete}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
