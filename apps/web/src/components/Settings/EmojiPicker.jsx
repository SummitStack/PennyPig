import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EMOJI_CATEGORIES,
  getRecentEmojis,
  pushRecentEmoji,
} from '../../lib/categories'
import Icon from '../ui/Icon'

/**
 * Android-style emoji picker: category tabs, search, and recently used.
 */
export default function EmojiPicker({ value, onChange, onClose }) {
  const [tab, setTab] = useState('money')
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState([])
  const searchRef = useRef(null)

  useEffect(() => {
    setRecent(getRecentEmojis())
    searchRef.current?.focus()
  }, [])

  const catalog = useMemo(
    () =>
      EMOJI_CATEGORIES.map((cat) =>
        cat.id === 'recent'
          ? {
              ...cat,
              emojis: recent.map((e) => ({ e, n: 'recent' })),
            }
          : cat
      ),
    [recent]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const active = catalog.find((c) => c.id === tab) || catalog[1]
      return active?.emojis || []
    }
    return catalog
      .filter((c) => c.id !== 'recent')
      .flatMap((c) => c.emojis)
      .filter((item) => item.n.includes(q) || item.e.includes(q))
  }, [catalog, query, tab])

  const handlePick = (emoji) => {
    pushRecentEmoji(emoji)
    setRecent(getRecentEmojis())
    onChange(emoji)
  }

  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-border-hairline bg-surface-container-high shadow-lg"
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="flex items-center gap-2 border-b border-border-hairline px-space-sm py-space-sm">
        <Icon name="search" className="text-[18px] text-on-surface-variant" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji"
          className="min-w-0 flex-1 bg-transparent text-body-sm text-on-surface outline-none placeholder:text-on-surface-variant"
          aria-label="Search emoji"
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            aria-label="Close emoji picker"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        )}
      </div>

      {!query && (
        <div
          className="flex gap-0.5 overflow-x-auto border-b border-border-hairline px-1 py-1"
          role="tablist"
          aria-label="Emoji categories"
        >
          {catalog.map((cat) => {
            if (cat.id === 'recent' && recent.length === 0) return null
            const active = tab === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={cat.label}
                onClick={() => setTab(cat.id)}
                className={`flex h-9 min-w-9 flex-1 items-center justify-center rounded-lg text-lg transition-colors ${
                  active
                    ? 'bg-primary/20 text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span aria-hidden>{cat.icon}</span>
                <span className="sr-only">{cat.label}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="max-h-52 overflow-y-auto p-space-sm">
        {filtered.length === 0 ? (
          <p className="py-space-md text-center text-body-sm text-on-surface-variant">
            No emoji match
          </p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-9">
            {filtered.map((item) => (
              <button
                key={`${item.e}-${item.n}`}
                type="button"
                title={item.n}
                onClick={() => handlePick(item.e)}
                className={`flex h-9 w-full items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-surface-container active:scale-95 ${
                  value === item.e ? 'bg-primary/25 ring-1 ring-primary' : ''
                }`}
                aria-label={item.n}
                aria-pressed={value === item.e}
              >
                {item.e}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border-hairline px-space-sm py-1.5 text-label-sm text-on-surface-variant">
        <span>{query ? 'Search results' : catalog.find((c) => c.id === tab)?.label}</span>
        <span className="text-lg leading-none" aria-hidden>
          {value || '📁'}
        </span>
      </div>
    </div>
  )
}
