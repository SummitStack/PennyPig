import { useEffect, useMemo, useRef, useState } from 'react'
import { useTransactionStore } from '../../store/transactionStore'
import { buildCategoryTree, getLeafCategories } from '../../lib/categories'
import Icon from '../ui/Icon'

function formatDate(d) {
  const date = new Date(d)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

function formatMoney(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function CategorySelect({ value, categories, onChange }) {
  const expenseTree = buildCategoryTree(categories, 'expense')
  const incomeLeaves = getLeafCategories(categories, 'income')

  return (
    <select
      className="w-full max-w-[14rem] cursor-pointer truncate rounded border border-transparent bg-transparent py-0.5 text-body-sm text-on-surface hover:border-border-hairline focus:border-cool-blue focus:outline-none"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">Uncategorized</option>
      {expenseTree.map((root) =>
        root.children.length > 0 ? (
          <optgroup key={root.id} label={`${root.emoji} ${root.name}`}>
            {root.children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.emoji} {child.name}
              </option>
            ))}
          </optgroup>
        ) : (
          <option key={root.id} value={root.id}>
            {root.emoji} {root.name}
          </option>
        )
      )}
      {incomeLeaves.length > 0 && (
        <optgroup label="Income">
          {incomeLeaves.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.emoji} {cat.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}

function EditablePayee({ txn, onSave }) {
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
      {txn.payee}
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

export default function TransactionList() {
  const transactions = useTransactionStore((state) => state.transactions)
  const filter = useTransactionStore((state) => state.filter)
  const categories = useTransactionStore((state) => state.categories)
  const selectedIds = useTransactionStore((state) => state.selectedIds)
  const toggleSelected = useTransactionStore((state) => state.toggleSelected)
  const setSelectedIds = useTransactionStore((state) => state.setSelectedIds)
  const categorizeTransaction = useTransactionStore(
    (state) => state.categorizeTransaction
  )
  const renamePayee = useTransactionStore((state) => state.renamePayee)
  const updateMemo = useTransactionStore((state) => state.updateMemo)
  const toggleCleared = useTransactionStore((state) => state.toggleCleared)

  const filtered = useMemo(() => {
    return useTransactionStore.getState().getFilteredTransactions()
  }, [transactions, filter])

  const allSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.includes(t.id))

  const toggleAll = () => {
    if (allSelected) setSelectedIds([])
    else setSelectedIds(filtered.map((t) => t.id))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-body-sm">
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
            <th className="w-10 px-1 py-1.5">AC</th>
            <th className="w-24 px-2 py-1.5">
              <span className="inline-flex items-center gap-0.5">
                Date
                <Icon name="arrow_drop_down" className="text-[14px]" />
              </span>
            </th>
            <th className="min-w-[9rem] px-2 py-1.5">Payee</th>
            <th className="min-w-[11rem] px-2 py-1.5">Category</th>
            <th className="min-w-[6rem] px-2 py-1.5">Memo</th>
            <th className="w-24 px-2 py-1.5 text-right">Outflow</th>
            <th className="w-24 px-2 py-1.5 text-right">Inflow</th>
            <th className="w-10 px-2 py-1.5 text-center"> </th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-8 text-center text-body-sm text-on-surface-variant"
              >
                No transactions yet. Use Bank Import to sync, or Add Transaction.
              </td>
            </tr>
          )}
          {filtered.map((txn) => {
            const selected = selectedIds.includes(txn.id)
            const isIncome = txn.categoryType === 'income'
            const outflow = isIncome ? null : txn.amount
            const inflow = isIncome ? txn.amount : null

            return (
              <tr
                key={txn.id}
                className={`border-b border-border-hairline/70 transition-colors hover:bg-surface-container/60 ${
                  selected ? 'bg-primary/10' : ''
                }`}
                onClick={() => toggleSelected(txn.id)}
              >
                <td className="px-2 py-1">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelected(txn.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${txn.payee}`}
                    className="accent-primary"
                  />
                </td>
                <td
                  className="truncate px-1 py-1 text-label-sm text-on-surface-variant"
                  title={txn.account}
                >
                  {txn.account?.slice(0, 3) || '…'}
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-on-surface">
                  {formatDate(txn.date)}
                </td>
                <td className="px-1 py-1">
                  <EditablePayee txn={txn} onSave={renamePayee} />
                </td>
                <td className="px-1 py-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="shrink-0 text-sm leading-none" aria-hidden>
                      {txn.categoryEmoji || '💸'}
                    </span>
                    <CategorySelect
                      value={txn.categoryId}
                      categories={categories}
                      onChange={(id) => categorizeTransaction(txn.id, id)}
                    />
                  </div>
                </td>
                <td className="px-1 py-1">
                  <EditableMemo txn={txn} onSave={updateMemo} />
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-on-surface">
                  {outflow != null ? formatMoney(outflow) : ''}
                </td>
                <td className="px-2 py-1 text-right tabular-nums text-sage-accent">
                  {inflow != null ? formatMoney(inflow) : ''}
                </td>
                <td className="px-2 py-1 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCleared(txn.id)
                    }}
                    className="inline-flex items-center justify-center"
                    title={txn.cleared ? 'Cleared — click to uncleared' : 'Uncleared — click to clear'}
                    aria-label={txn.cleared ? 'Cleared' : 'Uncleared'}
                  >
                    {txn.cleared ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-status-success text-[10px] font-bold text-on-primary">
                        c
                      </span>
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-outline-variant text-[10px] text-on-surface-variant">
                        c
                      </span>
                    )}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
