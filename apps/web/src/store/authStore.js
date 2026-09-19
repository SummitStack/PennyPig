import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAccountStore } from './accountStore'
import { useTransactionStore } from './transactionStore'
import { useBudgetStore } from './budgetStore'

async function ensureProfile() {
  if (!supabase) return
  const { error } = await supabase.rpc('ensure_user_defaults')
  if (error) throw error
}

async function hydrateAppData() {
  await useTransactionStore.getState().loadData()
  await Promise.all([
    useAccountStore.getState().loadAccounts(),
    useBudgetStore.getState().loadBudgets(),
  ])
  await useBudgetStore.getState().loadBudgetHistory()
}

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,
  configured: isSupabaseConfigured,

  initAuth: async () => {
    if (!supabase) {
      set({ user: null, loading: false, error: 'Supabase is not configured' })
      return
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        await ensureProfile()
        set({ user: session.user, loading: false, error: null })
        await hydrateAppData()
      } else {
        set({ user: null, loading: false, error: null })
      }

      supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (nextSession?.user) {
          await ensureProfile()
          set({ user: nextSession.user, loading: false })
          await hydrateAppData()
        } else {
          set({ user: null, loading: false })
          useTransactionStore.setState({
            transactions: [],
            categories: [],
            accounts: [],
            hydrated: false,
          })
          useAccountStore.setState({ linkedAccounts: [], hydrated: false })
          useBudgetStore.setState({ budgets: {}, budgetIds: {}, hydrated: false })
        }
      })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  signUp: async (email, password) => {
    if (!supabase) {
      const message = 'Supabase is not configured'
      set({ error: message, loading: false })
      return { success: false, error: message }
    }

    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (data.user) {
        await ensureProfile()
        await hydrateAppData()
      }
      set({ user: data.user, loading: false })
      return { success: true }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  signIn: async (email, password) => {
    if (!supabase) {
      const message = 'Supabase is not configured'
      set({ error: message, loading: false })
      return { success: false, error: message }
    }

    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await ensureProfile()
      await hydrateAppData()
      set({ user: data.user, loading: false })
      return { success: true }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  signOut: async () => {
    if (!supabase) {
      set({ user: null, loading: false })
      return { success: true }
    }

    set({ loading: true, error: null })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ user: null, loading: false })
      return { success: true }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  clearError: () => set({ error: null }),
}))
