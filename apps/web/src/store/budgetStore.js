import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useTransactionStore } from './transactionStore'
import { getLeafCategories, isParentCategory } from '../lib/categories'

const currentMonth = new Date().toISOString().slice(0, 7)

export const useBudgetStore = create((set, get) => ({
  currentMonth,
  // budgets[month][categoryId] = amount
  budgets: {},
  budgetIds: {},
  expandedGroups: {},
  loading: false,
  error: null,
  hydrated: false,

  setCurrentMonth: (month) => set({ currentMonth: month }),

  toggleGroup: (categoryId) =>
    set((state) => ({
      expandedGroups: {
        ...state.expandedGroups,
        [categoryId]: !state.expandedGroups[categoryId],
      },
    })),

  loadBudgets: async (month = get().currentMonth) => {
    if (!supabase) {
      set({ budgets: { [month]: {} }, budgetIds: { [month]: {} }, hydrated: true })
      return
    }

    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, amount, month_year, category_id, category:categories(id, name)')
        .eq('month_year', month)

      if (error) throw error

      const amounts = {}
      const ids = {}
      for (const row of data || []) {
        const id = row.category_id || row.category?.id
        if (!id) continue
        amounts[id] = Number(row.amount) || 0
        ids[id] = row.id
      }

      const categories = useTransactionStore.getState().categories
      const leaves = getLeafCategories(categories, 'expense')
      for (const cat of leaves) {
        if (amounts[cat.id] === undefined) amounts[cat.id] = 0
      }

      // Expand groups that have children by default
      const expanded = { ...get().expandedGroups }
      for (const cat of categories) {
        if (isParentCategory(categories, cat.id) && expanded[cat.id] === undefined) {
          expanded[cat.id] = true
        }
      }

      set((state) => ({
        currentMonth: month,
        budgets: { ...state.budgets, [month]: amounts },
        budgetIds: { ...state.budgetIds, [month]: ids },
        expandedGroups: expanded,
        loading: false,
        hydrated: true,
      }))
    } catch (err) {
      set({ error: err.message, loading: false, hydrated: true })
    }
  },

  getSpending: (month = get().currentMonth) => {
    const { transactions, categories } = useTransactionStore.getState()
    const byId = Object.fromEntries(categories.map((c) => [c.id, c]))
    const spending = {}

    for (const txn of transactions) {
      if (!txn.categoryId || !byId[txn.categoryId]) continue
      if (byId[txn.categoryId].type === 'income') continue
      const d = new Date(txn.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key !== month) continue
      spending[txn.categoryId] =
        (spending[txn.categoryId] || 0) + Number(txn.amount || 0)
    }

    return spending
  },

  /** Budgeted amount for a category (parents = sum of children). */
  getBudgetedFor: (categoryId, month = get().currentMonth) => {
    const categories = useTransactionStore.getState().categories
    const amounts = get().budgets[month] || {}
    const children = categories.filter((c) => c.parentId === categoryId)
    if (children.length > 0) {
      return children.reduce(
        (sum, child) => sum + get().getBudgetedFor(child.id, month),
        0
      )
    }
    return Number(amounts[categoryId] || 0)
  },

  getActivityFor: (categoryId, month = get().currentMonth) => {
    const categories = useTransactionStore.getState().categories
    const spending = get().getSpending(month)
    const children = categories.filter((c) => c.parentId === categoryId)
    if (children.length > 0) {
      return children.reduce(
        (sum, child) => sum + get().getActivityFor(child.id, month),
        0
      )
    }
    return Number(spending[categoryId] || 0)
  },

  updateBudget: async (categoryId, amount) => {
    const month = get().currentMonth
    const value = Number(amount) || 0
    const categories = useTransactionStore.getState().categories

    if (isParentCategory(categories, categoryId)) {
      return { success: false, error: 'Budget groups are set via their subcategories.' }
    }

    set((state) => ({
      budgets: {
        ...state.budgets,
        [month]: {
          ...(state.budgets[month] || {}),
          [categoryId]: value,
        },
      },
    }))

    if (!supabase) return { success: true }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        {
          user_id: user.id,
          category_id: categoryId,
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
          [categoryId]: data.id,
        },
      },
    }))

    return { success: true }
  },

  getCategoryStatus: (categoryId) => {
    const budgeted = get().getBudgetedFor(categoryId)
    const spent = get().getActivityFor(categoryId)
    if (spent > budgeted) return { status: 'over' }
    if (budgeted > 0 && spent < budgeted * 0.5) return { status: 'under' }
    if (budgeted === 0 && spent === 0) return { status: 'under' }
    return { status: 'even' }
  },

  getTotalSpent: () => {
    const categories = useTransactionStore.getState().categories
    const leaves = getLeafCategories(categories, 'expense')
    return leaves.reduce((sum, cat) => sum + get().getActivityFor(cat.id), 0)
  },

  getTotalBudgeted: () => {
    const categories = useTransactionStore.getState().categories
    const leaves = getLeafCategories(categories, 'expense')
    const month = get().currentMonth
    const amounts = get().budgets[month] || {}
    return leaves.reduce((sum, cat) => sum + Number(amounts[cat.id] || 0), 0)
  },

  getTotalActivity: () => get().getTotalSpent(),

  getReadyToAssign: () => {
    const { transactions, categories } = useTransactionStore.getState()
    const month = get().currentMonth
    const incomeIds = new Set(
      categories.filter((c) => c.type === 'income').map((c) => c.id)
    )

    const income = transactions.reduce((sum, txn) => {
      const d = new Date(txn.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key !== month) return sum
      if (incomeIds.has(txn.categoryId)) return sum + Number(txn.amount || 0)
      return sum
    }, 0)

    return income - get().getTotalBudgeted()
  },
}))
