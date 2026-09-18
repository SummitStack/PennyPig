import { create } from 'zustand'

const currentMonth = new Date().toISOString().slice(0, 7)

export const useBudgetStore = create((set, get) => ({
  currentMonth,
  categories: {
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
  },

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

  updateBudget: (categoryName, subcategoryName, amount) => set((state) => {
    if (subcategoryName) {
      return {
        categories: {
          ...state.categories,
          [categoryName]: {
            ...state.categories[categoryName],
            subcategories: {
              ...state.categories[categoryName].subcategories,
              [subcategoryName]: {
                ...state.categories[categoryName].subcategories[subcategoryName],
                budgeted: amount
              }
            }
          }
        }
      }
    }
    return state
  }),

  getTotalBudgeted: () => {
    const state = get()
    return Object.values(state.categories).reduce((sum, cat) => sum + cat.budgeted, 0)
  },

  getTotalActivity: () => {
    const state = get()
    return Object.values(state.categories).reduce((sum, cat) => sum + cat.activity, 0)
  },

  getReadyToAssign: (income = 5000) => {
    return income - get().getTotalBudgeted()
  }
}))
