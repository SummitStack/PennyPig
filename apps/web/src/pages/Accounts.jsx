import MainLayout from '../components/Layout/MainLayout'
import { useAccountStore } from '../store/accountStore'
import PlaidLinkButton from '../components/Accounts/PlaidLinkButton'
import AccountCard from '../components/Accounts/AccountCard'

export default function AccountsPage() {
  const linkedAccounts = useAccountStore(state => state.linkedAccounts)
  const totalBalance = linkedAccounts.reduce((sum, acc) => sum + acc.balance, 0)

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-headline-lg font-bold text-on-surface">Accounts</h1>
            <p className="text-body-md text-on-surface-variant mt-2">Connected bank accounts</p>
          </div>
          <PlaidLinkButton />
        </div>

        {/* Total Balance */}
        <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
          <p className="text-label-md text-on-surface-variant uppercase tracking-wide">Total Balance</p>
          <p className={`text-headline-lg font-bold mt-2 ${totalBalance >= 0 ? 'text-status-success' : 'text-status-error'}`}>
            ${totalBalance.toFixed(2)}
          </p>
          <p className="text-body-sm text-on-surface-variant mt-2">Across {linkedAccounts.length} account{linkedAccounts.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Accounts Grid */}
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface mb-4">Connected Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {linkedAccounts.map(account => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>

          {linkedAccounts.length === 0 && (
            <div className="bg-surface-container rounded-lg p-8 text-center border border-border-hairline">
              <p className="text-body-md text-on-surface-variant">No accounts connected yet</p>
              <p className="text-body-sm text-on-surface-variant mt-2">Click "Connect Account" to link your bank accounts</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-surface-container rounded-lg p-6 border border-border-hairline">
          <h3 className="text-headline-sm font-bold text-on-surface">How it works</h3>
          <ul className="text-body-md text-on-surface-variant mt-3 space-y-2 list-disc list-inside">
            <li>Connect accounts securely using Plaid</li>
            <li>Transactions sync automatically after connection</li>
            <li>Your data never leaves the secure connection</li>
            <li>Remove accounts anytime to disconnect</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  )
}
