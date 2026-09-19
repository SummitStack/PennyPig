import { supabase } from './supabase'

/** Authenticated fetch that attaches the current Supabase session JWT when available. */
export async function authFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
