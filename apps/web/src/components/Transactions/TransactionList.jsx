import { useMemo } from 'react'
import { useTransactionStore } from '../../store/transactionStore'

export default function TransactionList() {
  const transactions = useTransactionStore((state) => state.transactions)
  const filter = useTransactionStore((state) => state.filter)
  const categories = useTransactionStore((state) => state.categories)
  const categorizeTransaction = useTransactionStore((state) => state.categorizeTransaction)

  const filtered = useMemo(() => {
    return useTransactionStore.getState().getFilteredTransactions()
  }, [transactions, filter])

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-surface-container border-b border-border-hairline">
          <tr>
            <th className="px-6 py-3 text-left text-label-md text-on-surface-variant">Date</th>
            <th className="px-6 py-3 text-left text-label-md text-on-surface-variant">Merchant</th>
            <th className="px-6 py-3 text-left text-label-md text-on-surface-variant">Category</th>
            <th className="px-6 py-3 text-left text-label-md text-on-surface-variant">Account</th>
            <th className="px-6 py-3 text-right text-label-md text-on-surface-variant">Amount</th>
            <th className="px-6 py-3 text-center text-label-md text-on-surface-variant">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((transaction) => {
            const selectedCategoryId =
              transaction.categoryId ||
              categories.find((c) => c.name === transaction.category)?.id ||
              ''

            return (
              <tr
                key={transaction.id}
                className="border-b border-border-hairline hover:bg-surface-container-high transition-colors"
              >
                <td className="px-6 py-4 text-body-sm text-on-surface">
                  {new Date(transaction.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-body-sm text-on-surface font-medium">
                  {transaction.merchant}
                </td>
                <td className="px-6 py-4">
                  <select
                    className="px-3 py-1 bg-surface border border-border-hairline rounded text-body-sm text-on-surface cursor-pointer"
                    value={selectedCategoryId}
                    onChange={(e) => categorizeTransaction(transaction.id, e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-body-sm text-on-surface">{transaction.account}</td>
                <td className="px-6 py-4 text-right text-body-sm font-medium text-on-surface">
                  ${transaction.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`text-label-md px-3 py-1 rounded ${
                      transaction.status === 'posted'
                        ? 'bg-status-success bg-opacity-10 text-status-success'
                        : 'bg-status-warning bg-opacity-10 text-status-warning'
                    }`}
                  >
                    {transaction.status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
