import Logo from '../ui/Logo'

/** Shared frame for sign-in and sign-up: brand panel on wide screens, form card. */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-border-hairline bg-surface-container-low lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-secondary/15 blur-3xl"
          aria-hidden="true"
        />
        <Logo size="lg" />
        <div className="relative max-w-md">
          <p className="font-display text-headline-xl text-on-surface">
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
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-base text-primary shadow-card">
                  <span className="material-symbols-rounded text-[18px]">{icon}</span>
                </span>
                {text}
              </li>
            ))}
          </ul>
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
      <span className="material-symbols-rounded text-[18px]">error</span>
      <span>{children}</span>
    </div>
  )
}
