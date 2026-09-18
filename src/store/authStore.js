import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  error: null,

  // Initialize auth state on app load
  initAuth: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ user: session?.user || null, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // Sign up
  signUp: async (email, password) => {
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

  // Sign in
  signIn: async (email, password) => {
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

  // Sign out
  signOut: async () => {
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

  // Reset password
  resetPassword: async (email) => {
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
  }
}))
