import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { mapCategory } from '../lib/categories'

function mapTransaction(row, accountsById, categoriesById) {
  const account = accountsById[row.account_id]
  const category = row.category_id ? categoriesById[row.category_id] : null
  return {
    id: row.id,
    date: row.date ? new Date(row.date + 'T00:00:00') : new Date(),
    merchant: row.merchant || 'Unknown',
    amount: Number(row.amount) || 0,
    category: category?.name || 'Uncategorized',
    categoryId: row.category_id,
    accountId: row.account_id,
    account: account?.name || 'Account',
    status: row.status || 'posted',
  }
}

function mapAccount(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.account_type,
    balance: Number(row.balance) || 0,
  }
}

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  categories: [],
  accounts: [],
  loading: false,
  error: null,
  hydrated: false,
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

  loadData: async () => {
    if (!supabase) {
      set({ transactions: [], categories: [], accounts: [], hydrated: true })
      return
    }

    set({ loading: true, error: null })
    try {
      // Ensure hierarchy/emojis exist for current user
      await supabase.rpc('ensure_user_defaults')

      const [accountsRes, categoriesRes, transactionsRes] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: true }),
        supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false })
          .limit(500),
      ])

      if (accountsRes.error) throw accountsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (transactionsRes.error) throw transactionsRes.error

      const accounts = (accountsRes.data || []).map(mapAccount)
      const categories = (categoriesRes.data || []).map(mapCategory)
      const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]))
      const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]))
      const transactions = (transactionsRes.data || []).map((row) =>
        mapTransaction(row, accountsById, categoriesById)
      )

      set({
        accounts,
        categories,
        transactions,
        loading: false,
        hydrated: true,
      })
    } catch (err) {
      set({ error: err.message, loading: false, hydrated: true })
    }
  },

  reloadCategories: async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    set({ categories: (data || []).map(mapCategory) })
  },

  createCategory: async ({ name, type = 'expense', emoji = '📁', parentId = null, color = '#10b981' }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const siblings = get()
      .categories.filter((c) => (c.parentId || null) === (parentId || null))
    const sortOrder =
      siblings.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0) + 1

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: name.trim(),
        type,
        icon: emoji,
        color,
        parent_id: parentId,
        custom: true,
        sort_order: sortOrder,
      })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }
    set((state) => ({
      categories: [...state.categories, mapCategory(data)],
    }))
    return { success: true, category: mapCategory(data) }
  },

  updateCategory: async (categoryId, patch) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    const payload = {}
    if (patch.name !== undefined) payload.name = patch.name.trim()
    if (patch.type !== undefined) payload.type = patch.type
    if (patch.emoji !== undefined) payload.icon = patch.emoji
    if (patch.color !== undefined) payload.color = patch.color
    if (patch.parentId !== undefined) payload.parent_id = patch.parentId
    if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', categoryId)
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === categoryId ? mapCategory(data) : c
      ),
    }))
    return { success: true, category: mapCategory(data) }
  },

  deleteCategory: async (categoryId) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    const children = get().categories.filter((c) => c.parentId === categoryId)
    if (children.length > 0) {
      return {
        success: false,
        error: 'Remove or move subcategories first before deleting this group.',
      }
    }

    const { error } = await supabase.from('categories').delete().eq('id', categoryId)
    if (error) return { success: false, error: error.message }

    set((state) => ({
      categories: state.categories.filter((c) => c.id !== categoryId),
    }))
    return { success: true }
  },

  categorizeTransaction: async (transactionId, categoryId) => {
    const category = categoryId
      ? get().categories.find((c) => c.id === categoryId)
      : null
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === transactionId
          ? {
              ...t,
              categoryId: categoryId || null,
              category: category?.name || 'Uncategorized',
            }
          : t
      ),
    }))

    if (!supabase) return { success: true }

    const { error } = await supabase
      .from('transactions')
      .update({
        category_id: categoryId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  },

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
