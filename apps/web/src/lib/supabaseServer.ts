import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export type AuthedRequest = {
  user: User
  token: string
  supabase: SupabaseClient
  error: null
}

export async function requireAuthedClient(
  request: NextRequest
): Promise<AuthedRequest | { user: null; token: null; supabase: null; error: NextResponse }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      user: null,
      token: null,
      supabase: null,
      error: NextResponse.json(
        { error: 'Supabase is not configured on the server' },
        { status: 500 }
      ),
    }
  }

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null

  if (!token) {
    return {
      user: null,
      token: null,
      supabase: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return {
      user: null,
      token: null,
      supabase: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { user, token, supabase, error: null }
}

/** Ensure public.users + default categories exist for this auth user. */
export async function ensureUserProfile(supabase: SupabaseClient, user: User) {
  const { error: userError } = await supabase.from('users').upsert(
    { id: user.id, email: user.email },
    { onConflict: 'id' }
  )
  if (userError) throw new Error(userError.message)

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

  const { error: catError } = await supabase.from('categories').upsert(
    defaults.map((c) => ({
      user_id: user.id,
      name: c.name,
      type: c.type,
      color: c.color,
      custom: false,
    })),
    { onConflict: 'user_id,name', ignoreDuplicates: true }
  )
  if (catError) throw new Error(catError.message)
}

export function mapPlaidAccountType(type?: string, subtype?: string) {
  const value = (subtype || type || 'other').toLowerCase()
  if (value.includes('credit')) return 'credit'
  if (value.includes('saving')) return 'savings'
  if (value.includes('checking')) return 'checking'
  if (value.includes('debit') || value === 'depository') return 'debit'
  return 'other'
}
