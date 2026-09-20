import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'
import Icon from '../ui/Icon'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/budgets', label: 'Budget & Allocation' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

function formatSyncLabel(accounts) {
  const times = accounts
    .map((a) => a.lastSynced)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
  if (times.length === 0) return null
  const latest = new Date(Math.max(...times))
  return latest.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** SPA nav that won't fight Next.js full document loads on <a href>. */
function AppNavLink({ to, end = false, className = '', children, ...rest }) {
  const navigate = useNavigate()
  const location = useLocation()
  const active = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`)

  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        if (location.pathname !== to) navigate(to)
      }}
      className={`relative z-10 cursor-pointer ${active ? 'font-semibold text-on-surface' : ''} ${className}`}
      aria-current={active ? 'page' : undefined}
      {...rest}
    >
      {children}
    </a>
  )
}

export default function MainLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const signOut = useAuthStore((state) => state.signOut)
  const accounts = useAccountStore((state) => state.linkedAccounts)
  const syncLabel = formatSyncLabel(accounts)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface">
      <header className="fixed top-0 z-50 w-full border-b border-border-hairline bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.2)]">
        <div className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between px-gutter">
          <div className="flex items-center gap-space-md">
            <AppNavLink to="/" end className="flex items-center gap-space-sm">
              <Icon name="savings" className="text-[24px] text-secondary" />
              <span className="font-headline-sm font-bold tracking-tight text-on-surface">
                PennyPig
              </span>
            </AppNavLink>
            <nav className="ml-space-lg hidden items-center gap-space-xs md:flex">
              {NAV.map((item) => (
                <AppNavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={`rounded-lg px-space-md py-space-sm text-sm transition-colors ${
                    (item.end
                      ? location.pathname === item.to
                      : location.pathname === item.to ||
                        location.pathname.startsWith(`${item.to}/`))
                      ? 'bg-surface-container-high'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  {item.label}
                </AppNavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-space-lg">
            {syncLabel && (
              <div className="hidden items-center gap-space-xs text-label-md text-on-surface-variant sm:flex">
                <Icon name="sync" className="text-[16px]" />
                <span>{syncLabel}</span>
              </div>
            )}
            <AppNavLink
              to="/settings"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-colors hover:text-on-surface"
              title="Settings"
              aria-label="Settings"
            >
              <Icon name="settings" className="text-[18px]" />
            </AppNavLink>
            <button
              type="button"
              onClick={handleSignOut}
              className="relative z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon name="person" className="text-[18px]" />
            </button>
          </div>
        </div>
        <nav className="relative z-10 flex gap-space-xs overflow-x-auto border-t border-border-hairline px-gutter py-2 md:hidden">
          {NAV.map((item) => (
            <AppNavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`whitespace-nowrap rounded-lg px-space-md py-space-sm text-sm ${
                (item.end
                  ? location.pathname === item.to
                  : location.pathname === item.to ||
                    location.pathname.startsWith(`${item.to}/`))
                  ? 'bg-surface-container-high'
                  : 'text-on-surface-variant'
              }`}
            >
              {item.label}
            </AppNavLink>
          ))}
        </nav>
      </header>

      <main className="min-h-[calc(100vh-4rem)] w-full bg-surface pt-[7.25rem] md:pt-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col px-gutter py-space-xl">
          {children}
        </div>
      </main>
    </div>
  )
}
