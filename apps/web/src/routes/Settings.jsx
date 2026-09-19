import { useEffect } from 'react'
import MainLayout from '../components/Layout/MainLayout'
import CategoryManager from '../components/Settings/CategoryManager'
import { useTransactionStore } from '../store/transactionStore'

export default function SettingsPage() {
  const loadData = useTransactionStore((state) => state.loadData)
  const hydrated = useTransactionStore((state) => state.hydrated)

  useEffect(() => {
    if (!hydrated) loadData()
  }, [hydrated, loadData])

  return (
    <MainLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Settings</h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Manage categories and account preferences
          </p>
        </div>

        <div className="space-y-4">
          <SettingsSection
            title="Categories"
            description="Add groups and subcategories, pick emojis, or remove ones you do not need"
          >
            <CategoryManager />
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
