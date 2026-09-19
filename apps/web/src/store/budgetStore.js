import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useTransactionStore } from './transactionStore'

const currentMonth = new Date().toISOString().slice(0, 7)

export const useBudgetStore = create((set, get) => ({
  currentMonth,
  // budgets[month][categoryName] = amount
  budgets: {},
  budgetIds: {}, // budgets[month][categoryName] = row id
  loading: false,
  error: null,
  hydrated: false,

  setCurrentMonth: (month) => set({ currentMonth: month }),

  loadBudgets: async (month = get().currentMonth) => {
    if (!supabase) {
      set({ budgets: { [month]: {} }, budgetIds: { [month]: {} }, hydrated: true })
      return
    }

    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, amount, month_year, category:categories(id, name)')
        .eq('month_year', month)

      if (error) throw error

      const amounts = {}
      const ids = {}
      for (const row of data || []) {
        const name = row.category?.name
        if (!name) continue
        amounts[name] = Number(row.amount) || 0
        ids[name] = row.id
      }

      // Ensure every expense category appears even with 0 budget
      const categories = useTransactionStore.getState().categories
      for (const cat of categories.filter((c) => c.type === 'expense')) {
        if (amounts[cat.name] === undefined) amounts[cat.name] = 0
      }

      set((state) => ({
        currentMonth: month,
        budgets: { ...state.budgets, [month]: amounts },
        budgetIds: { ...state.budgetIds, [month]: ids },
        loading: false,
        hydrated: true,
      }))
    } catch (err) {
      set({ error: err.message, loading: false, hydrated: true })
    }
  },

  /** Activity derived from real transactions for the month. */
  getSpending: (month = get().currentMonth) => {
    const { transactions, categories } = useTransactionStore.getState()
    const expenseNames = new Set(
      categories.filter((c) => c.type !== 'income').map((c) => c.name)
    )
    const spending = {}

    for (const txn of transactions) {
      if (!txn.category || !expenseNames.has(txn.category)) continue
      const d = new Date(txn.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key !== month) continue
      spending[txn.category] = (spending[txn.category] || 0) + Number(txn.amount || 0)
    }

    return spending
  },

  updateBudget: async (categoryName, _subcategoryName, amount) => {
    const month = get().currentMonth
    const value = Number(amount) || 0

    set((state) => ({
      budgets: {
        ...state.budgets,
        [month]: {
          ...(state.budgets[month] || {}),
          [categoryName]: value,
        },
      },
    }))

    if (!supabase) return { success: true }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const categories = useTransactionStore.getState().categories
    const category = categories.find((c) => c.name === categoryName)
    if (!category) return { success: false, error: 'Category not found' }

    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        {
          user_id: user.id,
          category_id: category.id,
          amount: value,
          period: 'monthly',
          month_year: month,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category_id,month_year' }
      )
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    set((state) => ({
      budgetIds: {
        ...state.budgetIds,
        [month]: {
          ...(state.budgetIds[month] || {}),
          [categoryName]: data.id,
        },
      },
    }))

    return { success: true }
  },

  setBudget: (categoryName, amount) => get().updateBudget(categoryName, null, amount),

  getCategoryStatus: (categoryName) => {
    const state = get()
    const budgeted = state.budgets[state.currentMonth]?.[categoryName] || 0
    const spent = state.getSpending()[categoryName] || 0
    if (spent > budgeted) return { status: 'over' }
    if (budgeted > 0 && spent < budgeted * 0.5) return { status: 'under' }
    if (budgeted === 0 && spent === 0) return { status: 'under' }
    return { status: 'even' }
  },

  getTotalSpent: () => {
    return Object.values(get().getSpending()).reduce((sum, val) => sum + val, 0)
  },

  getTotalBudgeted: () => {
    const state = get()
    return Object.values(state.budgets[state.currentMonth] || {}).reduce(
      (sum, val) => sum + val,
      0
    )
  },

  getTotalActivity: () => get().getTotalSpent(),

  getReadyToAssign: () => {
    const { transactions, categories } = useTransactionStore.getState()
    const month = get().currentMonth
    const incomeNames = new Set(
      categories.filter((c) => c.type === 'income').map((c) => c.name)
    )

    const income = transactions.reduce((sum, txn) => {
      const d = new Date(txn.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key !== month) return sum
      if (incomeNames.has(txn.category)) return sum + Number(txn.amount || 0)
      return sum
    }, 0)

    return income - get().getTotalBudgeted()
  },

  getCategories: () => get().budgets[get().currentMonth] || {},
}))
