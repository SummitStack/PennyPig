import { useMemo, useState } from 'react'
import {
  BUCKETS,
  CATEGORY_PACKS,
  getPacksForBucket,
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
            {partial ? 'Add missing' : 'Add parent group'}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Browse category ideas by Fixed / Variable / Savings buckets.
 */
export default function CategoryPacksPanel({ onCustom, onClose }) {
  const categories = useTransactionStore((state) => state.categories)
  const addCategoryPack = useTransactionStore((state) => state.addCategoryPack)
  const [busyId, setBusyId] = useState(null)
  const [flash, setFlash] = useState(null)
  const [error, setError] = useState(null)
  const [bucketId, setBucketId] = useState('fixed')

  const packs = useMemo(() => getPacksForBucket(bucketId), [bucketId])
  const activeBucket = BUCKETS.find((b) => b.id === bucketId)

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
        : `Added ${result.added} categor${result.added === 1 ? 'y' : 'ies'} to ${pack.name}`
    )
  }

  const handleAddBucket = async () => {
    setError(null)
    setFlash(null)
    let total = 0
    for (const pack of packs) {
      const status = packInstallStatus(pack, categories)
      if (status.fullyInstalled) continue
      setBusyId(pack.id)
      const result = await addCategoryPack(pack)
      if (!result.success) {
        setBusyId(null)
        setError(result.error || `Failed on ${pack.name}`)
        return
      }
      total += result.added || 0
    }
    setBusyId(null)
    setFlash(
      total === 0
        ? `All ${activeBucket?.name || 'packs'} already added`
        : `Added ${total} categor${total === 1 ? 'y' : 'ies'} in ${activeBucket?.name}`
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
            Organized into fixed expenses, variable expenses, and savings goals.
            Each card is a parent group — its chips are subcategories. Your
            existing budget categories stay as-is; adding a pack only fills in
            what’s missing.
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

      <div className="flex flex-wrap items-center gap-1 border-b border-border-hairline pb-2">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBucketId(b.id)}
            className={`rounded-lg px-space-sm py-1.5 text-label-md font-semibold transition-colors ${
              bucketId === b.id
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-base hover:text-on-surface'
            }`}
          >
            <span aria-hidden>{b.emoji}</span> {b.name}
          </button>
        ))}
        <button
          type="button"
          disabled={Boolean(busyId)}
          onClick={handleAddBucket}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-surface-base px-space-sm py-1.5 text-label-md font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          <Icon name="playlist_add" className="text-[14px]" />
          Add all in {activeBucket?.name || 'bucket'}
        </button>
      </div>

      {activeBucket && (
        <p className="text-label-md text-on-surface-variant">
          {activeBucket.description}
        </p>
      )}

      {flash && <p className="text-label-md text-sage-accent">{flash}</p>}
      {error && <p className="text-label-md text-status-error">{error}</p>}

      <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
        {packs.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            status={packInstallStatus(pack, categories)}
            onAdd={handleAdd}
            busy={busyId === pack.id}
          />
        ))}
        {packs.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">
            No packs in this bucket.
          </p>
        )}
      </div>

      <p className="text-label-sm text-on-surface-variant">
        {CATEGORY_PACKS.length} parent groups available across all buckets.
      </p>
    </div>
  )
}
