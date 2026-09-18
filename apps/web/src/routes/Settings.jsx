import MainLayout from '../components/Layout/MainLayout'

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Settings</h1>
          <p className="text-body-md text-on-surface-variant mt-2">Manage your account</p>
        </div>

        {/* Settings sections */}
        <div className="space-y-4">
          <SettingsSection title="Account" description="Email and password">
            <p className="text-body-md text-on-surface-variant">Placeholder: Account settings coming soon</p>
          </SettingsSection>

          <SettingsSection title="Categories" description="Manage budget categories">
            <p className="text-body-md text-on-surface-variant">Placeholder: Category management coming soon</p>
          </SettingsSection>

          <SettingsSection title="Preferences" description="App preferences">
            <p className="text-body-md text-on-surface-variant">Placeholder: Preferences coming soon</p>
          </SettingsSection>
        </div>
      </div>
    </MainLayout>
  )
}

function SettingsSection({ title, description, children }) {
  return (
    <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
      <h2 className="text-headline-sm font-bold text-on-surface">{title}</h2>
      <p className="text-body-sm text-on-surface-variant mt-1">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}
