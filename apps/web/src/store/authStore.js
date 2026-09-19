import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAccountStore } from './accountStore'
import { useTransactionStore } from './transactionStore'
import { useBudgetStore } from './budgetStore'

async function ensureProfile(user) {
  if (!supabase || !user) return

  await supabase.from('users').upsert(
    { id: user.id, email: user.email },
    { onConflict: 'id' }
  )

  const defaults = [
    { name: 'Groceries', type: 'expense', color: '#4ade80' },
    { name: 'Shopping', type: 'expense', color: '#fbbf24' },
    { name: 'Coffee', type: 'expense', color: '#7bd0ff' },
    { name: 'Rent', type: 'expense', color: '#f87171' },
    { name: 'Subscriptions', type: 'expense', color: '#c084fc' },
    { name: 'Gas', type: 'expense', color: '#fb923c' },
    { name: 'Dining', type: 'expense', color: '#f472b6' },
    { name: 'Transportation', type: 'expense', color: '#60a5fa' },
    { name: 'Entertainment', type: 'expense', color: '#a78bfa' },
    { name: 'Living', type: 'expense', color: '#34d399' },
    { name: 'Salary', type: 'income', color: '#4ade80' },
  ]

  await supabase.from('categories').upsert(
    defaults.map((c) => ({
      user_id: user.id,
      name: c.name,
      type: c.type,
      color: c.color,
      custom: false,
    })),
    { onConflict: 'user_id,name', ignoreDuplicates: true }
  )
}

async function hydrateAppData() {
  await useTransactionStore.getState().loadData()
  await Promise.all([
    useAccountStore.getState().loadAccounts(),
    useBudgetStore.getState().loadBudgets(),
  ])
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
        await ensureProfile(session.user)
        set({ user: session.user, loading: false, error: null })
        await hydrateAppData()
      } else {
        set({ user: null, loading: false, error: null })
      }

      supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (nextSession?.user) {
          await ensureProfile(nextSession.user)
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
        await ensureProfile(data.user)
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
      await ensureProfile(data.user)
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

  resetPassword: async (email) => {
    if (!supabase) {
      const message = 'Supabase is not configured'
      set({ error: message, loading: false })
      return { success: false, error: message }
    }

    set({ loading: true, error: null })
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      set({ loading: false })
      return { success: true }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  clearError: () => set({ error: null }),
}))
