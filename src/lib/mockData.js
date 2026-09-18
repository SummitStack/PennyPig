export const mockTransactions = [
  {
    id: '1',
    date: new Date(2026, 8, 15),
    merchant: 'Whole Foods',
    amount: 87.43,
    category: 'Groceries',
    account: 'Amex',
    status: 'posted'
  },
  {
    id: '2',
    date: new Date(2026, 8, 14),
    merchant: 'Amazon',
    amount: 52.99,
    category: 'Shopping',
    account: 'MasterCard',
    status: 'posted'
  },
  {
    id: '3',
    date: new Date(2026, 8, 13),
    merchant: 'Starbucks',
    amount: 6.45,
    category: 'Coffee',
    account: 'MasterCard',
    status: 'posted'
  },
  {
    id: '4',
    date: new Date(2026, 8, 12),
    merchant: 'Rent Transfer',
    amount: 1500.00,
    category: 'Rent',
    account: 'Bank',
    status: 'posted'
  },
  {
    id: '5',
    date: new Date(2026, 8, 11),
    merchant: 'Netflix',
    amount: 15.99,
    category: 'Subscriptions',
    account: 'Amex',
    status: 'posted'
  },
  {
    id: '6',
    date: new Date(2026, 8, 10),
    merchant: 'Shell Gas',
    amount: 62.37,
    category: 'Gas',
    account: 'MasterCard',
    status: 'posted'
  },
  {
    id: '7',
    date: new Date(2026, 8, 9),
    merchant: 'Restaurant XYZ',
    amount: 89.23,
    category: 'Dining',
    account: 'Amex',
    status: 'posted'
  },
  {
    id: '8',
    date: new Date(2026, 8, 8),
    merchant: 'Target',
    amount: 124.56,
    category: 'Shopping',
    account: 'MasterCard',
    status: 'pending'
  }
]

export const mockCategories = [
  { id: 'groceries', name: 'Groceries', color: '#4ade80', type: 'expense' },
  { id: 'shopping', name: 'Shopping', color: '#fbbf24', type: 'expense' },
  { id: 'coffee', name: 'Coffee', color: '#7bd0ff', type: 'expense' },
  { id: 'rent', name: 'Rent', color: '#f87171', type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', color: '#c084fc', type: 'expense' },
  { id: 'gas', name: 'Gas', color: '#fb923c', type: 'expense' },
  { id: 'dining', name: 'Dining', color: '#f472b6', type: 'expense' },
  { id: 'salary', name: 'Salary', color: '#4ade80', type: 'income' }
]

export const mockAccounts = [
  { id: 'amex', name: 'American Express', type: 'credit', balance: 3245.67 },
  { id: 'mastercard', name: 'MasterCard', type: 'credit', balance: 1892.34 },
  { id: 'bank', name: 'Chase Checking', type: 'debit', balance: 12456.89 }
]
