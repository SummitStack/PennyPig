import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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
      set({ user: session?.user || null, loading: false, error: null })

      supabase.auth.onAuthStateChange((_event, nextSession) => {
        set({ user: nextSession?.user || null, loading: false })
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
