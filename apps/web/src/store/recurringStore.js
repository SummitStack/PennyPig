import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { advanceDate } from '../lib/recurring'

function mapRow(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    payee: row.payee,
    amount: Number(row.amount) || 0,
    inflow: Boolean(row.inflow),
    categoryId: row.category_id || null,
    memo: row.memo || '',
    frequency: row.frequency,
    nextDate: String(row.next_date).slice(0, 10),
    anchorDay: row.anchor_day || null,
  }
}

/**
 * Recurring transactions. Nothing is entered on its own: due items are shown
 * and the user taps Enter (or Skip). If the table doesn't exist yet (migration
 * not applied), `available` stays false and the feature hides itself.
 */
export const useRecurringStore = create((set, get) => ({
  items: [],
  loaded: false,
  available: false,

  load: async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .order('next_date', { ascending: true })
    if (error) {
      set({ items: [], loaded: true, available: false })
      return
    }
    set({ items: (data || []).map(mapRow), loaded: true, available: true })
  },

  create: async ({ accountId, payee, amount, inflow, categoryId, memo, frequency, nextDate }) => {
    if (!supabase) return { success: false, error: 'Supabase not configured' }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not signed in' }
    const day = Number(String(nextDate).slice(8, 10))
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert({
        user_id: user.id,
        account_id: accountId,
        payee: String(payee || '').trim() || 'Unknown',
        amount: Math.abs(Number(amount) || 0),
        inflow: Boolean(inflow),
        category_id: categoryId || null,
        memo: memo || null,
        frequency,
        next_date: nextDate,
        anchor_day: frequency === 'monthly' || frequency === 'yearly' ? day : null,
      })
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    const item = mapRow(data)
    set((s) => ({
      items: [...s.items, item].sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
    }))
    return { success: true, item }
  },

  remove: async (id) => {
    if (!supabase) return { success: false }
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    set((s) => ({ items: s.items.filter((r) => r.id !== id) }))
    return { success: true }
  },

  /** Move to the next occurrence without entering anything. */
  skip: async (id) => {
    const item = get().items.find((r) => r.id === id)
    if (!item || !supabase) return { success: false }
    const next = advanceDate(item.nextDate, item.frequency, item.anchorDay)
    const { error } = await supabase
      .from('recurring_transactions')
      .update({ next_date: next, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { success: false, error: error.message }
    set((s) => ({
      items: s.items
        .map((r) => (r.id === id ? { ...r, nextDate: next } : r))
        .sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
    }))
    return { success: true }
  },

  /** Record this occurrence as a real transaction, then move to the next one. */
  enter: async (id) => {
    const item = get().items.find((r) => r.id === id)
    if (!item) return { success: false, error: 'Not found' }
    const { useTransactionStore } = await import('./transactionStore')
    const result = await useTransactionStore.getState().createTransaction({
      date: item.nextDate,
      payee: item.payee,
      amount: item.amount,
      inflow: item.inflow,
      categoryId: item.categoryId,
      accountId: item.accountId,
      memo: item.memo,
    })
    if (!result.success) return result
    await get().skip(id)
    return { success: true }
  },
}))
