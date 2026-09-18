import { create } from 'zustand'

const currentMonth = new Date().toISOString().slice(0, 7)

export const useBudgetStore = create((set, get) => ({
  currentMonth,
  budgets: {
    [currentMonth]: {
      'Living': 1200,
      'Food & Dining': 600,
      'Transportation': 400,
      'Entertainment': 300,
      'Savings Goals': 800
    }
  },
  spending: {
    [currentMonth]: {
      'Living': 892,
      'Food & Dining': 521,
      'Transportation': 434,
      'Entertainment': 0,
      'Savings Goals': 0
    }
  },
  expandedCategories: new Set(['Living', 'Food & Dining']),

  setBudget: (categoryName, amount) => set((state) => ({
    budgets: {
      ...state.budgets,
      [state.currentMonth]: {
        ...state.budgets[state.currentMonth],
        [categoryName]: amount
      }
    }
  })),

  updateBudget: (categoryName, subcategoryName, amount) => set((state) => ({
    budgets: {
      ...state.budgets,
      [state.currentMonth]: {
        ...state.budgets[state.currentMonth],
        [categoryName]: amount
      }
    }
  })),

  toggleCategory: (categoryName) => set((state) => {
    const newExpanded = new Set(state.expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    return { expandedCategories: newExpanded }
  }),

  getCategoryStatus: (categoryName) => {
    const state = get()
    const budgeted = state.budgets[state.currentMonth]?.[categoryName] || 0
    const spent = state.spending[state.currentMonth]?.[categoryName] || 0
    if (spent > budgeted) return { status: 'over' }
    if (spent < budgeted * 0.5) return { status: 'under' }
    return { status: 'even' }
  },

  getTotalSpent: () => {
    const state = get()
    return Object.values(state.spending[state.currentMonth] || {}).reduce((sum, val) => sum + val, 0)
  },

  getTotalBudgeted: () => {
    const state = get()
    return Object.values(state.budgets[state.currentMonth] || {}).reduce((sum, val) => sum + val, 0)
  },

  getTotalActivity: () => {
    const state = get()
    return Object.values(state.spending[state.currentMonth] || {}).reduce((sum, val) => sum + val, 0)
  },

  getReadyToAssign: (income = 5000) => {
    return income - get().getTotalBudgeted()
  },

  getCategories: () => {
    return get().budgets[get().currentMonth] || {}
  }
}))
