import { create } from 'zustand'

const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

const mockBudgets = {
  [currentMonth]: {
    Groceries: 600,
    'Shopping': 300,
    'Coffee': 150,
    'Dining': 400,
    'Gas': 200,
    'Subscriptions': 50
  }
}

const mockSpending = {
  [currentMonth]: {
    Groceries: 87.43,
    'Shopping': 177.55,
    'Coffee': 6.45,
    'Rent': 1500.00,
    'Dining': 89.23,
    'Gas': 62.37,
    'Subscriptions': 15.99
  }
}

export const useBudgetStore = create((set, get) => ({
  budgets: mockBudgets,
  spending: mockSpending,
  currentMonth,

  setBudget: (category, amount) => set((state) => ({
    budgets: {
      ...state.budgets,
      [state.currentMonth]: {
        ...state.budgets[state.currentMonth],
        [category]: amount
      }
    }
  })),

  getTotalBudgeted: () => {
    const state = get()
    const budgets = state.budgets[state.currentMonth] || {}
    return Object.values(budgets).reduce((sum, val) => sum + val, 0)
  },

  getTotalSpent: () => {
    const state = get()
    const spending = state.spending[state.currentMonth] || {}
    return Object.values(spending).reduce((sum, val) => sum + val, 0)
  },

  getReadyToAssign: (income = 5000) => {
    return income - get().getTotalBudgeted()
  },

  getCategoryStatus: (category) => {
    const state = get()
    const budgeted = state.budgets[state.currentMonth]?.[category] || 0
    const spent = state.spending[state.currentMonth]?.[category] || 0
    const remaining = budgeted - spent
    
    if (remaining > 0) return { status: 'under', amount: remaining }
    if (remaining === 0) return { status: 'even', amount: 0 }
    return { status: 'over', amount: Math.abs(remaining) }
  }
}))
