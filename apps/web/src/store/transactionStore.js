import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  mapCategory,
  getRootCategories,
  getChildCategories,
} from '../lib/categories'
import { normalizePayeeKey } from '../lib/payee'

function mapTransaction(row, accountsById, categoriesById) {
  const account = accountsById[row.account_id]
  const category = row.category_id ? categoriesById[row.category_id] : null
  const merchant = row.merchant || 'Unknown'
  return {
    id: row.id,
    date: row.date ? new Date(row.date + 'T00:00:00') : new Date(),
    merchant,
    payee: row.payee || merchant,
    amount: Number(row.amount) || 0,
    memo: row.memo || '',
    category: category?.name || 'Uncategorized',
    categoryId: row.category_id,
    categoryEmoji: category?.emoji || '',
    categoryType: category?.type || 'expense',
    parentCategoryName: category?.parentId
      ? categoriesById[category.parentId]?.name || null
      : null,
    accountId: row.account_id,
    account: account?.name || 'Account',
    status: row.status || 'posted',
    cleared: row.cleared !== false && row.status !== 'pending',
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

function mapRenameRule(row) {
  return {
    id: row.id,
    matchKey: row.match_key,
    matchMerchant: row.match_merchant,
    renameTo: row.rename_to,
  }
}

function remapTransactions(state) {
  const accountsById = Object.fromEntries(state.accounts.map((a) => [a.id, a]))
  const categoriesById = Object.fromEntries(state.categories.map((c) => [c.id, c]))
  // categories need parent lookup - mapCategory already has parentId; rebuild from raw not available
  // Use state.categories as categoriesById values
  return state.transactions.map((t) => {
    const category = t.categoryId ? categoriesById[t.categoryId] : null
    return {
      ...t,
      category: category?.name || (t.categoryId ? t.category : 'Uncategorized'),
      categoryEmoji: category?.emoji || '',
      categoryType: category?.type || t.categoryType || 'expense',
      parentCategoryName: category?.parentId
        ? categoriesById[category.parentId]?.name || null
        : null,
      account: accountsById[t.accountId]?.name || t.account,
    }
  })
}

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  categories: [],
  accounts: [],
  payeeRules: [],
  loading: false,
  error: null,
  hydrated: false,
  selectedIds: [],
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

  setSelectedIds: (selectedIds) => set({ selectedIds }),

  toggleSelected: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id],
    })),

  clearSelection: () => set({ selectedIds: [] }),

  loadData: async () => {
    if (!supabase) {
      set({
        transactions: [],
        categories: [],
        accounts: [],
        payeeRules: [],
        hydrated: true,
      })
      return
    }

    set({ loading: true, error: null })
    try {
      await supabase.rpc('ensure_user_defaults')

      const [accountsRes, categoriesRes, transactionsRes, rulesRes] =
        await Promise.all([
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
          supabase.from('payee_rename_rules').select('*').order('rename_to'),
        ])

      if (accountsRes.error) throw accountsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (transactionsRes.error) throw transactionsRes.error
      if (rulesRes.error) throw rulesRes.error

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
        payeeRules: (rulesRes.data || []).map(mapRenameRule),
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
    set((state) => {
      const categories = (data || []).map(mapCategory)
      return {
        categories,
        transactions: remapTransactions({ ...state, categories }),
      }
    })
  },

  createCategory: async ({ name, type = 'expense', emoji = '📁', parentId = null, color = '#10b981' }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const siblings = get().categories.filter(
      (c) => (c.parentId || null) === (parentId || null)
    )
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

    set((state) => {
      const categories = state.categories.map((c) =>
        c.id === categoryId ? mapCategory(data) : c
      )
      return {
        categories,
        transactions: remapTransactions({ ...state, categories }),
      }
    })
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
      transactions: state.transactions.map((t) =>
        t.categoryId === categoryId
          ? {
              ...t,
              categoryId: null,
              category: 'Uncategorized',
              categoryEmoji: '',
              parentCategoryName: null,
            }
          : t
      ),
    }))
    return { success: true }
  },

  reorderCategory: async (categoryId, direction) => {
    const categories = get().categories
    const cat = categories.find((c) => c.id === categoryId)
    if (!cat) return { success: false, error: 'Category not found' }
    if (direction !== 'up' && direction !== 'down') {
      return { success: false, error: 'Invalid direction' }
    }

    const sortSiblings = (list) =>
      [...list].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      )

    const persistPair = async (updates) => {
      set((state) => ({
        categories: state.categories.map((c) => {
          const hit = updates.find((u) => u.id === c.id)
          if (!hit) return c
          return {
            ...c,
            parentId: hit.parentId !== undefined ? hit.parentId : c.parentId,
            sortOrder: hit.sortOrder !== undefined ? hit.sortOrder : c.sortOrder,
          }
        }),
      }))

      if (!supabase) return { success: true }

      for (const u of updates) {
        const payload = {}
        if (u.parentId !== undefined) payload.parent_id = u.parentId
        if (u.sortOrder !== undefined) payload.sort_order = u.sortOrder
        const { error } = await supabase.from('categories').update(payload).eq('id', u.id)
        if (error) {
          await get().reloadCategories()
          return { success: false, error: error.message }
        }
      }
      return { success: true }
    }

    if (!cat.parentId) {
      const roots = sortSiblings(
        getRootCategories(categories).filter((c) => c.type === cat.type)
      )
      const idx = roots.findIndex((c) => c.id === categoryId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || swapIdx < 0 || swapIdx >= roots.length) {
        return { success: false, error: 'Already at the edge' }
      }
      const other = roots[swapIdx]
      return persistPair([
        { id: cat.id, sortOrder: other.sortOrder },
        { id: other.id, sortOrder: cat.sortOrder },
      ])
    }

    const roots = sortSiblings(
      getRootCategories(categories).filter((c) => c.type === cat.type)
    )
    const parentIdx = roots.findIndex((r) => r.id === cat.parentId)
    const siblings = sortSiblings(getChildCategories(categories, cat.parentId))
    const idx = siblings.findIndex((c) => c.id === categoryId)

    if (direction === 'up' && idx === 0) {
      if (parentIdx <= 0) return { success: false, error: 'Already at the top' }
      const prevRoot = roots[parentIdx - 1]
      const prevChildren = sortSiblings(getChildCategories(categories, prevRoot.id))
      const sortOrder =
        (prevChildren.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0) ||
          prevRoot.sortOrder) + 1
      return persistPair([{ id: cat.id, parentId: prevRoot.id, sortOrder }])
    }

    if (direction === 'down' && idx === siblings.length - 1) {
      if (parentIdx < 0 || parentIdx >= roots.length - 1) {
        return { success: false, error: 'Already at the bottom' }
      }
      const nextRoot = roots[parentIdx + 1]
      const nextChildren = sortSiblings(getChildCategories(categories, nextRoot.id))
      const minSort = nextChildren.length
        ? Math.min(...nextChildren.map((c) => c.sortOrder || 0))
        : nextRoot.sortOrder + 1
      return persistPair([{ id: cat.id, parentId: nextRoot.id, sortOrder: minSort - 1 }])
    }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) {
      return { success: false, error: 'Already at the edge' }
    }
    const other = siblings[swapIdx]
    return persistPair([
      { id: cat.id, sortOrder: other.sortOrder },
      { id: other.id, sortOrder: cat.sortOrder },
    ])
  },

  categorizeTransaction: async (transactionId, categoryId) => {
    const category = categoryId
      ? get().categories.find((c) => c.id === categoryId)
      : null
    const categoriesById = Object.fromEntries(
      get().categories.map((c) => [c.id, c])
    )
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === transactionId
          ? {
              ...t,
              categoryId: categoryId || null,
              category: category?.name || 'Uncategorized',
              categoryEmoji: category?.emoji || '',
              categoryType: category?.type || 'expense',
              parentCategoryName: category?.parentId
                ? categoriesById[category.parentId]?.name || null
                : null,
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

  /**
   * Rename payee on one transaction and remember it for the same bank merchant.
   * Future syncs + existing matches use the cleaned name.
   */
  renamePayee: async (transactionId, newPayee) => {
    const payee = String(newPayee || '').trim()
    if (!payee) return { success: false, error: 'Payee name is required' }

    const txn = get().transactions.find((t) => t.id === transactionId)
    if (!txn) return { success: false, error: 'Transaction not found' }

    const matchKey = normalizePayeeKey(txn.merchant)
    const matchMerchant = txn.merchant

    set((state) => ({
      transactions: state.transactions.map((t) =>
        normalizePayeeKey(t.merchant) === matchKey ? { ...t, payee } : t
      ),
    }))

    if (!supabase) return { success: true }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const { error: ruleError } = await supabase.from('payee_rename_rules').upsert(
      {
        user_id: user.id,
        match_key: matchKey,
        match_merchant: matchMerchant,
        rename_to: payee,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,match_key' }
    )
    if (ruleError) return { success: false, error: ruleError.message }

    const { error: txnError } = await supabase
      .from('transactions')
      .update({ payee, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('merchant', matchMerchant)

    if (txnError) return { success: false, error: txnError.message }

    // Refresh rules list
    const { data: rules } = await supabase.from('payee_rename_rules').select('*')
    if (rules) {
      set({ payeeRules: rules.map(mapRenameRule) })
    }

    return { success: true }
  },

  updateMemo: async (transactionId, memo) => {
    const value = String(memo || '')
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === transactionId ? { ...t, memo: value } : t
      ),
    }))
    if (!supabase) return { success: true }
    const { error } = await supabase
      .from('transactions')
      .update({ memo: value, updated_at: new Date().toISOString() })
      .eq('id', transactionId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  },

  toggleCleared: async (transactionId) => {
    const txn = get().transactions.find((t) => t.id === transactionId)
    if (!txn) return { success: false, error: 'Not found' }
    const cleared = !txn.cleared
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === transactionId ? { ...t, cleared } : t
      ),
    }))
    if (!supabase) return { success: true }
    const { error } = await supabase
      .from('transactions')
      .update({ cleared, updated_at: new Date().toISOString() })
      .eq('id', transactionId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  },

  createTransaction: async ({
    date,
    payee,
    amount,
    categoryId = null,
    accountId,
    memo = '',
    inflow = false,
  }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }
    if (!accountId) return { success: false, error: 'Account is required' }

    const cleanPayee = String(payee || '').trim() || 'Unknown'
    const value = Math.abs(Number(amount) || 0)

    // If renaming matches an existing merchant key later, rule still works via merchant=payee for manual
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: accountId,
        date: date || new Date().toISOString().slice(0, 10),
        amount: value,
        merchant: cleanPayee,
        payee: cleanPayee,
        category_id: categoryId,
        memo: memo || null,
        description: cleanPayee,
        status: 'posted',
        cleared: true,
      })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    // If marked as inflow, ensure income category when possible
    if (inflow && categoryId) {
      const cat = get().categories.find((c) => c.id === categoryId)
      if (cat && cat.type !== 'income') {
        // leave as-is; UI chooses income category
      }
    }

    const accountsById = Object.fromEntries(get().accounts.map((a) => [a.id, a]))
    const categoriesById = Object.fromEntries(get().categories.map((c) => [c.id, c]))
    const mapped = mapTransaction(data, accountsById, categoriesById)
    set((state) => ({
      transactions: [mapped, ...state.transactions],
    }))
    return { success: true, transaction: mapped }
  },

  getFilteredTransactions: () => {
    const state = get()
    const { search, category, accountId, dateFrom, dateTo, status } = state.filter

    return state.transactions
      .filter((t) => {
        if (search) {
          const q = search.toLowerCase()
          const hay = `${t.payee} ${t.merchant} ${t.memo} ${t.category}`.toLowerCase()
          if (!hay.includes(q)) return false
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
