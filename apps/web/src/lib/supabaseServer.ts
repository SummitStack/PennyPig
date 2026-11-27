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

/**
 * A server-only client with the service role, or null when
 * SUPABASE_SERVICE_ROLE_KEY isn't set. Never import this into browser code.
 * Callers must filter by the signed-in user's id themselves.
 */
export function serviceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Ensure public.users + default categories via security-definer RPC. */
export async function ensureUserProfile(supabase: SupabaseClient, _user?: User) {
  const { error } = await supabase.rpc('ensure_user_defaults')
  if (error) throw new Error(error.message)
}

export function mapPlaidAccountType(type?: string, subtype?: string) {
  const kind = String(type || '').toLowerCase()
  const value = (subtype || type || 'other').toLowerCase()
  // Mortgages, student, auto and other loans are debts. Before this they fell
  // through to 'other' and counted toward net worth as money the user has.
  if (kind === 'loan' || /mortgage|loan|student|auto|home equity|line of credit/.test(value)) {
    return value.includes('credit card') ? 'credit' : 'loan'
  }
  if (kind === 'credit' || value.includes('credit')) return 'credit'
  if (value.includes('saving')) return 'savings'
  if (value.includes('checking')) return 'checking'
  if (value.includes('debit') || value === 'depository') return 'debit'
  return 'other'
}

/** Loans and investments are tracked for net worth but kept out of the budget. */
export function plaidAccountOnBudget(type?: string) {
  const kind = String(type || '').toLowerCase()
  return kind !== 'loan' && kind !== 'investment'
}
