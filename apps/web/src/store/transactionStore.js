import { create } from 'zustand'
import { mockTransactions, mockCategories, mockAccounts } from '../lib/mockData'

export const useTransactionStore = create((set, get) => ({
  transactions: mockTransactions,
  categories: mockCategories,
  accounts: mockAccounts,
  filter: {
    search: '',
    category: null,
    accountId: null,
    dateFrom: null,
    dateTo: null,
    status: null,
  },

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),

  categorizeTransaction: (transactionId, categoryId) =>
    set((state) => {
      const category = state.categories.find((c) => c.id === categoryId)
      return {
        transactions: state.transactions.map((t) =>
          t.id === transactionId
            ? {
                ...t,
                categoryId,
                category: category?.name || t.category,
              }
            : t
        ),
      }
    }),

  getFilteredTransactions: () => {
    const state = get()
    const { search, category, accountId, dateFrom, dateTo, status } = state.filter

    return state.transactions
      .filter((t) => {
        if (search && !t.merchant.toLowerCase().includes(search.toLowerCase())) {
          return false
        }
        if (category && t.category !== category) {
          return false
        }
        if (accountId && t.accountId !== accountId) {
          return false
        }
        if (status && t.status !== status) {
          return false
        }
        if (dateFrom) {
          const from = new Date(dateFrom)
          if (new Date(t.date) < from) return false
        }
        if (dateTo) {
          const to = new Date(dateTo)
          to.setHours(23, 59, 59, 999)
          if (new Date(t.date) > to) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  },
}))
