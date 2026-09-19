import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()
  const signOut = useAuthStore((state) => state.signOut)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-surface">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-surface-container border-r border-border-hairline transition-all duration-200 flex flex-col`}>
        <div className="p-6 border-b border-border-hairline flex items-center justify-between">
          <span className={`text-headline-sm font-bold text-on-surface ${!sidebarOpen && 'hidden'}`}>
            PennyPig
          </span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-surface-container-high rounded"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink to="/" open={sidebarOpen} label="Dashboard" icon="📊" />
          <NavLink to="/transactions" open={sidebarOpen} label="Transactions" icon="💳" />
          <NavLink to="/budgets" open={sidebarOpen} label="Budgets" icon="💰" />
          <NavLink to="/accounts" open={sidebarOpen} label="Accounts" icon="🏦" />
          <NavLink to="/settings" open={sidebarOpen} label="Settings" icon="⚙️" />
        </nav>

        <div className="p-4 border-t border-border-hairline">
          <button
            onClick={handleSignOut}
            className="w-full py-2 px-4 bg-primary text-surface rounded text-body-sm font-medium hover:opacity-90"
          >
            {sidebarOpen ? 'Sign Out' : '↓'}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function NavLink({ to, label, icon, open }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-2 rounded hover:bg-surface-container-high text-on-surface transition-colors"
    >
      <span className="text-xl">{icon}</span>
      {open && <span className="text-body-md">{label}</span>}
    </Link>
  )
}
