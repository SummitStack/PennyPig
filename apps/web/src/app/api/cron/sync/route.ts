import { NextRequest, NextResponse } from 'next/server'
import { syncPlaidItem } from '../../../../lib/plaidSync'
import { serviceRoleClient } from '../../../../lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Daily sync of every linked bank, run by Vercel Cron (see vercel.json).
 * Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is refused,
 * and with no CRON_SECRET set the route does nothing.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = serviceRoleClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 })
  }

  const { data: items, error } = await admin.from('plaid_items').select('id, user_id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = []
  for (const item of items || []) {
    try {
      const r = await syncPlaidItem(admin, item.user_id, item.id, admin)
      results.push({
        item: item.id,
        synced: r.synced,
        removed: r.removed,
        startingBalances: r.startingBalances,
        ok: !r.error,
        reconnect: Boolean((r.error as { needsReconnect?: boolean } | null)?.needsReconnect),
      })
    } catch (err) {
      results.push({ item: item.id, ok: false, error: err instanceof Error ? err.message : 'failed' })
    }
  }

  return NextResponse.json({ items: results.length, results })
}
