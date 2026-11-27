import Logo from '../ui/Logo'
import Icon from '../ui/Icon'

/** A small, static picture of the budget so the brand panel shows the product. Sample numbers only. */
function SamplePreview() {
  const rows = [
    ['Rent', '$1,450', 100],
    ['Groceries', '$212', 62],
    ['Gas', '$48', 35],
  ]
  return (
    <div className="mt-10 w-full max-w-sm rounded-xl border border-border-hairline bg-surface-base p-5" aria-hidden="true">
      <div className="flex items-center gap-2 text-label-md text-on-surface-variant">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Ready to assign
      </div>
      <div className="mt-1 text-[28px] font-medium leading-8 tracking-[-0.03em] text-on-surface">
        $640<span className="align-[0.42em] text-[0.58em] opacity-70">.00</span>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map(([name, amt, pct]) => (
          <li key={name}>
            <div className="flex justify-between text-label-md">
              <span className="text-on-surface">{name}</span>
              <span className="num text-on-surface-variant">{amt}</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Shared frame for sign-in and sign-up: brand panel on wide screens, form card. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-border-hairline bg-surface-container-low lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo size="lg" />
        <div className="relative max-w-md">
          <p className="font-display text-headline-xl font-semibold text-on-surface">
            Give every dollar a job.
          </p>
          <p className="mt-3 text-body-lg text-on-surface-variant">
            Plan the month, see what is safe to spend, and keep savings goals on track.
          </p>
          <ul className="mt-8 space-y-3 text-body-md text-on-surface-variant">
            {[
              ['account_balance_wallet', 'Envelope budgeting with Ready to Assign'],
              ['sync_alt', 'Bank sync or CSV import'],
              ['insights', 'Spending reports by category'],
            ].map(([icon, text]) => (
              <li key={icon} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-hairline bg-surface-base text-on-surface">
                  <Icon name={icon} className="text-[16px]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <SamplePreview />
        </div>
        <p className="relative text-label-md text-on-surface-variant">© PennyPig</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>
          <h1 className="font-display text-headline-lg text-on-surface">{title}</h1>
          {subtitle && <p className="mt-1.5 text-body-md text-on-surface-variant">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-center text-body-sm text-on-surface-variant">{footer}</p>}
        </div>
      </main>
    </div>
  )
}

export function FormError({ children }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-status-error/30 bg-status-error/10 px-3 py-2.5 text-body-sm text-status-error"
    >
      <Icon name="error" className="mt-px text-[16px]" />
      <span>{children}</span>
    </div>
  )
}
