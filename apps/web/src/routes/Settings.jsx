import { Link } from 'react-router-dom'
import MainLayout from '../components/Layout/MainLayout'
import Icon from '../components/ui/Icon'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../lib/theme'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const [theme, setTheme] = useTheme()

  return (
    <MainLayout>
      <div className="max-w-3xl space-y-5">
        <div>
          <p className="eyebrow">You</p>
          <h1 className="mt-1 font-display text-headline-lg text-on-surface">Settings</h1>
        </div>

        <SettingsSection icon="palette" title="Appearance">
          <div className="inline-flex rounded-xl border border-border-hairline bg-surface-container p-1" role="radiogroup" aria-label="Theme">
            {[
              ['light', 'Light', 'light_mode'],
              ['dark', 'Dark', 'dark_mode'],
            ].map(([value, label, icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-body-sm font-medium transition-colors ${
                  theme === value ? 'bg-surface-base text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon name={icon} className="text-[18px]" />
                {label}
              </button>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection icon="category" title="Categories">
          <p className="text-body-sm text-on-surface-variant">
            Categories live on the{' '}
            <Link to="/budgets" className="font-semibold text-primary hover:underline">
              Budget
            </Link>{' '}
            page. Tap the pencil next to Category to add, rename, reorder or set an emoji, then Save.
          </p>
        </SettingsSection>

        <SettingsSection icon="rule" title="Rules">
          <p className="text-body-sm text-on-surface-variant">
            Rules file new transactions by payee, mark gig pay, and can hold income for next month.{' '}
            <Link to="/rules" className="font-semibold text-primary hover:underline">
              Manage rules
            </Link>
          </p>
        </SettingsSection>

        <SettingsSection icon="person" title="Account">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-label-md text-on-surface-variant">Signed in as</p>
              <p className="text-body-md font-medium text-on-surface">{user?.email}</p>
            </div>
            <button type="button" onClick={signOut} className="btn btn-secondary">
              <Icon name="logout" className="text-[18px]" />
              Sign out
            </button>
          </div>
        </SettingsSection>
      </div>
    </MainLayout>
  )
}

function SettingsSection({ icon, title, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name={icon} className="text-[18px]" />
        </span>
        <h2 className="font-display text-headline-sm text-on-surface">{title}</h2>
      </div>
      {children}
    </section>
  )
}
