import { useMemo } from 'react'
import { useTransactionStore } from '../../store/transactionStore'
import { buildCategoryTree, getLeafCategories } from '../../lib/categories'

export default function TransactionList() {
  const transactions = useTransactionStore((state) => state.transactions)
  const filter = useTransactionStore((state) => state.filter)
  const categories = useTransactionStore((state) => state.categories)
  const categorizeTransaction = useTransactionStore((state) => state.categorizeTransaction)

  const filtered = useMemo(() => {
    return useTransactionStore.getState().getFilteredTransactions()
  }, [transactions, filter])

  const expenseTree = buildCategoryTree(categories, 'expense')
  const incomeLeaves = getLeafCategories(categories, 'income')

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border-hairline bg-surface-container">
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
                className="border-b border-border-hairline transition-colors hover:bg-surface-container-high"
              >
                <td className="px-6 py-4 text-body-sm text-on-surface">
                  {new Date(transaction.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-body-sm font-medium text-on-surface">
                  {transaction.merchant}
                </td>
                <td className="px-6 py-4">
                  <select
                    className="cursor-pointer rounded border border-border-hairline bg-surface px-3 py-1 text-body-sm text-on-surface"
                    value={selectedCategoryId}
                    onChange={(e) => categorizeTransaction(transaction.id, e.target.value || null)}
                  >
                    <option value="">Uncategorized</option>
                    {expenseTree.map((root) =>
                      root.children.length > 0 ? (
                        <optgroup key={root.id} label={`${root.emoji} ${root.name}`}>
                          {root.children.map((child) => (
                            <option key={child.id} value={child.id}>
                              {child.emoji} {child.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        <option key={root.id} value={root.id}>
                          {root.emoji} {root.name}
                        </option>
                      )
                    )}
                    {incomeLeaves.length > 0 && (
                      <optgroup label="Income">
                        {incomeLeaves.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.emoji} {cat.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </td>
                <td className="px-6 py-4 text-body-sm text-on-surface">{transaction.account}</td>
                <td className="px-6 py-4 text-right text-body-sm font-medium text-on-surface">
                  ${transaction.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`rounded px-3 py-1 text-label-md ${
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
