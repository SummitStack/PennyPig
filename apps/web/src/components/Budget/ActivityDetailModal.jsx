import { formatMoney } from '../../lib/money'
import Icon from '../ui/Icon'

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

function formatSigned(n) {
  const v = Number(n) || 0
  if (v > 0) return `+${formatMoney(v)}`
  if (v < 0) return `-${formatMoney(Math.abs(v))}`
  return formatMoney(0)
}

export default function ActivityDetailModal({
  categoryName,
  monthLabel,
  lines,
  onClose,
}) {
  const total = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
  const signed = lines.some((l) => l.isBudgeted || Number(l.amount) < 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4">
      <div
        className="flex max-h-[min(90vh,32rem)] w-full max-w-lg flex-col rounded-xl border border-border-hairline bg-surface-base shadow-lg"
        role="dialog"
        aria-labelledby="activity-detail-title"
      >
        <div className="flex items-center justify-between border-b border-border-hairline px-space-md py-space-sm">
          <div>
            <h3 id="activity-detail-title" className="text-body-md font-bold text-on-surface">
              Activity · {categoryName}
            </h3>
            <p className="text-label-sm text-on-surface-variant">
              {signed
                ? `Budgeted funding and cleared activity in ${monthLabel}`
                : `Cleared transactions in ${monthLabel}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container"
            aria-label="Close"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-space-md py-space-sm">
          {lines.length === 0 ? (
            <p className="py-space-md text-center text-body-sm text-on-surface-variant">
              No activity in this category for {monthLabel}.
            </p>
          ) : (
            <table className="w-full border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-border-hairline text-left text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                  <th className="py-1.5 pr-2">Date</th>
                  <th className="py-1.5 pr-2">Payee</th>
                  <th className="py-1.5 pr-2">Category</th>
                  <th className="py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const amt = Number(line.amount) || 0
                  return (
                    <tr
                      key={line.id}
                      className="border-b border-border-hairline/60 text-on-surface"
                    >
                      <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums">
                        {line.isBudgeted ? '—' : formatDate(line.date)}
                      </td>
                      <td className="max-w-[10rem] truncate py-1.5 pr-2" title={line.payee}>
                        {line.payee}
                        {line.isSplit && (
                          <span className="ml-1 text-label-sm text-cool-blue">split</span>
                        )}
                        {line.isBudgeted && (
                          <span className="ml-1 text-label-sm text-sage-accent">funded</span>
                        )}
                      </td>
                      <td className="max-w-[7rem] truncate py-1.5 pr-2 text-on-surface-variant">
                        {line.categoryName}
                      </td>
                      <td
                        className={`py-1.5 text-right tabular-nums ${
                          amt > 0 && signed
                            ? 'text-status-success'
                            : amt < 0
                              ? 'text-on-surface'
                              : ''
                        }`}
                      >
                        {signed ? formatSigned(amt) : formatMoney(amt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border-hairline px-space-md py-space-sm">
          <span className="text-label-sm text-on-surface-variant">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
          <span className="text-body-sm font-bold tabular-nums text-on-surface">
            Total {signed ? formatSigned(total) : formatMoney(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
