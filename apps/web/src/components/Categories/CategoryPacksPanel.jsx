import { useMemo, useState } from 'react'
import {
  CATEGORY_PACKS,
  getDefaultPacks,
  getSuggestedPacks,
  packInstallStatus,
} from '../../lib/categoryPacks'
import { useTransactionStore } from '../../store/transactionStore'
import Icon from '../ui/Icon'

function PackCard({ pack, status, onAdd, busy }) {
  const installed = status.fullyInstalled
  const partial = status.partial && !installed

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-space-md ${
        installed
          ? 'border-sage-accent/40 bg-sage-accent/5'
          : 'border-border-hairline bg-surface-base'
      }`}
    >
      <div className="flex items-start gap-space-sm">
        <span className="text-2xl leading-none" aria-hidden>
          {pack.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body-md font-bold text-on-surface">{pack.name}</h3>
            {pack.default && (
              <span className="rounded bg-cool-blue/15 px-1.5 py-0.5 text-label-sm font-semibold text-cool-blue">
                Default
              </span>
            )}
            {installed && (
              <span className="rounded bg-sage-accent/20 px-1.5 py-0.5 text-label-sm font-semibold text-sage-accent">
                Added
              </span>
            )}
            {partial && (
              <span className="rounded bg-status-warning/20 px-1.5 py-0.5 text-label-sm font-semibold text-status-warning">
                {status.existingCount}/{status.total}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-label-md text-on-surface-variant">
            {pack.description}
          </p>
        </div>
      </div>

      <ul className="flex flex-wrap gap-1">
        {pack.categories.map((c) => (
          <li
            key={c.name}
            className="rounded-md border border-border-hairline/80 bg-surface-container px-1.5 py-0.5 text-label-sm text-on-surface"
          >
            <span aria-hidden>{c.emoji}</span> {c.name}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex justify-end">
        {installed ? (
          <span className="inline-flex items-center gap-1 text-label-md text-sage-accent">
            <Icon name="check_circle" className="text-[16px]" />
            In your budget
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdd(pack)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-space-md py-1.5 text-label-md font-semibold text-on-primary disabled:opacity-50"
          >
            <Icon name="add" className="text-[14px]" />
            {partial ? 'Add missing' : 'Add to budget'}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Browse default + suggested category packs; add packs or jump to custom create.
 */
export default function CategoryPacksPanel({ onCustom, onClose }) {
  const categories = useTransactionStore((state) => state.categories)
  const addCategoryPack = useTransactionStore((state) => state.addCategoryPack)
  const [busyId, setBusyId] = useState(null)
  const [flash, setFlash] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('suggested') // 'defaults' | 'suggested' | 'all'

  const defaults = useMemo(() => getDefaultPacks(), [])
  const suggested = useMemo(() => getSuggestedPacks(), [])

  const visible = tab === 'defaults' ? defaults : tab === 'suggested' ? suggested : CATEGORY_PACKS

  const handleAdd = async (pack) => {
    setBusyId(pack.id)
    setError(null)
    setFlash(null)
    const result = await addCategoryPack(pack)
    setBusyId(null)
    if (!result.success) {
      setError(result.error || 'Could not add pack')
      return
    }
    setFlash(
      result.added === 0
        ? `“${pack.name}” is already complete`
        : `Added ${result.added} categor${result.added === 1 ? 'y' : 'ies'} from ${pack.name}`
    )
  }

  return (
    <div className="flex flex-col gap-space-md rounded-xl border border-border-hairline bg-surface-container p-space-md shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">
            Category ideas
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Your budget starts with core defaults. Add more groups from these
            ideas, or create your own.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {onCustom && (
            <button
              type="button"
              onClick={onCustom}
              className="inline-flex items-center gap-1 rounded-lg border border-border-hairline bg-surface-base px-space-sm py-1.5 text-label-md font-semibold text-on-surface hover:bg-surface-container-high"
            >
              <Icon name="edit" className="text-[14px]" />
              Add your own
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
              aria-label="Close"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border-hairline pb-2">
        {[
          { id: 'suggested', label: 'Ideas to add' },
          { id: 'defaults', label: 'Included by default' },
          { id: 'all', label: 'All packs' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-space-sm py-1 text-label-md font-semibold transition-colors ${
              tab === t.id
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-base hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {flash && <p className="text-label-md text-sage-accent">{flash}</p>}
      {error && <p className="text-label-md text-status-error">{error}</p>}

      <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
        {visible.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            status={packInstallStatus(pack, categories)}
            onAdd={handleAdd}
            busy={busyId === pack.id}
          />
        ))}
      </div>
    </div>
  )
}
