import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import {
  mapCategory,
  getRootCategories,
  getChildCategories,
  isBudgetParent,
  getCategoryRole,
} from '../lib/categories'
import { normalizePayeeKey } from '../lib/payee'
import { signedAmount, absAmount } from '../lib/money'
import { resolveToLeafCategoryId } from '../lib/categorySuggest'

function isPureTransfer(txn) {
  return txn.transferAccountId && !txn.categoryId && !txn.isSplit
}

function mapSplit(row) {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    categoryId: row.category_id,
    amount: Number(row.amount) || 0,
    memo: row.memo || '',
    sortOrder: row.sort_order ?? 0,
  }
}

function enrichSplit(split, categoriesById) {
  const cat = split.categoryId ? categoriesById[split.categoryId] : null
  return {
    ...split,
    category: cat?.name || null,
    categoryEmoji: cat?.emoji || '',
  }
}

function mapCategoryRule(row) {
  return {
    id: row.id,
    matchKey: row.match_key,
    matchPayee: row.match_payee,
    categoryId: row.category_id,
  }
}

function findCategory(categories, categoryId) {
  return categories.find((c) => c.id === categoryId)
}

function rejectIfSystemParent(categories, categoryId) {
  const cat = findCategory(categories, categoryId)
  if (cat && isBudgetParent(cat)) {
    return 'System budget parents cannot be changed or removed.'
  }
  return null
}

function validateCreateCategory(categories, { type, parentId, role }) {
  if (type === 'income') {
    if (parentId) return 'Income categories must be top-level.'
    return null
  }
  if (type !== 'expense') return null

  if (!parentId) {
    return 'Expense categories must belong to a parent group or budget parent.'
  }

  const parent = findCategory(categories, parentId)
  if (!parent) return 'Parent category not found.'

  const intendedRole = role || (isBudgetParent(parent) ? 'group' : 'category')

  if (intendedRole === 'group') {
    if (!isBudgetParent(parent)) {
      return 'Groups must be created under Needs, Wants, Savings Goals, or Other.'
    }
    if (parent.name === 'Savings Goals') {
      return 'Add savings categories directly under Savings Goals instead of a group.'
    }
    return null
  }

  if (intendedRole === 'category') {
    if (isBudgetParent(parent)) {
      if (parent.name !== 'Savings Goals') {
        return 'Categories must be created under a group, not a budget parent.'
      }
      return null
    }
    if (getCategoryRole(categories, parent) !== 'group') {
      return 'Categories must be created under a group.'
    }
    return null
  }

  return null
}

function mapTransaction(row, accountsById, categoriesById, splits = []) {
  const account = accountsById[row.account_id]
  const category = row.category_id ? categoriesById[row.category_id] : null
  const merchant = row.merchant || 'Unknown'
  const enrichedSplits = splits.map((s) =>
    s.category !== undefined ? s : enrichSplit(s, categoriesById)
  )
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
    transferAccountId: row.transfer_account_id || null,
    transferTransactionId: row.transfer_transaction_id || null,
    isSplit: Boolean(row.is_split) || enrichedSplits.length > 0,
    excludeFromBudget: Boolean(row.exclude_from_budget),
    splits: enrichedSplits,
  }
}

function mapAccount(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.account_type,
    balance: Number(row.balance) || 0,
    isManual: Boolean(row.is_manual),
    onBudget: row.on_budget !== false,
    closed: Boolean(row.closed),
    creditCardCategoryId: row.credit_card_category_id || null,
    note: row.note || '',
    institution: row.institution_name || null,
    mask: row.mask || null,
    plaidAccountId: row.plaid_account_id || null,
    plaidItemId: row.plaid_item_id || null,
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

function splitsByTransactionId(splits) {
  const map = {}
  for (const split of splits) {
    if (!map[split.transactionId]) map[split.transactionId] = []
    map[split.transactionId].push(split)
  }
  return map
}

function remapTransactions(state) {
  const accountsById = Object.fromEntries(state.accounts.map((a) => [a.id, a]))
  const categoriesById = Object.fromEntries(state.categories.map((c) => [c.id, c]))
  const byTxn = splitsByTransactionId(state.splits || [])
  return state.transactions.map((t) => {
    const category = t.categoryId ? categoriesById[t.categoryId] : null
    const txnSplits = (byTxn[t.id] || t.splits || []).map((s) =>
      enrichSplit(s, categoriesById)
    )
    return {
      ...t,
      category: category?.name || (t.categoryId ? t.category : 'Uncategorized'),
      categoryEmoji: category?.emoji || '',
      categoryType: category?.type || t.categoryType || 'expense',
      parentCategoryName: category?.parentId
        ? categoriesById[category.parentId]?.name || null
        : null,
      account: accountsById[t.accountId]?.name || t.account,
      splits: txnSplits,
      isSplit: t.isSplit || txnSplits.length > 0,
    }
  })
}

function resolvePayeeDisplay(merchant, payeeRules) {
  const key = normalizePayeeKey(merchant)
  const rule = payeeRules.find((r) => r.matchKey === key)
  return rule?.renameTo || merchant
}

function resolveCategoryFromRules(merchant, categoryRules) {
  const key = normalizePayeeKey(merchant)
  const rule = categoryRules.find((r) => r.matchKey === key)
  return rule?.categoryId || null
}

async function syncManualAccountBalance(get, set, accountId, delta) {
  const account = get().accounts.find((a) => a.id === accountId)
  if (!account?.isManual || !delta) return

  const newBalance = (Number(account.balance) || 0) + delta
  set((state) => ({
    accounts: state.accounts.map((a) =>
      a.id === accountId ? { ...a, balance: newBalance } : a
    ),
  }))

  if (supabase) {
    await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId)
  }

  try {
    const { useAccountStore } = await import('./accountStore')
    useAccountStore.setState((state) => ({
      linkedAccounts: state.linkedAccounts.map((a) =>
        a.id === accountId ? { ...a, balance: newBalance } : a
      ),
    }))
  } catch {
    // accountStore may not be loaded yet
  }
}

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  categories: [],
  accounts: [],
  splits: [],
  categoryRules: [],
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
    uncategorizedOnly: false,
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
        splits: [],
        categoryRules: [],
        payeeRules: [],
        hydrated: true,
      })
      return
    }

    set({ loading: true, error: null })
    try {
      await supabase.rpc('ensure_user_defaults')

      const [accountsRes, categoriesRes, transactionsRes, rulesRes, splitsRes, catRulesRes] =
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
            .limit(5000),
          supabase.from('payee_rename_rules').select('*').order('rename_to'),
          supabase.from('transaction_splits').select('*'),
          supabase.from('payee_category_rules').select('*'),
        ])

      if (accountsRes.error) throw accountsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (transactionsRes.error) throw transactionsRes.error
      if (rulesRes.error) throw rulesRes.error
      if (splitsRes.error) throw splitsRes.error
      if (catRulesRes.error) throw catRulesRes.error

      const accounts = (accountsRes.data || []).map(mapAccount)
      const categories = (categoriesRes.data || []).map(mapCategory)
      const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]))
      const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]))
      const splits = (splitsRes.data || []).map(mapSplit)
      const splitsIndex = splitsByTransactionId(splits)

      const transactions = (transactionsRes.data || []).map((row) =>
        mapTransaction(row, accountsById, categoriesById, splitsIndex[row.id] || [])
      )

      set({
        accounts,
        categories,
        transactions,
        splits,
        categoryRules: (catRulesRes.data || []).map(mapCategoryRule),
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

  createCategory: async ({
    name,
    type = 'expense',
    emoji = '📁',
    parentId = null,
    color = '#10b981',
    role,
  }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    const validationError = validateCreateCategory(get().categories, {
      type,
      parentId,
      role,
    })
    if (validationError) return { success: false, error: validationError }

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

    const blocked = rejectIfSystemParent(get().categories, categoryId)
    if (blocked) return { success: false, error: blocked }

    if (patch.parentId !== undefined) {
      const cat = findCategory(get().categories, categoryId)
      const validationError = validateCreateCategory(get().categories, {
        type: cat?.type || 'expense',
        parentId: patch.parentId,
        role: getCategoryRole(get().categories, cat),
      })
      if (validationError) return { success: false, error: validationError }
    }

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

    const blocked = rejectIfSystemParent(get().categories, categoryId)
    if (blocked) return { success: false, error: blocked }

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
    if (isBudgetParent(cat)) {
      return { success: false, error: 'System budget parents cannot be reordered.' }
    }
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
    if (isBudgetParent(drag)) {
      return { success: false, error: 'System budget parents cannot be moved.' }
    }
    if (isBudgetParent(target) && position === 'into') {
      return { success: false, error: 'Cannot nest items inside a budget parent.' }
    }

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
    if (!Array.isArray(layout) || layout.length === 0) {
      return { success: true }
    }

    const categories = get().categories
    for (const u of layout) {
      const existing = findCategory(categories, u.id)
      if (!existing) continue
      if (isBudgetParent(existing)) {
        if (u.parentId != null && u.parentId !== existing.parentId) {
          return { success: false, error: 'System budget parents cannot be moved.' }
        }
        continue
      }
      const validationError = validateCreateCategory(categories, {
        type: existing.type,
        parentId: u.parentId ?? null,
        role: getCategoryRole(categories, existing),
      })
      if (validationError) return { success: false, error: validationError }
    }

    set((state) => ({
      categories: state.categories.map((c) => {
        const hit = layout.find((u) => u.id === c.id)
        if (!hit || isBudgetParent(c)) return c
        return {
          ...c,
          parentId: hit.parentId ?? null,
          sortOrder: hit.sortOrder,
        }
      }),
    }))

    if (!supabase) return { success: true }

    for (const u of layout) {
      const existing = findCategory(get().categories, u.id)
      if (existing && isBudgetParent(existing)) continue
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

  applyCategoryRuleOnCategorize: async (txn, categoryId) => {
    if (!categoryId || !txn || !supabase) return
    const matchPayee = String(txn.payee || txn.merchant || '').trim()
    if (!matchPayee) return
    const matchKey = normalizePayeeKey(matchPayee)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('payee_category_rules')
      .upsert(
        {
          user_id: user.id,
          match_key: matchKey,
          match_payee: matchPayee,
          category_id: categoryId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,match_key' }
      )
      .select('*')
      .single()

    if (error || !data) return

    const rule = mapCategoryRule(data)
    set((state) => {
      const existing = state.categoryRules.filter((r) => r.matchKey !== matchKey)
      return { categoryRules: [...existing, rule] }
    })
  },

  setCategoryRule: async (payeeOrMerchant, categoryId) => {
    const matchPayee = String(payeeOrMerchant || '').trim()
    if (!matchPayee) return { success: false, error: 'Payee is required' }
    if (!categoryId) return { success: false, error: 'Category is required' }

    const matchKey = normalizePayeeKey(matchPayee)

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return { success: false, error: 'Not signed in' }

      const { data, error } = await supabase
        .from('payee_category_rules')
        .upsert(
          {
            user_id: user.id,
            match_key: matchKey,
            match_payee: matchPayee,
            category_id: categoryId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,match_key' }
        )
        .select('*')
        .single()

      if (error) return { success: false, error: error.message }

      set((state) => {
        const existing = state.categoryRules.filter((r) => r.matchKey !== matchKey)
        return { categoryRules: [...existing, mapCategoryRule(data)] }
      })
    } else {
      set((state) => {
        const existing = state.categoryRules.filter((r) => r.matchKey !== matchKey)
        return {
          categoryRules: [
            ...existing,
            { id: matchKey, matchKey, matchPayee, categoryId },
          ],
        }
      })
    }

    const matching = get().transactions.filter(
      (t) =>
        !t.categoryId &&
        !isPureTransfer(t) &&
        !t.isSplit &&
        normalizePayeeKey(t.merchant || t.payee) === matchKey
    )

    for (const txn of matching) {
      await get().categorizeTransaction(txn.id, categoryId, { skipRuleUpsert: true })
    }

    return { success: true }
  },

  categorizeTransaction: async (transactionId, categoryId, opts = {}) => {
    const resolvedId = categoryId
      ? resolveToLeafCategoryId(get().categories, categoryId) || categoryId
      : null
    const txn = get().transactions.find((t) => t.id === transactionId)
    const category = resolvedId
      ? get().categories.find((c) => c.id === resolvedId)
      : null
    const categoriesById = Object.fromEntries(
      get().categories.map((c) => [c.id, c])
    )
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === transactionId
          ? {
              ...t,
              categoryId: resolvedId || null,
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
        category_id: resolvedId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (error) return { success: false, error: error.message }

    if (resolvedId && txn && !opts.skipRuleUpsert) {
      await get().applyCategoryRuleOnCategorize(txn, resolvedId)
    }

    if (resolvedId && txn) {
      const account = get().accounts.find((a) => a.id === txn.accountId)
      const cat = get().categories.find((c) => c.id === resolvedId)
      if (
        account?.type === 'credit' &&
        txn.amount > 0 &&
        cat?.type === 'expense' &&
        account.creditCardCategoryId
      ) {
        const { useBudgetStore } = await import('./budgetStore')
        const budget = useBudgetStore.getState()
        const available = budget.getAvailableFor(resolvedId)
        const moveAmt = Math.min(absAmount(txn.amount), Math.max(0, available))
        if (moveAmt > 0) {
          await budget.moveMoney(resolvedId, account.creditCardCategoryId, moveAmt)
        }
      }
    }

    return { success: true }
  },

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
    const displayPayee = resolvePayeeDisplay(cleanPayee, get().payeeRules)
    const value = signedAmount(amount, inflow)

    let resolvedCategoryId = categoryId
    if (!resolvedCategoryId) {
      resolvedCategoryId = resolveCategoryFromRules(cleanPayee, get().categoryRules)
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: accountId,
        date: date || new Date().toISOString().slice(0, 10),
        amount: value,
        merchant: cleanPayee,
        payee: displayPayee,
        category_id: resolvedCategoryId,
        memo: memo || null,
        description: displayPayee,
        status: 'posted',
        cleared: true,
      })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    const accountsById = Object.fromEntries(get().accounts.map((a) => [a.id, a]))
    const categoriesById = Object.fromEntries(get().categories.map((c) => [c.id, c]))
    const mapped = mapTransaction(data, accountsById, categoriesById)
    set((state) => ({
      transactions: [mapped, ...state.transactions],
    }))

    await syncManualAccountBalance(get, set, accountId, -value)

    return { success: true, transaction: mapped }
  },

  createTransfer: async ({ date, amount, fromAccountId, toAccountId, memo = '' }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }
    if (!fromAccountId || !toAccountId) {
      return { success: false, error: 'Both accounts are required' }
    }
    if (fromAccountId === toAccountId) {
      return { success: false, error: 'Accounts must differ' }
    }

    const value = Math.abs(Number(amount) || 0)
    if (value === 0) return { success: false, error: 'Amount is required' }

    const txnDate = date || new Date().toISOString().slice(0, 10)
    const memoVal = memo || null

    const { data: outRow, error: outErr } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: fromAccountId,
        date: txnDate,
        amount: value,
        merchant: 'Transfer',
        payee: 'Transfer',
        memo: memoVal,
        description: 'Transfer',
        status: 'posted',
        cleared: true,
        transfer_account_id: toAccountId,
      })
      .select('*')
      .single()

    if (outErr) return { success: false, error: outErr.message }

    const { data: inRow, error: inErr } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: toAccountId,
        date: txnDate,
        amount: -value,
        merchant: 'Transfer',
        payee: 'Transfer',
        memo: memoVal,
        description: 'Transfer',
        status: 'posted',
        cleared: true,
        transfer_account_id: fromAccountId,
        transfer_transaction_id: outRow.id,
      })
      .select('*')
      .single()

    if (inErr) {
      await supabase.from('transactions').delete().eq('id', outRow.id)
      return { success: false, error: inErr.message }
    }

    await supabase
      .from('transactions')
      .update({ transfer_transaction_id: inRow.id })
      .eq('id', outRow.id)

    const accountsById = Object.fromEntries(get().accounts.map((a) => [a.id, a]))
    const categoriesById = Object.fromEntries(get().categories.map((c) => [c.id, c]))
    const outMapped = mapTransaction(
      { ...outRow, transfer_transaction_id: inRow.id },
      accountsById,
      categoriesById
    )
    const inMapped = mapTransaction(inRow, accountsById, categoriesById)

    set((state) => ({
      transactions: [outMapped, inMapped, ...state.transactions],
    }))

    await syncManualAccountBalance(get, set, fromAccountId, -value)
    await syncManualAccountBalance(get, set, toAccountId, value)

    return { success: true, outflow: outMapped, inflow: inMapped }
  },

  setSplits: async (transactionId, splits) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    const txn = get().transactions.find((t) => t.id === transactionId)
    if (!txn) return { success: false, error: 'Transaction not found' }

    const parentAbs = absAmount(txn.amount)
    const sum = (splits || []).reduce(
      (s, sp) => s + Math.abs(Number(sp.amount) || 0),
      0
    )
    if (Math.abs(sum - parentAbs) > 0.01) {
      return { success: false, error: 'Split amounts must equal the transaction amount' }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    await supabase.from('transaction_splits').delete().eq('transaction_id', transactionId)

    const rows = (splits || []).map((sp, i) => ({
      user_id: user.id,
      transaction_id: transactionId,
      category_id: sp.categoryId || null,
      amount: Math.abs(Number(sp.amount) || 0),
      memo: sp.memo || null,
      sort_order: i,
    }))

    let inserted = []
    if (rows.length > 0) {
      const { data, error } = await supabase
        .from('transaction_splits')
        .insert(rows)
        .select('*')
      if (error) return { success: false, error: error.message }
      inserted = data || []
    }

    const { error: txnError } = await supabase
      .from('transactions')
      .update({
        is_split: rows.length > 0,
        category_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (txnError) return { success: false, error: txnError.message }

    const mappedSplits = inserted.map(mapSplit)
    const categoriesById = Object.fromEntries(get().categories.map((c) => [c.id, c]))
    const enriched = mappedSplits.map((s) => enrichSplit(s, categoriesById))

    set((state) => {
      const otherSplits = state.splits.filter((s) => s.transactionId !== transactionId)
      return {
        splits: [...otherSplits, ...mappedSplits],
        transactions: state.transactions.map((t) =>
          t.id === transactionId
            ? {
                ...t,
                isSplit: enriched.length > 0,
                categoryId: null,
                category: 'Uncategorized',
                categoryEmoji: '',
                parentCategoryName: null,
                splits: enriched,
              }
            : t
        ),
      }
    })

    return { success: true, splits: enriched }
  },

  clearSplits: async (transactionId) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    await supabase.from('transaction_splits').delete().eq('transaction_id', transactionId)

    const { error } = await supabase
      .from('transactions')
      .update({
        is_split: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (error) return { success: false, error: error.message }

    set((state) => ({
      splits: state.splits.filter((s) => s.transactionId !== transactionId),
      transactions: state.transactions.map((t) =>
        t.id === transactionId ? { ...t, isSplit: false, splits: [] } : t
      ),
    }))

    return { success: true }
  },

  deleteTransaction: async (transactionId) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    const txn = get().transactions.find((t) => t.id === transactionId)
    if (!txn) return { success: false, error: 'Transaction not found' }

    const pairId = txn.transferTransactionId
    const pair = pairId ? get().transactions.find((t) => t.id === pairId) : null
    const toDelete = [transactionId, pairId].filter(Boolean)

    await supabase.from('transaction_splits').delete().in('transaction_id', toDelete)

    const { error } = await supabase.from('transactions').delete().in('id', toDelete)
    if (error) return { success: false, error: error.message }

    set((state) => ({
      splits: state.splits.filter((s) => !toDelete.includes(s.transactionId)),
      transactions: state.transactions.filter((t) => !toDelete.includes(t.id)),
      selectedIds: state.selectedIds.filter((id) => !toDelete.includes(id)),
    }))

    await syncManualAccountBalance(get, set, txn.accountId, txn.amount)
    if (pair) {
      await syncManualAccountBalance(get, set, pair.accountId, pair.amount)
    }

    return { success: true }
  },

  updateTransaction: async ({
    id,
    date,
    amount,
    payee,
    accountId,
    memo,
    categoryId,
    inflow,
  }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    const old = get().transactions.find((t) => t.id === id)
    if (!old) return { success: false, error: 'Transaction not found' }

    const payload = { updated_at: new Date().toISOString() }
    if (date !== undefined) payload.date = date
    if (amount !== undefined) payload.amount = signedAmount(amount, inflow)
    if (payee !== undefined) {
      const cleanPayee = String(payee).trim() || 'Unknown'
      payload.merchant = cleanPayee
      payload.payee = resolvePayeeDisplay(cleanPayee, get().payeeRules)
      payload.description = payload.payee
    }
    if (accountId !== undefined) payload.account_id = accountId
    if (memo !== undefined) payload.memo = memo || null
    if (categoryId !== undefined) payload.category_id = categoryId || null

    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    const accountsById = Object.fromEntries(get().accounts.map((a) => [a.id, a]))
    const categoriesById = Object.fromEntries(get().categories.map((c) => [c.id, c]))
    const mapped = mapTransaction(
      data,
      accountsById,
      categoriesById,
      old.splits || []
    )

    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? mapped : t)),
    }))

    const oldAccountId = old.accountId
    const newAccountId = accountId !== undefined ? accountId : old.accountId
    const oldAmount = Number(old.amount) || 0
    const newAmount = amount !== undefined ? signedAmount(amount, inflow) : oldAmount

    if (oldAccountId === newAccountId) {
      const delta = oldAmount - newAmount
      if (delta !== 0) {
        await syncManualAccountBalance(get, set, newAccountId, delta)
      }
    } else {
      await syncManualAccountBalance(get, set, oldAccountId, oldAmount)
      await syncManualAccountBalance(get, set, newAccountId, -newAmount)
    }

    return { success: true, transaction: mapped }
  },

  getUncategorizedTransactions: () => {
    return get().transactions.filter((t) => {
      if (isPureTransfer(t)) return false
      if (t.isSplit) return (t.splits || []).some((s) => !s.categoryId)
      return !t.categoryId
    })
  },

  ensureCreditCardCategory: async (account) => {
    if (!account || account.type !== 'credit') return { success: true }
    if (account.creditCardCategoryId) {
      return { success: true, categoryId: account.creditCardCategoryId }
    }
    if (!supabase) return { success: false, error: 'Supabase not configured' }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }

    let group = get().categories.find(
      (c) => c.name === 'Credit Card Payments' && !c.parentId && c.type === 'expense'
    )

    if (!group) {
      const siblings = get().categories.filter((c) => !c.parentId && c.type === 'expense')
      const sortOrder =
        siblings.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0) + 1

      const { data: groupRow, error: groupErr } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: 'Credit Card Payments',
          type: 'expense',
          icon: '💳',
          color: '#6366f1',
          custom: true,
          sort_order: sortOrder,
        })
        .select('*')
        .single()

      if (groupErr) return { success: false, error: groupErr.message }
      group = mapCategory(groupRow)
      set((state) => ({ categories: [...state.categories, group] }))
    }

    const leafSiblings = get().categories.filter((c) => c.parentId === group.id)
    const leafSort =
      leafSiblings.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0) + 1

    const { data: leafRow, error: leafErr } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: account.name,
        type: 'expense',
        icon: '💳',
        color: '#6366f1',
        parent_id: group.id,
        is_cc_payment: true,
        linked_account_id: account.id,
        custom: true,
        sort_order: leafSort,
      })
      .select('*')
      .single()

    if (leafErr) return { success: false, error: leafErr.message }

    const leaf = mapCategory(leafRow)

    const { error: acctErr } = await supabase
      .from('accounts')
      .update({ credit_card_category_id: leaf.id })
      .eq('id', account.id)

    if (acctErr) return { success: false, error: acctErr.message }

    const updatedAccount = { ...account, creditCardCategoryId: leaf.id }
    set((state) => ({
      categories: [...state.categories, leaf],
      accounts: state.accounts.map((a) =>
        a.id === account.id ? updatedAccount : a
      ),
    }))

    try {
      const { useAccountStore } = await import('./accountStore')
      useAccountStore.setState((state) => ({
        linkedAccounts: state.linkedAccounts.map((a) =>
          a.id === account.id ? { ...a, creditCardCategoryId: leaf.id } : a
        ),
      }))
    } catch {
      // accountStore may not be loaded yet
    }

    return { success: true, categoryId: leaf.id, category: leaf }
  },

  getFilteredTransactions: () => {
    const state = get()
    const { search, category, accountId, dateFrom, dateTo, status, uncategorizedOnly } =
      state.filter

    return state.transactions
      .filter((t) => {
        if (uncategorizedOnly) {
          const uncat =
            !isPureTransfer(t) &&
            ((!t.categoryId && !t.isSplit) ||
              (t.isSplit && (t.splits || []).some((s) => !s.categoryId)))
          if (!uncat) return false
        }
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
      .sort((a, b) => {
        // Uncleared first (needs review), then newest date
        const ac = a.cleared === false ? 0 : 1
        const bc = b.cleared === false ? 0 : 1
        if (ac !== bc) return ac - bc
        return new Date(b.date) - new Date(a.date)
      })
  },
}))
