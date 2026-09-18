import MainLayout from '../components/Layout/MainLayout'

export default function AccountsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-headline-lg font-bold text-on-surface">Accounts</h1>
            <p className="text-body-md text-on-surface-variant mt-2">Connected bank accounts</p>
          </div>
          <button className="px-6 py-2 bg-primary text-surface rounded font-medium hover:opacity-90">
            + Connect Account
          </button>
        </div>

        {/* Accounts list */}
        <div className="grid gap-6">
          <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">Connected Accounts</h3>
              </div>
              <button className="text-body-sm text-primary hover:underline">Sync Now</button>
            </div>
            <p className="text-body-md text-on-surface-variant">Placeholder: List of connected accounts coming soon</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
