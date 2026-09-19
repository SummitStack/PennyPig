import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  mapCategory,
  getRootCategories,
  getChildCategories,
} from '../lib/categories'
import { getBucket, findGroupCategory } from '../lib/categoryPacks'

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

  /**
   * Install a category pack under its bucket (Fixed / Variable / Savings).
   * Skips names that already exist. Merges into alias groups (e.g. Living ↔ Housing).
   */
  addCategoryPack: async (pack) => {
    if (!pack) return { success: false, error: 'Pack required' }
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    let added = 0
    const type = pack.type || 'expense'
    const color = pack.color || '#10b981'
    const bucketMeta = getBucket(pack.bucket)

    const findByName = (name) =>
      get().categories.find(
        (c) => c.name.toLowerCase() === String(name).toLowerCase()
      )

    // Ensure bucket root exists (Fixed expenses / Variable expenses / Savings Goals)
    let bucketId = null
    if (bucketMeta) {
      const existingBucket = findByName(bucketMeta.name)
      if (existingBucket) {
        bucketId = existingBucket.id
      } else {
        const created = await get().createCategory({
          name: bucketMeta.name,
          type: 'expense',
          emoji: bucketMeta.emoji || '📂',
          parentId: null,
          color,
        })
        if (!created.success) return created
        bucketId = created.category.id
        added += 1
      }
    }

    let groupId = null
    if (pack.attachToBucket) {
      groupId = bucketId
    } else {
      const existingGroup = findGroupCategory(pack, get().categories)
      if (existingGroup) {
        groupId = existingGroup.id
        // Don't reparent existing groups (avoids reshuffling the original seed)
      } else {
        const created = await get().createCategory({
          name: pack.name,
          type,
          emoji: pack.emoji || '📂',
          parentId: bucketId,
          color,
        })
        if (!created.success) return created
        groupId = created.category.id
        added += 1
      }
    }

    if (!groupId && !pack.flat) {
      return { success: false, error: 'Could not resolve parent group', added }
    }

    for (const child of pack.categories) {
      if (findByName(child.name)) continue
      const result = await get().createCategory({
        name: child.name,
        type: child.type || type,
        emoji: child.emoji || '📁',
        parentId: pack.flat ? null : groupId,
        color,
      })
      if (!result.success) {
        if (String(result.error || '').toLowerCase().includes('duplicate')) {
          await get().reloadCategories()
          continue
        }
        return { success: false, error: result.error, added }
      }
      added += 1
    }

    await get().reloadCategories()
    return { success: true, added, groupId, bucketId }
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

  /**
   * Move a category up/down among siblings. At the edge of a group, subcategories
   * cross into the previous/next main category.
   */
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
      // Optimistic local update
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

    // Top-level groups / standalone roots
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

    // Subcategory within a group
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
      // Place at start of next group: shift others up locally via sortOrder - 1 gap
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

  /**
   * Drag-and-drop relocate: place category before/after a target, or into a group.
   * position: 'before' | 'after' | 'into'
   */
  relocateCategory: async (dragId, targetId, position = 'before') => {
    const categories = get().categories
    const drag = categories.find((c) => c.id === dragId)
    const target = categories.find((c) => c.id === targetId)
    if (!drag || !target) return { success: false, error: 'Category not found' }
    if (dragId === targetId) return { success: true }

    // Prevent dropping a group into itself or its descendants
    const isDescendant = (ancestorId, nodeId) => {
      let cur = categories.find((c) => c.id === nodeId)
      while (cur?.parentId) {
        if (cur.parentId === ancestorId) return true
        cur = categories.find((c) => c.id === cur.parentId)
      }
      return false
    }
    if (position === 'into' && (dragId === targetId || isDescendant(dragId, targetId))) {
      return { success: false, error: 'Cannot move a group into itself' }
    }

    let newParentId = null
    if (position === 'into') {
      newParentId = target.id
    } else {
      newParentId = target.parentId || null
    }

    // Groups with children should stay top-level when reordering among roots
    const dragHasChildren = categories.some((c) => c.parentId === dragId)
    if (dragHasChildren && newParentId) {
      return { success: false, error: 'Move subcategories out before nesting this group.' }
    }

    const siblings = categories
      .filter(
        (c) =>
          c.id !== dragId &&
          (c.parentId || null) === (newParentId || null) &&
          c.type === drag.type
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))

    let insertAt = siblings.length
    if (position === 'into') {
      insertAt = siblings.length
    } else {
      const targetIdx = siblings.findIndex((c) => c.id === targetId)
      if (targetIdx >= 0) {
        insertAt = position === 'before' ? targetIdx : targetIdx + 1
      }
    }

    const ordered = [...siblings]
    ordered.splice(insertAt, 0, { ...drag, parentId: newParentId })

    // Assign sequential sort orders (leave gaps by 10 for stability)
    const updates = ordered.map((c, i) => ({
      id: c.id,
      parentId: newParentId,
      sortOrder: (i + 1) * 10,
    }))

    set((state) => ({
      categories: state.categories.map((c) => {
        const hit = updates.find((u) => u.id === c.id)
        if (!hit) return c
        return { ...c, parentId: hit.parentId, sortOrder: hit.sortOrder }
      }),
    }))

    if (!supabase) return { success: true }

    for (const u of updates) {
      const { error } = await supabase
        .from('categories')
        .update({
          parent_id: u.parentId,
          sort_order: u.sortOrder,
        })
        .eq('id', u.id)
      if (error) {
        await get().reloadCategories()
        return { success: false, error: error.message }
      }
    }
    return { success: true }
  },

  /** Persist a full parent/sort layout (used after live drag-and-drop). */
  applyCategoryLayout: async (layout) => {
    // layout: [{ id, parentId, sortOrder }, ...]
    if (!Array.isArray(layout) || layout.length === 0) {
      return { success: true }
    }

    set((state) => ({
      categories: state.categories.map((c) => {
        const hit = layout.find((u) => u.id === c.id)
        if (!hit) return c
        return {
          ...c,
          parentId: hit.parentId ?? null,
          sortOrder: hit.sortOrder,
        }
      }),
    }))

    if (!supabase) return { success: true }

    for (const u of layout) {
      const { error } = await supabase
        .from('categories')
        .update({
          parent_id: u.parentId ?? null,
          sort_order: u.sortOrder,
        })
        .eq('id', u.id)
      if (error) {
        await get().reloadCategories()
        return { success: false, error: error.message }
      }
    }
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
