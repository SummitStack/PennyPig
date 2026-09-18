import { useTransactionStore } from '../../store/transactionStore'

export default function TransactionList() {
  const transactions = useTransactionStore(state => state.getFilteredTransactions())
  const categories = useTransactionStore(state => state.categories)

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
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-border-hairline hover:bg-surface-container-high transition-colors">
              <td className="px-6 py-4 text-body-sm text-on-surface">
                {transaction.date.toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-body-sm text-on-surface font-medium">{transaction.merchant}</td>
              <td className="px-6 py-4">
                <select 
                  className="px-3 py-1 bg-surface border border-border-hairline rounded text-body-sm text-on-surface cursor-pointer"
                  value={transaction.category}
                  onChange={(e) => useTransactionStore.getState().categorizeTransaction(transaction.id, e.target.value)}
                >
                  <option value={transaction.category}>{transaction.category}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </td>
              <td className="px-6 py-4 text-body-sm text-on-surface">{transaction.account}</td>
              <td className="px-6 py-4 text-right text-body-sm font-medium text-on-surface">
                ${transaction.amount.toFixed(2)}
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`text-label-md px-3 py-1 rounded ${
                  transaction.status === 'posted' 
                    ? 'bg-status-success bg-opacity-10 text-status-success'
                    : 'bg-status-warning bg-opacity-10 text-status-warning'
                }`}>
                  {transaction.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
