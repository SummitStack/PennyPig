import { useState } from 'react'
import MainLayout from '../components/Layout/MainLayout'
import { useAccountStore } from '../store/accountStore'
import PlaidLinkButton from '../components/Accounts/PlaidLinkButton'
import AccountCard from '../components/Accounts/AccountCard'
import ManualAccountForm from '../components/Accounts/ManualAccountForm'
import CsvImportSection from '../components/Accounts/CsvImportSection'
import Icon from '../components/ui/Icon'
import { money } from '../lib/money'
import { accountNetContribution } from '../lib/reportMath'

export default function AccountsPage() {
  const linkedAccounts = useAccountStore((state) => state.linkedAccounts)
  const [showManualForm, setShowManualForm] = useState(false)

  const open = linkedAccounts.filter((a) => !a.closed)
  const closed = linkedAccounts.filter((a) => a.closed)
  const assets = open
    .map(accountNetContribution)
    .filter((n) => n > 0)
    .reduce((s, n) => s + n, 0)
  const debts = open
    .map(accountNetContribution)
    .filter((n) => n < 0)
    .reduce((s, n) => s + n, 0)
  const net = assets + debts

  return (
    <MainLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Money</p>
            <h1 className="mt-1 font-display text-headline-lg text-on-surface">Accounts</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowManualForm(true)} className="btn btn-secondary py-2.5">
              <Icon name="add" className="text-[18px]" />
              Add manually
            </button>
            <PlaidLinkButton />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            ['Net worth', net, net < 0 ? 'text-status-error' : 'text-on-surface'],
            ['Assets', assets, 'text-on-surface'],
            ['Debts', debts, debts < 0 ? 'text-status-error' : 'text-on-surface'],
          ].map(([label, value, tone]) => (
            <div key={label} className="card p-4 sm:p-5">
              <p className="text-label-md text-on-surface-variant">{label}</p>
              <p className={`num mt-1 font-display text-headline-sm sm:text-headline-lg ${tone}`}>
                {money(value)}
              </p>
            </div>
          ))}
        </div>

        {linkedAccounts.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cool-blue/10 text-cool-blue">
              <Icon name="account_balance" className="text-[24px]" />
            </span>
            <p className="mt-3 font-display text-headline-sm text-on-surface">No accounts yet</p>
            <p className="mt-1 max-w-sm text-body-sm text-on-surface-variant">
              Connect a bank, or add an account by hand with today's balance. That balance becomes money
              you can budget.
            </p>
            <button type="button" onClick={() => setShowManualForm(true)} className="btn btn-primary mt-4">
              Add an account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {open.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}

        {closed.length > 0 && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-body-sm font-medium text-on-surface-variant">
              <Icon name="chevron_right" className="text-[18px] transition-transform group-open:rotate-90" />
              {closed.length} closed account{closed.length === 1 ? '' : 's'}
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 opacity-80 md:grid-cols-2 xl:grid-cols-3">
              {closed.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </details>
        )}

        <CsvImportSection />
      </div>

      {showManualForm && <ManualAccountForm onClose={() => setShowManualForm(false)} />}
    </MainLayout>
  )
}
