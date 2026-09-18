import { create } from 'zustand'

const currentMonth = new Date().toISOString().slice(0, 7)

const budgetData = {
  'Living': {
    budgeted: 1200,
    activity: 892,
    subcategories: {
      'Rent & Housing': { budgeted: 1000, activity: 1000 },
      'Utilities': { budgeted: 150, activity: 50 },
      'Internet': { budgeted: 50, activity: 42 }
    }
  },
  'Food & Dining': {
    budgeted: 600,
    activity: 521,
    subcategories: {
      'Groceries': { budgeted: 400, activity: 320 },
      'Restaurants': { budgeted: 200, activity: 201 }
    }
  },
  'Transportation': {
    budgeted: 400,
    activity: 434,
    subcategories: {
      'Gas': { budgeted: 200, activity: 234 },
      'Public Transit': { budgeted: 200, activity: 200 }
    }
  },
  'Entertainment': {
    budgeted: 300,
    activity: 0,
    subcategories: {
      'Streaming': { budgeted: 50, activity: 0 },
      'Movies': { budgeted: 100, activity: 0 },
      'Events': { budgeted: 150, activity: 0 }
    }
  },
  'Savings Goals': {
    budgeted: 800,
    activity: 0,
    subcategories: {
      'Emergency Fund': { budgeted: 500, activity: 0 },
      'Vacation': { budgeted: 300, activity: 0 }
    }
  }
}

export const useBudgetStore = create((set, get) => ({
  currentMonth,
  budgets: { [currentMonth]: budgetData },
  spending: { [currentMonth]: {} },
  expandedCategories: new Set(['Living', 'Food & Dining']),

  toggleCategory: (categoryName) => set((state) => {
    const newExpanded = new Set(state.expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    return { expandedCategories: newExpanded }
  }),

  updateBudget: (categoryName, subcategoryName, amount) => set((state) => ({
    budgets: {
      ...state.budgets,
      [state.currentMonth]: {
        ...state.budgets[state.currentMonth],
        [categoryName]: {
          ...state.budgets[state.currentMonth][categoryName],
          budgeted: amount
        }
      }
    }
  })),

  getCategoryStatus: (categoryName) => {
    const state = get()
    const category = state.budgets[state.currentMonth]?.[categoryName]
    if (!category) return { status: 'none' }
    const { budgeted, activity } = category
    if (activity > budgeted) return { status: 'over', percent: Math.round((activity / budgeted) * 100) }
    if (activity < budgeted * 0.5) return { status: 'under', percent: Math.round((activity / budgeted) * 100) }
    return { status: 'on-track', percent: Math.round((activity / budgeted) * 100) }
  },

  getTotalSpent: () => {
    const state = get()
    const monthBudgets = state.budgets[state.currentMonth] || {}
    return Object.values(monthBudgets).reduce((sum, cat) => sum + (cat.activity || 0), 0)
  },

  getTotalBudgeted: () => {
    const state = get()
    const monthBudgets = state.budgets[state.currentMonth] || {}
    return Object.values(monthBudgets).reduce((sum, cat) => sum + (cat.budgeted || 0), 0)
  },

  getReadyToAssign: (income = 5000) => {
    return income - get().getTotalBudgeted()
  }
}))
