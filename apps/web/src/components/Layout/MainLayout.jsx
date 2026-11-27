import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'
import { useTheme } from '../../lib/theme'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'
import { PageSkeleton } from '../ui/Skeleton'

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: 'space_dashboard', end: true },
  { to: '/budgets', label: 'Budget', short: 'Budget', icon: 'account_balance_wallet' },
  { to: '/transactions', label: 'Transactions', short: 'Activity', icon: 'receipt_long' },
  { to: '/accounts', label: 'Accounts', short: 'Accounts', icon: 'account_balance' },
  { to: '/reports', label: 'Reports', short: 'Reports', icon: 'insights' },
]

function isActive(pathname, item) {
  return item.end
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Last bank sync, and whether it's over a day old. */
function syncStatus(accounts) {
  const times = accounts
    .map((a) => a.lastSynced)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
  if (times.length === 0) return null
  const latest = new Date(Math.max(...times))
  return {
    label: latest.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    stale: Date.now() - latest.getTime() > DAY_MS,
  }
}

/** SPA nav that won't fight Next.js full document loads on <a href>. */
function AppNavLink({ to, className = '', children, ...rest }) {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        if (location.pathname !== to) navigate(to)
      }}
      className={className}
      {...rest}
    >
      {children}
    </a>
  )
}

function UserMenu({ placement = 'down' }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const [theme, setTheme] = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const email = user?.email || ''
  const initial = (email[0] || '?').toUpperCase()

  const go = (to) => {
    setOpen(false)
    navigate(to)
  }

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/login')
  }

  const pos =
    placement === 'up' ? 'bottom-full left-0 mb-2 w-full' : 'right-0 top-full mt-2 w-64'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={
          placement === 'up'
            ? 'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-container'
            : 'flex h-9 w-9 items-center justify-center rounded-full'
        }
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cool-blue text-label-md font-bold text-white">
          {initial}
        </span>
        {placement === 'up' && (
          <>
            <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">{email}</span>
            <Icon name="unfold_more" className="text-[18px] text-on-surface-variant" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-[70] ${pos} animate-pop-in overflow-hidden rounded-xl border border-border-hairline bg-surface-base p-1.5 shadow-pop`}
        >
          <div className="px-2.5 py-2">
            <p className="eyebrow">Signed in as</p>
            <p className="mt-0.5 truncate text-body-sm text-on-surface">{email}</p>
          </div>
          <div className="my-1 h-px bg-border-hairline" />
          <button
            type="button"
            role="menuitem"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-on-surface hover:bg-surface-container"
          >
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} className="text-[18px] text-on-surface-variant" />
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => go('/settings')}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-on-surface hover:bg-surface-container"
          >
            <Icon name="settings" className="text-[18px] text-on-surface-variant" />
            Settings
          </button>
          <div className="my-1 h-px bg-border-hairline" />
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-status-error hover:bg-status-error/10"
          >
            <Icon name="logout" className="text-[18px]" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function MainLayout({ children }) {
  const location = useLocation()
  const accounts = useAccountStore((state) => state.linkedAccounts)
  const bankIssues = useAccountStore((state) => state.bankIssues)
  const sync = syncStatus(accounts)
  const needsAttention = Boolean(sync?.stale) || (bankIssues || []).some((b) => b.needsReconnect)
  const settingsActive = location.pathname.startsWith('/settings')
  // Until the first load finishes, show placeholders rather than pages that
  // would read as empty ("No transactions here yet", $0 to assign).
  const dataReady = useAuthStore((state) => state.dataReady)

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border-hairline bg-surface-container-low px-3 py-5 lg:flex">
        <AppNavLink to="/" className="mb-8 px-2">
          <Logo />
        </AppNavLink>
        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Main">
          {[...NAV, { to: '/settings', label: 'Settings', icon: 'settings' }].map((item) => {
            const active = isActive(location.pathname, item)
            return (
              <AppNavLink
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-body-md transition-colors ${
                  active
                    ? 'bg-surface-base font-semibold text-on-surface shadow-card ring-1 ring-border-hairline'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <Icon
                  name={item.icon}
                  filled={active}
                  className={`text-[20px] ${active ? 'text-primary' : ''}`}
                />
                {item.label}
              </AppNavLink>
            )
          })}
        </nav>
        {sync &&
          (needsAttention ? (
            <AppNavLink
              to="/accounts"
              className="mb-3 flex items-center gap-1.5 rounded-lg bg-status-warning/10 px-2.5 py-1.5 text-label-md text-status-warning hover:bg-status-warning/15"
              title="Your banks haven't synced in over a day. Open Accounts to sync or reconnect."
              data-testid="sync-stale"
            >
              <Icon name="sync_problem" className="text-[14px]" />
              <span>
                Synced {sync.label}
                <span className="block font-semibold">Reconnect</span>
              </span>
            </AppNavLink>
          ) : (
            <p className="mb-3 flex items-center gap-1.5 px-2.5 text-label-md text-on-surface-variant">
              <Icon name="sync" className="text-[14px]" />
              Synced {sync.label}
            </p>
          ))}
        <div className="border-t border-border-hairline pt-3">
          <UserMenu placement="up" />
        </div>
      </aside>

      {/* Mobile and tablet top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-hairline bg-surface/85 px-4 backdrop-blur-md lg:hidden">
        <AppNavLink to="/">
          <Logo />
        </AppNavLink>
        <div className="flex items-center gap-1">
          <AppNavLink
            to="/settings"
            aria-label="Settings"
            aria-current={settingsActive ? 'page' : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-container ${
              settingsActive ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <Icon name="settings" className="text-[20px]" />
          </AppNavLink>
          <UserMenu />
        </div>
      </header>

      <main className="lg:pl-60">
        <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">
          {dataReady ? children : <PageSkeleton />}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-hairline bg-surface-base/90 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(location.pathname, item)
            return (
              <AppNavLink
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  active ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-primary/15' : ''
                  }`}
                >
                  <Icon name={item.icon} filled={active} className="text-[22px]" />
                </span>
                {item.short}
              </AppNavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
