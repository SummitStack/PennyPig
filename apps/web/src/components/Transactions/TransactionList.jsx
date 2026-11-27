import { useEffect, useMemo, useRef, useState } from 'react'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { getLeafCategories } from '../../lib/categories'
import { leafExpenseOptgroups, resolveToLeafCategoryId } from '../../lib/categorySuggest'
import { absAmount, formatMoney, isInflow, money } from '../../lib/money'
import { normalizePayeeKey } from '../../lib/payee'
import Icon from '../ui/Icon'

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(`${String(d).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

const SORTABLE_COLUMNS = [
  { key: 'date', label: 'Date', align: 'left', className: 'w-24 px-2 py-2.5' },
  { key: 'payee', label: 'Payee', align: 'left', className: 'min-w-[12rem] px-2 py-2.5' },
  { key: 'category', label: 'Category', align: 'left', className: 'w-44 px-2 py-2.5' },
  { key: 'memo', label: 'Memo', align: 'left', className: 'hidden xl:table-cell min-w-[6rem] px-2 py-2.5' },
  {
    key: 'outflow',
    label: 'Outflow',
    align: 'right',
    className: 'w-24 px-2 py-2.5 text-right',
  },
  {
    key: 'inflow',
    label: 'Inflow',
    align: 'right',
    className: 'w-24 px-2 py-2.5 text-right',
  },
  {
    key: 'balance',
    label: 'Balance',
    align: 'right',
    className: 'hidden lg:table-cell w-28 px-2 py-2.5 text-right',
    singleAccount: true,
  },
  {
    key: 'cleared',
    label: '',
    align: 'center',
    className: 'w-24 px-2 py-2.5 text-center',
  },
]

function isDebt(account) {
  return account?.type === 'credit' || account?.type === 'loan'
}

/** Income the user can hold for next month: an inflow filed under income. */
function canHoldForNextMonth(txn) {
  return !txn.transferAccountId && !txn.isSplit && txn.categoryType === 'income' && Number(txn.amount) < 0
}

function NextMonthToggle({ txn, onToggle }) {
  if (!canHoldForNextMonth(txn)) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle(txn.id, !txn.forNextMonth)
      }}
      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold leading-none transition-colors ${
        txn.forNextMonth
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border-hairline text-on-surface-variant hover:text-on-surface'
      }`}
      title={txn.forNextMonth ? 'Funds next month’s budget. Click to use it this month.' : 'Use this income next month'}
      aria-pressed={Boolean(txn.forNextMonth)}
    >
      Next mo
    </button>
  )
}

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

function sortValue(txn, key, { getAvailableFor, runningBalances } = {}) {
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
    case 'balance': {
      const bal = runningBalances?.[txn.id]
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

export function CategorySelect({
  value,
  categories,
  onChange,
  disabled = false,
  className = 'w-full max-w-[11rem] cursor-pointer truncate rounded-md border border-transparent bg-transparent px-1 py-1 text-body-sm text-on-surface hover:border-border-hairline focus:border-cool-blue focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
  emptyLabel = 'Uncategorized',
  ariaLabel = 'Category',
}) {
  const expenseGroups = leafExpenseOptgroups(categories)
  const incomeLeaves = getLeafCategories(categories, 'income')
  const resolvedValue = resolveToLeafCategoryId(categories, value) || value || ''

  return (
    <select
      className={className}
      value={resolvedValue}
      onChange={(e) => onChange(e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
      disabled={disabled}
      aria-label={ariaLabel}
      title="Pick a subcategory (final budget category)"
    >
      <option value="">{emptyLabel}</option>
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
  accountBalance,
  showAccount = true,
  showBalance = false,
  onSetForNextMonth,
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
  const columnCount = showBalance ? 9 : 8

  const outflow = !isInflow(txn.amount) ? absAmount(txn.amount) : null
  const inflowAmt = isInflow(txn.amount) ? absAmount(txn.amount) : null

  return (
    <>
      <tr
        className={`border-b border-border-hairline last:border-0 transition-colors hover:bg-surface-container/60 ${
          selected ? 'bg-primary/10' : ''
        } ${!txn.cleared && !isTransfer ? 'bg-surface-container-low/40' : ''}`}
        onClick={() => onToggleSelected(txn.id)}
      >
        <td className="px-3 py-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(txn.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${displayPayee}`}
            className="accent-primary"
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-on-surface-variant">
          {formatDate(txn.date)}
        </td>
        <td className="max-w-[20rem] px-1 py-2">
          <EditablePayee
            txn={txn}
            displayPayee={displayPayee}
            onSave={onRenamePayee}
            readOnly={isTransfer}
          />
          {showAccount && (
            <span className="ml-1 inline-block max-w-full truncate rounded bg-surface-container px-1.5 py-px text-[11px] text-on-surface-variant">
              {txn.account || '…'}
            </span>
          )}
        </td>
        <td className="px-1 py-2">
          {isTransfer ? (
            <span className="px-1 text-body-sm text-on-surface-variant">Transfer</span>
          ) : txn.excludeFromBudget ? (
            <span className="px-1 text-body-sm text-on-surface-variant" title="Recorded before you started budgeting">
              Not in budget
            </span>
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
              <CategorySelect
                value={txn.categoryId}
                categories={categories}
                onChange={(id) => onCategorize(txn.id, id)}
              />
              <NextMonthToggle txn={txn} onToggle={onSetForNextMonth} />
            </div>
          )}
        </td>
        <td className="hidden px-1 py-2 xl:table-cell">
          <EditableMemo txn={txn} onSave={onUpdateMemo} />
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right font-medium tabular-nums text-on-surface">
          {outflow != null ? `-${formatMoney(outflow)}` : ''}
        </td>
        <td className="whitespace-nowrap px-2 py-2 text-right font-medium tabular-nums text-primary">
          {inflowAmt != null ? `+${formatMoney(inflowAmt)}` : ''}
        </td>
        {showBalance && (
          <td
            className={`hidden whitespace-nowrap px-2 py-2 text-right tabular-nums lg:table-cell ${
              accountBalance < 0 ? 'text-status-error' : 'text-on-surface-variant'
            }`}
            title="Account balance after this transaction"
          >
            {accountBalance == null ? '' : money(accountBalance)}
          </td>
        )}
        <td className="px-2 py-2">
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
          <td colSpan={columnCount} className="px-3 py-2">
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

/** Phone layout: one card per transaction instead of a sideways-scrolling table. */
function TransactionCard({
  onSetForNextMonth,
  txn,
  accountsById,
  categories,
  selected,
  onToggleSelected,
  onCategorize,
  onToggleCleared,
  onDelete,
}) {
  const isTransfer = Boolean(txn.transferAccountId)
  const displayPayee = isTransfer
    ? `Transfer: ${accountsById[txn.transferAccountId]?.name || 'Account'}`
    : txn.payee
  const inflow = isInflow(txn.amount)
  const amt = absAmount(txn.amount)

  return (
    <li
      className={`flex items-start gap-3 px-3 py-3 ${selected ? 'bg-primary/10' : ''}`}
      data-testid="txn-card"
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelected(txn.id)}
        aria-label={`Select ${displayPayee}`}
        className="mt-1 accent-primary"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-body-md font-medium text-on-surface">{displayPayee}</p>
          <p
            className={`num shrink-0 text-body-md font-semibold ${
              inflow ? 'text-primary' : 'text-on-surface'
            }`}
          >
            {inflow ? '+' : '-'}
            {money(amt)}
          </p>
        </div>
        <p className="mt-0.5 truncate text-label-md text-on-surface-variant">
          {formatDate(txn.date)} · {txn.account || '…'}
          {!txn.cleared && !isTransfer ? ' · Uncleared' : ''}
        </p>
        <div className="mt-1.5 flex items-center gap-1">
          {isTransfer ? (
            <span className="text-body-sm text-on-surface-variant">Transfer</span>
          ) : txn.excludeFromBudget ? (
            <span className="flex-1 text-body-sm text-on-surface-variant">Not in budget</span>
          ) : txn.isSplit ? (
            <span className="truncate text-body-sm text-on-surface-variant">
              Split: {(txn.splits || []).map((s) => s.category || 'Uncategorized').join(', ')}
            </span>
          ) : (
            <>
            <CategorySelect
              value={txn.categoryId}
              categories={categories}
              onChange={(id) => onCategorize(txn.id, id)}
              className={`min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-body-sm ${
                txn.categoryId
                  ? 'border-border-hairline bg-surface-base text-on-surface'
                  : 'border-status-warning/40 bg-status-warning/10 text-on-surface'
              }`}
            />
            <NextMonthToggle txn={txn} onToggle={onSetForNextMonth} />
            </>
          )}
          {!isTransfer && (
            <button
              type="button"
              onClick={() => onToggleCleared(txn.id)}
              className="btn btn-ghost h-8 w-8 shrink-0 p-0 text-status-success"
              aria-label={txn.cleared ? 'Unlock and unclear' : 'Clear and lock'}
            >
              <Icon name={txn.cleared ? 'lock' : 'radio_button_unchecked'} className="text-[18px]" filled={txn.cleared} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(txn)}
            className="btn btn-ghost h-8 w-8 shrink-0 p-0 text-on-surface-variant"
            aria-label="Delete transaction"
          >
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      </div>
    </li>
  )
}

/** Shown when transactions are selected: categorize or clear them all at once. */
function BulkBar({ count, categories, onCategorize, onClear, onDone, busy }) {
  return (
    <div
      className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border-b border-border-hairline bg-surface-container px-3 py-2 lg:top-0"
      data-testid="bulk-bar"
    >
      <span className="text-body-sm font-semibold text-on-surface">{count} selected</span>
      <CategorySelect
        value=""
        categories={categories}
        onChange={(id) => id && onCategorize(id)}
        disabled={busy}
        emptyLabel="Categorize as…"
        ariaLabel="Categorize selected as"
        className="field w-auto min-w-[10rem] flex-1 py-1.5 sm:flex-none"
      />
      <button type="button" className="btn btn-secondary btn-sm" onClick={onClear} disabled={busy}>
        <Icon name="lock" className="text-[16px]" />
        Clear
      </button>
      <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={onDone} disabled={busy}>
        Deselect
      </button>
    </div>
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
  const setForNextMonth = useTransactionStore((state) => state.setForNextMonth)
  // The running balance only makes sense inside one account.
  const singleAccount = Boolean(filter.accountId)
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

  // Balance after each transaction, walking back from the account's current
  // balance. Before, every row repeated the current balance.
  const runningBalances = useMemo(() => {
    const byAccount = {}
    for (const t of transactions) {
      if (!t.accountId) continue
      ;(byAccount[t.accountId] ||= []).push(t)
    }
    const out = {}
    for (const [accountId, rows] of Object.entries(byAccount)) {
      const acct = accountsById[accountId]
      if (!acct) continue
      rows.sort(
        (a, b) => new Date(b.date) - new Date(a.date) || String(b.id).localeCompare(String(a.id))
      )
      // Cards and loans count as money owed, as on the Accounts page.
      const raw = Number(acct.balance) || 0
      let bal = isDebt(acct) ? -Math.abs(raw) : raw
      for (const t of rows) {
        out[t.id] = bal
        bal += Number(t.amount) || 0
      }
    }
    return out
  }, [transactions, accountsById])

  const filtered = useMemo(() => {
    const rows = useTransactionStore.getState().getFilteredTransactions()
    if (!sortKey) return rows
    const ctx = { getAvailableFor, runningBalances }
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
    runningBalances,
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

  // After categorizing one transaction, offer to give the same category to the
  // payee's other uncategorized transactions. Before, the rule only applied to
  // future imports and older ones had to be done one by one.
  const [payeePrompt, setPayeePrompt] = useState(null) // { payee, categoryName, ids }
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkNote, setBulkNote] = useState(null)

  useEffect(() => {
    if (!bulkNote) return undefined
    const t = setTimeout(() => setBulkNote(null), 4000)
    return () => clearTimeout(t)
  }, [bulkNote])

  const handleCategorize = async (id, categoryId) => {
    const txn = transactions.find((t) => t.id === id)
    await categorizeTransaction(id, categoryId)
    if (!categoryId || !txn) return
    // Match on the name the user sees (payee) or the raw bank text (merchant),
    // so "Coffee Hut" finds rows whose bank text differs by store number.
    const payeeKey = normalizePayeeKey(txn.payee)
    const merchantKey = normalizePayeeKey(txn.merchant)
    if (!payeeKey && !merchantKey) return
    const others = useTransactionStore
      .getState()
      .transactions.filter(
        (t) =>
          t.id !== id &&
          !t.categoryId &&
          !t.excludeFromBudget &&
          !t.transferAccountId &&
          !t.isSplit &&
          ((payeeKey && normalizePayeeKey(t.payee) === payeeKey) ||
            (merchantKey && normalizePayeeKey(t.merchant) === merchantKey))
      )
    if (others.length === 0) {
      setPayeePrompt(null)
      return
    }
    const cat = categories.find((c) => c.id === categoryId)
    setPayeePrompt({
      payee: txn.payee || txn.merchant,
      categoryId,
      categoryName: cat?.name || 'this category',
      ids: others.map((t) => t.id),
    })
  }

  const applyPayeePrompt = async () => {
    if (!payeePrompt) return
    setBulkBusy(true)
    for (const tid of payeePrompt.ids) {
      await categorizeTransaction(tid, payeePrompt.categoryId, { skipRuleUpsert: true })
    }
    setBulkBusy(false)
    setBulkNote(
      `Categorized ${payeePrompt.ids.length} more from ${payeePrompt.payee} as ${payeePrompt.categoryName}.`
    )
    setPayeePrompt(null)
  }

  const selectedTxns = transactions.filter((t) => selectedIds.includes(t.id))

  const bulkCategorize = async (categoryId) => {
    const eligible = selectedTxns.filter((t) => !t.transferAccountId && !t.isSplit)
    setBulkBusy(true)
    for (const t of eligible) {
      await categorizeTransaction(t.id, categoryId, { skipRuleUpsert: true })
    }
    setBulkBusy(false)
    const cat = categories.find((c) => c.id === categoryId)
    const skipped = selectedTxns.length - eligible.length
    setBulkNote(
      `Categorized ${eligible.length} as ${cat?.name || 'that category'}` +
        (skipped ? `. Skipped ${skipped} transfer${skipped === 1 ? '' : 's'} or split${skipped === 1 ? '' : 's'}.` : '.')
    )
    setSelectedIds([])
  }

  const bulkClear = async () => {
    const toClear = selectedTxns.filter((t) => !t.cleared && !t.transferAccountId)
    setBulkBusy(true)
    for (const t of toClear) await toggleCleared(t.id)
    setBulkBusy(false)
    setBulkNote(`Cleared ${toClear.length} transaction${toClear.length === 1 ? '' : 's'}.`)
    setSelectedIds([])
  }

  return (
    <div>
      {selectedIds.length > 0 && (
        <BulkBar
          count={selectedIds.length}
          categories={categories}
          onCategorize={bulkCategorize}
          onClear={bulkClear}
          onDone={() => setSelectedIds([])}
          busy={bulkBusy}
        />
      )}
      {payeePrompt && (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-border-hairline bg-primary/10 px-3 py-2 text-body-sm text-on-surface"
          role="status"
          data-testid="payee-prompt"
        >
          <span className="min-w-0 flex-1">
            {payeePrompt.ids.length} more from <strong>{payeePrompt.payee}</strong>{' '}
            {payeePrompt.ids.length === 1 ? 'is' : 'are'} uncategorized. Use {payeePrompt.categoryName} for{' '}
            {payeePrompt.ids.length === 1 ? 'it' : 'them'} too?
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={applyPayeePrompt} disabled={bulkBusy}>
            Apply to {payeePrompt.ids.length}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPayeePrompt(null)}>
            Not now
          </button>
        </div>
      )}
      {bulkNote && (
        <p role="status" className="border-b border-border-hairline bg-primary/10 px-3 py-2 text-body-sm text-primary">
          {bulkNote}
        </p>
      )}

      <ul className="divide-y divide-border-hairline md:hidden">
        {filtered.length === 0 && (
          <li className="px-4 py-10 text-center text-body-sm text-on-surface-variant">
            No transactions here yet. Add one, or import from your bank.
          </li>
        )}
        {filtered.map((txn) => (
          <TransactionCard
            onSetForNextMonth={setForNextMonth}
            key={txn.id}
            txn={txn}
            accountsById={accountsById}
            categories={categories}
            selected={selectedIds.includes(txn.id)}
            onToggleSelected={toggleSelected}
            onCategorize={handleCategorize}
            onToggleCleared={toggleCleared}
            onDelete={handleDelete}
          />
        ))}
      </ul>

    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[34rem] border-collapse text-body-sm md:min-w-[44rem]">
        <thead>
          <tr className="border-b border-border-hairline bg-surface-container-low text-left text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            <th className="w-8 px-3 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all"
                className="accent-primary"
              />
            </th>
            {SORTABLE_COLUMNS.filter((c) => !c.singleAccount || singleAccount).map((column) => (
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
                colSpan={singleAccount ? 9 : 8}
                className="px-4 py-12 text-center text-body-sm text-on-surface-variant"
              >
                No transactions here yet. Add one, or import from your bank.
              </td>
            </tr>
          )}
          {filtered.map((txn) => {
            const accountBalance = runningBalances[txn.id] ?? null
            return (
              <TransactionRow
                key={txn.id}
                txn={txn}
                accountsById={accountsById}
                categories={categories}
                selected={selectedIds.includes(txn.id)}
                splitOpen={splitOpenId === txn.id}
                accountBalance={accountBalance}
                showAccount={!singleAccount}
                showBalance={singleAccount}
                onSetForNextMonth={setForNextMonth}
                onToggleSelected={toggleSelected}
                onToggleSplit={toggleSplit}
                onCategorize={handleCategorize}
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
    </div>
  )
}
