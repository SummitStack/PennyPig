import MainLayout from '../components/Layout/MainLayout'
import { useAccountStore } from '../store/accountStore'
import PlaidLinkButton from '../components/Accounts/PlaidLinkButton'
import AccountCard from '../components/Accounts/AccountCard'
import Icon from '../components/ui/Icon'

export default function AccountsPage() {
  const linkedAccounts = useAccountStore((state) => state.linkedAccounts)
  const totalBalance = linkedAccounts.reduce((sum, acc) => {
    const balance = Number(acc.balance) || 0
    return acc.type === 'credit' ? sum - Math.abs(balance) : sum + balance
  }, 0)

  return (
    <MainLayout>
      <div className="flex flex-col gap-space-xl">
        <div className="flex flex-col justify-between gap-space-lg sm:flex-row sm:items-start">
          <div>
            <h1 className="text-headline-lg font-bold text-on-surface">Accounts</h1>
            <p className="mt-space-sm text-body-md text-on-surface-variant">
              Connected bank accounts
            </p>
          </div>
          <PlaidLinkButton />
        </div>

        <div className="rounded-xl border border-border-hairline bg-surface-base p-space-lg shadow-sm">
          <p className="text-label-md uppercase tracking-wide text-on-surface-variant">
            Net across accounts
          </p>
          <p
            className={`mt-space-sm text-headline-lg font-bold ${
              totalBalance >= 0 ? 'text-status-success' : 'text-status-error'
            }`}
          >
            ${totalBalance.toFixed(2)}
          </p>
          <p className="mt-space-sm text-body-sm text-on-surface-variant">
            Across {linkedAccounts.length} account{linkedAccounts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div>
          <h2 className="mb-space-md text-headline-sm font-bold text-on-surface">
            Connected Accounts
          </h2>
          <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
            {linkedAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>

          {linkedAccounts.length === 0 && (
            <div className="rounded-xl border border-border-hairline bg-surface-base p-space-xl text-center">
              <Icon name="account_balance" className="mb-space-md text-[32px] text-on-surface-variant" />
              <p className="text-body-md text-on-surface-variant">No accounts connected yet</p>
              <p className="mt-space-sm text-body-sm text-on-surface-variant">
                Click Connect Account to link your bank accounts
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
