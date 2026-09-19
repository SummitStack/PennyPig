import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function mapAccount(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.account_type,
    plaidAccountId: row.plaid_account_id,
    plaidItemId: row.plaid_item_id,
    accountNumber: row.mask ? `****${row.mask}` : '••••',
    institution: row.institution_name || 'Linked account',
    balance: Number(row.balance) || 0,
    lastSynced: row.last_synced ? new Date(row.last_synced) : null,
    status: 'active',
  }
}

export const useAccountStore = create((set, get) => ({
  linkedAccounts: [],
  loading: false,
  error: null,
  hydrated: false,

  loadAccounts: async () => {
    if (!supabase) {
      set({ linkedAccounts: [], hydrated: true })
      return
    }

    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      set({
        linkedAccounts: (data || []).map(mapAccount),
        loading: false,
        hydrated: true,
      })
    } catch (err) {
      set({ error: err.message, loading: false, hydrated: true })
    }
  },

  removeAccount: async (accountId) => {
    if (!supabase) {
      set((state) => ({
        linkedAccounts: state.linkedAccounts.filter((acc) => acc.id !== accountId),
      }))
      return { success: true }
    }

    const { error } = await supabase.from('accounts').delete().eq('id', accountId)
    if (error) return { success: false, error: error.message }

    set((state) => ({
      linkedAccounts: state.linkedAccounts.filter((acc) => acc.id !== accountId),
    }))
    return { success: true }
  },

  syncAccount: async (accountId) => {
    // Timestamp bump after successful API sync
    set((state) => ({
      linkedAccounts: state.linkedAccounts.map((acc) =>
        acc.id === accountId ? { ...acc, lastSynced: new Date() } : acc
      ),
    }))
  },
}))
