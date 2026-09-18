import { create } from 'zustand'
import { mockTransactions, mockCategories, mockAccounts } from '../lib/mockData'

export const useTransactionStore = create((set) => ({
  transactions: mockTransactions,
  categories: mockCategories,
  accounts: mockAccounts,
  filter: {
    search: '',
    category: null,
    account: null,
    dateFrom: null,
    dateTo: null,
    status: null
  },

  setFilter: (filter) => set((state) => ({
    filter: { ...state.filter, ...filter }
  })),

  categorizeTransaction: (transactionId, categoryId) => set((state) => ({
    transactions: state.transactions.map(t =>
      t.id === transactionId
        ? { ...t, category: state.categories.find(c => c.id === categoryId)?.name || t.category }
        : t
    )
  })),

  getFilteredTransactions: () => {
    const state = useTransactionStore.getState()
    return state.transactions.filter(t => {
      if (state.filter.search && !t.merchant.toLowerCase().includes(state.filter.search.toLowerCase())) {
        return false
      }
      if (state.filter.category && t.category !== state.filter.category) {
        return false
      }
      if (state.filter.account && t.account !== state.filter.account) {
        return false
      }
      if (state.filter.status && t.status !== state.filter.status) {
        return false
      }
      return true
    }).sort((a, b) => new Date(b.date) - new Date(a.date))
  }
}))
