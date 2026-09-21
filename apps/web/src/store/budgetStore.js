import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useTransactionStore } from './transactionStore'
import { getLeafCategories, isParentCategory, isUnderSavingsGoals } from '../lib/categories'
import {
  computeAvailability,
  computeReadyToAssign,
  incomeForMonth,
  incomeActivityForCategory,
  leafActivity,
  targetNeededForMonth,
  underfundedAmount,
} from '../lib/budgetMath'
import { shiftMonth, currentMonthKey } from '../lib/money'

const currentMonth = currentMonthKey()

function splitsIndex(splits) {
  const map = {}
  for (const s of splits || []) {
    if (!map[s.transactionId]) map[s.transactionId] = []
    map[s.transactionId].push(s)
  }
  return map
}

export const useBudgetStore = create((set, get) => ({
  currentMonth,
  // budgets[month][categoryId] = amount
  budgets: {},
  budgetIds: {},
  targets: {}, // categoryId -> target
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
      set({
        budgets: { [month]: {} },
        budgetIds: { [month]: {} },
        targets: {},
        hydrated: true,
      })
      return
    }

    set({ loading: true, error: null })
    try {
      const [budgetsRes, targetsRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('id, amount, month_year, category_id, category:categories(id, name)')
          .eq('month_year', month),
        supabase.from('category_targets').select('*'),
      ])

      if (budgetsRes.error) throw budgetsRes.error
      if (targetsRes.error) throw targetsRes.error

      const amounts = {}
      const ids = {}
      for (const row of budgetsRes.data || []) {
        const id = row.category_id || row.category?.id
        if (!id) continue
        amounts[id] = Number(row.amount) || 0
        ids[id] = row.id
      }

      const categories = useTransactionStore.getState().categories
      const leaves = [
        ...getLeafCategories(categories, 'expense'),
        ...getLeafCategories(categories, 'income'),
      ]
      for (const cat of leaves) {
        if (amounts[cat.id] === undefined) amounts[cat.id] = 0
      }

      const targets = {}
      for (const row of targetsRes.data || []) {
        targets[row.category_id] = {
          id: row.id,
          categoryId: row.category_id,
          targetType: row.target_type,
          amount: Number(row.amount) || 0,
          targetDate: row.target_date,
        }
      }

      const expanded = { ...get().expandedGroups }
      for (const cat of categories) {
        if (isParentCategory(categories, cat.id) && expanded[cat.id] === undefined) {
          expanded[cat.id] = true
        }
      }

      // Prefetch prior month budgets for rollover math when navigating
      const prior = shiftMonth(month, -1)
      let budgets = { ...get().budgets, [month]: amounts }
      if (!budgets[prior]) {
        const { data: priorRows } = await supabase
          .from('budgets')
          .select('id, amount, month_year, category_id')
          .eq('month_year', prior)
        const priorAmounts = {}
        for (const row of priorRows || []) {
          priorAmounts[row.category_id] = Number(row.amount) || 0
        }
        budgets = { ...budgets, [prior]: priorAmounts }
      }

      set({
        currentMonth: month,
        budgets,
        budgetIds: { ...get().budgetIds, [month]: ids },
        targets,
        expandedGroups: expanded,
        loading: false,
        hydrated: true,
      })
    } catch (err) {
      set({ error: err.message, loading: false, hydrated: true })
    }
  },

  /** Load all budget months touched by transactions (for accurate RTA). */
  loadBudgetHistory: async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('budgets')
      .select('id, amount, month_year, category_id')
    if (error) return
    const budgets = { ...get().budgets }
    const budgetIds = { ...get().budgetIds }
    for (const row of data || []) {
      if (!budgets[row.month_year]) budgets[row.month_year] = {}
      if (!budgetIds[row.month_year]) budgetIds[row.month_year] = {}
      budgets[row.month_year][row.category_id] = Number(row.amount) || 0
      budgetIds[row.month_year][row.category_id] = row.id
    }
    set({ budgets, budgetIds })
  },

  _context: () => {
    const { transactions, categories, splits } = useTransactionStore.getState()
    return {
      transactions,
      categories,
      splitsByTxn: splitsIndex(splits),
      budgetsByMonth: get().budgets,
    }
  },

  getSpending: (month = get().currentMonth) => {
    const { transactions, categories, splitsByTxn } = get()._context()
    const leaves = getLeafCategories(categories, 'expense')
    const spending = {}
    for (const leaf of leaves) {
      spending[leaf.id] = leafActivity({
        categoryId: leaf.id,
        month,
        transactions,
        splitsByTxn,
        categories,
      })
    }
    return spending
  },

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
    const { transactions, categories, splitsByTxn } = get()._context()
    const cat = categories.find((c) => c.id === categoryId)
    const children = categories.filter((c) => c.parentId === categoryId)
    // Direct spend on this id (including mis-tagged group rows) + children
    const outflow = leafActivity({
      categoryId,
      month,
      transactions,
      splitsByTxn,
      categories,
    })

    // Savings goals: Activity = budgeted funding − outflows (net into the goal)
    if (isUnderSavingsGoals(categories, cat) && children.length === 0) {
      const budgeted = get().getBudgetedFor(categoryId, month)
      return budgeted - outflow
    }

    if (children.length > 0) {
      return (
        (isUnderSavingsGoals(categories, cat) ? 0 : outflow) +
        children.reduce(
          (sum, child) => sum + get().getActivityFor(child.id, month),
          0
        )
      )
    }
    return outflow
  },

  getIncomeActivityFor: (categoryId, month = get().currentMonth) => {
    const { transactions, categories } = get()._context()
    const children = categories.filter((c) => c.parentId === categoryId)
    const direct = incomeActivityForCategory({
      categoryId,
      month,
      transactions,
      categories,
    })
    if (children.length > 0) {
      return (
        direct +
        children.reduce(
          (sum, child) => sum + get().getIncomeActivityFor(child.id, month),
          0
        )
      )
    }
    return direct
  },

  /** Expected income − received; positive = extra earnings to allocate. */
  getIncomeAvailableFor: (categoryId, month = get().currentMonth) => {
    const expected = get().getBudgetedFor(categoryId, month)
    const received = get().getIncomeActivityFor(categoryId, month)
    return received - expected
  },

  getCarryoverFor: (categoryId, month = get().currentMonth) => {
    const ctx = get()._context()
    const { carryover } = computeAvailability({
      ...ctx,
      endMonth: month,
    })
    const categories = ctx.categories
    const children = categories.filter((c) => c.parentId === categoryId)
    if (children.length > 0) {
      return children.reduce(
        (sum, child) => sum + Number(carryover[month]?.[child.id] || 0),
        0
      )
    }
    return Number(carryover[month]?.[categoryId] || 0)
  },

  getAvailableFor: (categoryId, month = get().currentMonth) => {
    const ctx = get()._context()
    const { available } = computeAvailability({
      ...ctx,
      endMonth: month,
    })
    const categories = ctx.categories
    const children = categories.filter((c) => c.parentId === categoryId)
    if (children.length > 0) {
      return children.reduce(
        (sum, child) => sum + Number(available[month]?.[child.id] || 0),
        0
      )
    }
    return Number(available[month]?.[categoryId] || 0)
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

  /** Move money between two leaf categories in the current month. */
  moveMoney: async (fromCategoryId, toCategoryId, amount) => {
    const value = Math.abs(Number(amount) || 0)
    if (value === 0) return { success: false, error: 'Amount required' }
    if (fromCategoryId === toCategoryId) {
      return { success: false, error: 'Pick two different categories' }
    }

    const fromAssigned = get().getBudgetedFor(fromCategoryId)
    const toAssigned = get().getBudgetedFor(toCategoryId)
    const fromNext = fromAssigned - value
    const toNext = toAssigned + value

    const a = await get().updateBudget(fromCategoryId, fromNext)
    if (!a.success) return a
    const b = await get().updateBudget(toCategoryId, toNext)
    if (!b.success) {
      await get().updateBudget(fromCategoryId, fromAssigned)
      return b
    }
    return { success: true }
  },

  /** Cover overspending: move enough from `fromCategoryId` to bring target Available to 0. */
  coverOverspending: async (overspentCategoryId, fromCategoryId) => {
    const available = get().getAvailableFor(overspentCategoryId)
    if (available >= 0) return { success: false, error: 'Category is not overspent' }
    return get().moveMoney(fromCategoryId, overspentCategoryId, -available)
  },

  setTarget: async (categoryId, { targetType, amount, targetDate = null }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const payload = {
      user_id: user.id,
      category_id: categoryId,
      target_type: targetType || 'monthly',
      amount: Number(amount) || 0,
      target_date: targetType === 'by_date' ? targetDate : null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('category_targets')
      .upsert(payload, { onConflict: 'user_id,category_id' })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    set((state) => ({
      targets: {
        ...state.targets,
        [categoryId]: {
          id: data.id,
          categoryId: data.category_id,
          targetType: data.target_type,
          amount: Number(data.amount) || 0,
          targetDate: data.target_date,
        },
      },
    }))
    return { success: true }
  },

  clearTarget: async (categoryId) => {
    if (!supabase) return { success: true }
    const { error } = await supabase
      .from('category_targets')
      .delete()
      .eq('category_id', categoryId)
    if (error) return { success: false, error: error.message }
    set((state) => {
      const targets = { ...state.targets }
      delete targets[categoryId]
      return { targets }
    })
    return { success: true }
  },

  getTargetFor: (categoryId) => get().targets[categoryId] || null,

  getUnderfundedFor: (categoryId, month = get().currentMonth) => {
    const target = get().targets[categoryId]
    if (!target) return 0
    return underfundedAmount({
      target,
      month,
      assigned: get().getBudgetedFor(categoryId, month),
      available: get().getAvailableFor(categoryId, month),
    })
  },

  /** Copy assigned amounts from previous month into current. */
  copyFromLastMonth: async () => {
    const month = get().currentMonth
    const prior = shiftMonth(month, -1)
    if (!get().budgets[prior]) {
      await get().loadBudgets(prior)
      set({ currentMonth: month })
      // reload current after side-effect
      const { data } = await supabase
        ?.from('budgets')
        .select('id, amount, month_year, category_id')
        .eq('month_year', prior)
      if (data) {
        const priorAmounts = {}
        for (const row of data) {
          priorAmounts[row.category_id] = Number(row.amount) || 0
        }
        set((state) => ({
          budgets: { ...state.budgets, [prior]: priorAmounts },
          currentMonth: month,
        }))
      }
    }

    const categories = useTransactionStore.getState().categories
    const leaves = getLeafCategories(categories, 'expense')
    const priorAmounts = get().budgets[prior] || {}
    for (const leaf of leaves) {
      const value = Number(priorAmounts[leaf.id] || 0)
      await get().updateBudget(leaf.id, value)
    }
    return { success: true }
  },

  /** Assign underfunded amounts up to available RTA. */
  autoAssignUnderfunded: async () => {
    const month = get().currentMonth
    const categories = useTransactionStore.getState().categories
    const leaves = getLeafCategories(categories, 'expense')
    let remaining = get().getReadyToAssign()
    if (remaining <= 0) {
      return { success: false, error: 'Nothing ready to assign' }
    }

    for (const leaf of leaves) {
      if (remaining <= 0) break
      const need = get().getUnderfundedFor(leaf.id, month)
      if (need <= 0) continue
      const add = Math.min(need, remaining)
      const next = get().getBudgetedFor(leaf.id, month) + add
      await get().updateBudget(leaf.id, next)
      remaining -= add
    }
    return { success: true }
  },

  getCategoryStatus: (categoryId) => {
    const available = get().getAvailableFor(categoryId)
    const budgeted = get().getBudgetedFor(categoryId)
    const spent = get().getActivityFor(categoryId)
    if (available < 0) return { status: 'over' }
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

  getTotalAvailable: () => {
    const categories = useTransactionStore.getState().categories
    const leaves = getLeafCategories(categories, 'expense')
    return leaves.reduce((sum, cat) => sum + get().getAvailableFor(cat.id), 0)
  },

  getIncomeThisMonth: () => {
    const { transactions, categories } = useTransactionStore.getState()
    return incomeForMonth(transactions, categories, get().currentMonth)
  },

  getReadyToAssign: () => {
    const ctx = get()._context()
    return computeReadyToAssign({
      ...ctx,
      month: get().currentMonth,
    })
  },

  getTargetNeeded: (categoryId) => {
    const target = get().targets[categoryId]
    return targetNeededForMonth(target, get().currentMonth)
  },
}))
