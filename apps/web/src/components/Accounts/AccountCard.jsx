import { useEffect, useState } from 'react'
import { useAccountStore } from '../../store/accountStore'
import { useTransactionStore } from '../../store/transactionStore'
import { useBudgetStore } from '../../store/budgetStore'
import { authFetch } from '../../lib/authFetch'
import { money } from '../../lib/money'
import { isLiability } from '../../lib/reportMath'
import Icon from '../ui/Icon'
import ReconcileModal from './ReconcileModal'
import AccountEditModal from './AccountEditModal'

const TYPE_LABEL = { checking: 'Checking', savings: 'Savings', credit: 'Credit card', loan: 'Loan', investment: 'Investment' }

function accountIcon(type) {
  if (type === 'credit') return 'credit_card'
  if (type === 'savings') return 'savings'
  if (type === 'investment') return 'trending_up'
  if (type === 'loan') return 'real_estate_agent'
  return 'account_balance'
}

function syncedAgo(date) {
  if (!date) return null
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function AccountCard({ account }) {
  const [syncing, setSyncing] = useState(false)
  const [showReconcile, setShowReconcile] = useState(false)
  const [note, setNote] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const loadAccounts = useAccountStore((state) => state.loadAccounts)
  const loadData = useTransactionStore((state) => state.loadData)
  const loadBudgets = useBudgetStore((state) => state.loadBudgets)

  useEffect(() => {
    if (!note) return undefined
    const t = setTimeout(() => setNote(null), 5000)
    return () => clearTimeout(t)
  }, [note])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await authFetch('/api/plaid/sync', {
        method: 'POST',
        body: JSON.stringify({ account_id: account.id }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Sync failed')
      await Promise.all([loadAccounts(), loadData(), loadBudgets()])
      const n = data.synced ?? 0
      const extra = data.startingBalances
        ? ' Added a starting balance so the register matches the bank.'
        : ''
      setNote({ tone: 'ok', text: `Synced ${n} transaction${n === 1 ? '' : 's'}.${extra}` })
    } catch (error) {
      setNote({ tone: 'error', text: error.message })
    } finally {
      setSyncing(false)
    }
  }

  // Debts read as an amount owed: manual cards store it negative, linked ones positive.
  const isDebt = isLiability(account)
  const shown = isDebt ? Math.abs(Number(account.balance) || 0) : Number(account.balance) || 0
  const subtitle = account.closed
    ? 'Closed'
    : account.isManual
    ? [TYPE_LABEL[account.type] || 'Account', 'Manual', account.onBudget ? null : 'Tracking only']
        .filter(Boolean)
        .join(' · ')
    : [account.institution, account.accountNumber].filter(Boolean).join(' ')
  const ago = !account.isManual ? syncedAgo(account.lastSynced) : null

  return (
    <div className="card flex flex-col p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isDebt ? 'bg-status-error/10 text-status-error' : 'bg-cool-blue/10 text-cool-blue'
          }`}
        >
          <Icon name={accountIcon(account.type)} className="text-[20px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-headline-sm text-on-surface">{account.name}</h3>
          <p className="truncate text-label-md text-on-surface-variant">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowEdit(true)}
          className="btn btn-ghost h-8 w-8 p-0"
          aria-label={`Edit ${account.name}`}
          title="Edit, close or delete"
        >
          <Icon name="edit" className="text-[18px]" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-md text-on-surface-variant">{isDebt ? 'Balance owed' : 'Balance'}</p>
          <p
            className={`num font-display text-headline-lg ${
              (isDebt ? shown > 0 : shown < 0) ? 'text-status-error' : 'text-on-surface'
            }`}
          >
            {money(shown)}
          </p>
          {ago && <p className="whitespace-nowrap text-label-md text-on-surface-variant">Synced {ago}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          {!account.isManual && (
            <button type="button" onClick={handleSync} disabled={syncing} className="btn btn-secondary btn-sm">
              <Icon name="sync" className={`text-[16px] ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing' : 'Sync'}
            </button>
          )}
          <button type="button" onClick={() => setShowReconcile(true)} className="btn btn-secondary btn-sm">
            <Icon name="fact_check" className="text-[16px]" />
            Reconcile
          </button>
        </div>
      </div>

      {note && (
        <p
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-label-md ${
            note.tone === 'error' ? 'bg-status-error/10 text-status-error' : 'bg-primary/10 text-primary'
          }`}
        >
          {note.text}
        </p>
      )}

      {showReconcile && <ReconcileModal account={account} onClose={() => setShowReconcile(false)} />}
      {showEdit && <AccountEditModal account={account} onClose={() => setShowEdit(false)} />}
    </div>
  )
}
