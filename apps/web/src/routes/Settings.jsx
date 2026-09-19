import { Link } from 'react-router-dom'
import MainLayout from '../components/Layout/MainLayout'

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Settings</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Account and app preferences
          </p>
        </div>

        <div className="space-y-4">
          <SettingsSection title="Categories" description="Managed on the budget page">
            <p className="text-body-md text-on-surface-variant">
              Add, edit, reorder, and emoji-tag categories directly in{' '}
              <Link to="/budgets" className="font-semibold text-primary hover:underline">
                Budget &amp; Allocation
              </Link>
              . Use the pencil next to the Category heading to unlock editing, then
              drag the ☰ handle to reorder or move between groups.
            </p>
          </SettingsSection>

          <SettingsSection title="Account" description="Email and password">
            <p className="text-body-md text-on-surface-variant">
              Account profile editing is coming soon.
            </p>
          </SettingsSection>

          <SettingsSection title="Preferences" description="App preferences">
            <p className="text-body-md text-on-surface-variant">
              Display preferences are coming soon.
            </p>
          </SettingsSection>
        </div>
      </div>
    </MainLayout>
  )
}

function SettingsSection({ title, description, children }) {
  return (
    <div className="rounded-xl border border-border-hairline bg-surface-container p-6">
      <h2 className="text-headline-sm font-bold text-on-surface">{title}</h2>
      <p className="mt-1 text-body-sm text-on-surface-variant">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}
