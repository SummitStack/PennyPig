import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MainLayout from '../components/Layout/MainLayout'
import Icon from '../components/ui/Icon'
import { ModalBackdrop, modalPanel } from '../components/ui/Modal'
import { CategorySelect } from '../components/Transactions/TransactionList'
import { useTransactionStore } from '../store/transactionStore'
import { transactionsMatchingRule } from '../lib/rules'
import { gigPayerSuggestions } from '../lib/gigIncome'
import { normalizePayeeKey } from '../lib/payee'

function pureTransfer(t) {
  return t.transferAccountId && !t.categoryId && !t.isSplit
}

function RuleModal({ initial, onClose }) {
  const categories = useTransactionStore((s) => s.categories)
  const transactions = useTransactionStore((s) => s.transactions)
  const saveCategoryRule = useTransactionStore((s) => s.saveCategoryRule)
  const applyRuleToPast = useTransactionStore((s) => s.applyRuleToPast)
  const [form, setForm] = useState({
    matchPayee: initial?.matchPayee || '',
    matchType: initial?.matchType || 'exact',
    categoryId: initial?.categoryId || null,
    forNextMonth: Boolean(initial?.forNextMonth),
    isGig: Boolean(initial?.isGig),
  })
  const [applyPast, setApplyPast] = useState(!initial?.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const draft = useMemo(
    () => ({ ...form, matchKey: normalizePayeeKey(form.matchPayee) }),
    [form]
  )
  const matches = useMemo(
    () =>
      draft.matchKey
        ? transactionsMatchingRule(draft, transactions).filter((t) => !t.isSplit && !pureTransfer(t))
        : [],
    [draft, transactions]
  )
  const uncategorized = matches.filter((t) => !t.categoryId).length

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const save = async () => {
    setBusy(true)
    setError(null)
    const result = await saveCategoryRule({ id: initial?.id || null, ...form })
    if (result.success && applyPast) {
      const applied = await applyRuleToPast(result.rule)
      if (!applied.success) {
        setBusy(false)
        setError(applied.error || 'Saved the rule, but could not apply it to past transactions')
        return
      }
    }
    setBusy(false)
    if (!result.success) setError(result.error)
    else onClose()
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div role="dialog" aria-labelledby="rule-title" className={`${modalPanel} max-w-md p-5`} data-testid="rule-modal">
        <div className="flex items-start justify-between gap-3">
          <h3 id="rule-title" className="font-display text-headline-sm text-on-surface">
            {initial?.id ? 'Edit rule' : 'New rule'}
          </h3>
          <button type="button" className="btn btn-ghost h-8 w-8 p-0" aria-label="Close" onClick={onClose}>
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <label htmlFor="rule-payee" className="mt-4 block text-label-md font-medium text-on-surface">
          When the payee
        </label>
        <div className="mt-1 flex gap-2">
          <select
            className="field w-32"
            value={form.matchType}
            onChange={(e) => set({ matchType: e.target.value })}
            aria-label="How to match"
          >
            <option value="exact">is</option>
            <option value="contains">contains</option>
          </select>
          <input
            id="rule-payee"
            className="field min-w-0 flex-1"
            value={form.matchPayee}
            onChange={(e) => set({ matchPayee: e.target.value })}
            placeholder="e.g. DoorDash"
          />
        </div>

        <label className="mt-4 block text-label-md font-medium text-on-surface">File it under</label>
        <CategorySelect
          value={form.categoryId}
          categories={categories}
          onChange={(id) => set({ categoryId: id })}
          className="field mt-1 w-full"
          emptyLabel="Pick a category"
        />

        <div className="mt-4 space-y-2">
          <label className="flex items-start gap-2 text-body-sm text-on-surface">
            <input type="checkbox" className="mt-0.5" checked={form.isGig} onChange={(e) => set({ isGig: e.target.checked })} />
            <span>
              Gig or irregular pay
              <span className="block text-label-sm text-on-surface-variant">Counts toward the Gig income panel and percent-of-gig targets.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-body-sm text-on-surface">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.forNextMonth}
              onChange={(e) => set({ forNextMonth: e.target.checked })}
            />
            <span>
              Use this income next month
              <span className="block text-label-sm text-on-surface-variant">
                Money that arrives this month funds next month’s budget, so you live on last month’s pay.
              </span>
            </span>
          </label>
          {matches.length > 0 && (
            <label className="flex items-start gap-2 text-body-sm text-on-surface">
              <input type="checkbox" className="mt-0.5" checked={applyPast} onChange={(e) => setApplyPast(e.target.checked)} />
              <span>
                Apply to {uncategorized} uncategorized past transaction{uncategorized === 1 ? '' : 's'}
                <span className="block text-label-sm text-on-surface-variant">
                  {matches.length} in your register match. Ones you already filed stay as they are.
                </span>
              </span>
            </label>
          )}
        </div>

        {error && <p className="mt-3 text-label-md text-status-error">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save rule'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  )
}

export default function RulesPage() {
  const rules = useTransactionStore((s) => s.categoryRules)
  const categories = useTransactionStore((s) => s.categories)
  const transactions = useTransactionStore((s) => s.transactions)
  const deleteCategoryRule = useTransactionStore((s) => s.deleteCategoryRule)
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)

  const categoriesById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const counts = useMemo(() => {
    const out = {}
    for (const r of rules) out[r.id] = transactionsMatchingRule(r, transactions).length
    return out
  }, [rules, transactions])

  const gigSuggestions = useMemo(() => gigPayerSuggestions(transactions, rules), [transactions, rules])

  const shown = useMemo(() => {
    const q = normalizePayeeKey(query)
    return [...rules]
      .filter((r) => !q || r.matchKey.includes(q) || normalizePayeeKey(categoriesById[r.categoryId]?.name).includes(q))
      .sort((a, b) => a.matchPayee.localeCompare(b.matchPayee))
  }, [rules, query, categoriesById])

  const incomeLeaf = categories.find((c) => c.type === 'income' && !categories.some((k) => k.parentId === c.id))

  const remove = async (rule) => {
    setError(null)
    const res = await deleteCategoryRule(rule.id)
    if (!res.success) setError(res.error)
  }

  return (
    <MainLayout>
      <div className="max-w-3xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">
              <Link to="/settings" className="hover:underline">
                Settings
              </Link>
            </p>
            <h1 className="mt-1 font-display text-headline-lg text-on-surface">Rules</h1>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Rules file new transactions for you. Categorizing a payee by hand adds one too.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
            <Icon name="add" className="text-[18px]" />
            New rule
          </button>
        </div>

        {gigSuggestions.length > 0 && (
          <section className="card p-4" data-testid="gig-suggestions">
            <h2 className="font-display text-headline-sm text-on-surface">Looks like gig pay</h2>
            <p className="text-body-sm text-on-surface-variant">
              Mark these payers as gig income to see your gig totals and plan around your slow months.
            </p>
            <ul className="mt-2 divide-y divide-border-hairline">
              {gigSuggestions.map((g) => (
                <li key={g.key} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-body-sm text-on-surface">
                    {g.label}
                    <span className="text-on-surface-variant"> · {g.count} payment{g.count === 1 ? '' : 's'}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setEditing({
                        matchPayee: g.label,
                        matchType: 'contains',
                        isGig: true,
                        categoryId: incomeLeaf?.id || null,
                      })
                    }
                  >
                    Set up
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-0">
          <div className="border-b border-border-hairline p-3">
            <input
              className="field w-full"
              placeholder="Search rules"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search rules"
            />
          </div>
          {shown.length === 0 ? (
            <p className="p-5 text-body-sm text-on-surface-variant">
              {rules.length === 0 ? 'No rules yet. Add one, or categorize a transaction and PennyPig remembers it.' : 'No rules match.'}
            </p>
          ) : (
            <ul className="divide-y divide-border-hairline" data-testid="rules-list">
              {shown.map((rule) => {
                const cat = categoriesById[rule.categoryId]
                return (
                  <li key={rule.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(rule)}>
                      <div className="truncate text-body-sm font-medium text-on-surface">
                        <span className="text-on-surface-variant">{rule.matchType === 'contains' ? 'Contains ' : ''}</span>
                        {rule.matchPayee}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-label-sm text-on-surface-variant">
                        <span>
                          → {cat ? `${cat.emoji ? `${cat.emoji} ` : ''}${cat.name}` : 'Deleted category'}
                        </span>
                        <span>· {counts[rule.id] || 0} matched</span>
                        {rule.isGig && <span className="chip">Gig</span>}
                        {rule.forNextMonth && <span className="chip">Next month</span>}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost h-8 w-8 p-0 text-on-surface-variant"
                      aria-label={`Delete rule for ${rule.matchPayee}`}
                      onClick={() => remove(rule)}
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        {error && <p className="text-label-md text-status-error">{error}</p>}
      </div>
      {editing && <RuleModal initial={editing} onClose={() => setEditing(null)} />}
    </MainLayout>
  )
}
