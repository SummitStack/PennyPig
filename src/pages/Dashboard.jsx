import MainLayout from '../components/Layout/MainLayout'

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Dashboard</h1>
          <p className="text-body-md text-on-surface-variant mt-2">Overview of your finances</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Total Balance" value="$12,345.67" trend="+2.5%" />
          <MetricCard title="This Month Spent" value="$1,234.56" trend="-5%" />
          <MetricCard title="Budget Health" value="78%" trend="On track" />
        </div>

        {/* Recent Transactions */}
        <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
          <h2 className="text-headline-sm font-bold text-on-surface mb-4">Recent Transactions</h2>
          <p className="text-body-md text-on-surface-variant">Placeholder: Transaction list coming soon</p>
        </div>

        {/* Budget Overview */}
        <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
          <h2 className="text-headline-sm font-bold text-on-surface mb-4">Budget Overview</h2>
          <p className="text-body-md text-on-surface-variant">Placeholder: Budget categories coming soon</p>
        </div>
      </div>
    </MainLayout>
  )
}

function MetricCard({ title, value, trend }) {
  return (
    <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
      <p className="text-label-md text-on-surface-variant uppercase tracking-wide">{title}</p>
      <p className="text-headline-md font-bold text-on-surface mt-2">{value}</p>
      <p className="text-body-sm text-status-success mt-2">{trend}</p>
    </div>
  )
}
