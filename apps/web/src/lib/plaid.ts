const PLAID_HOSTS: Record<string, string> = {
  sandbox: 'sandbox.plaid.com',
  development: 'development.plaid.com',
  production: 'production.plaid.com',
}

export function getPlaidConfig() {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET
  const env = process.env.PLAID_ENV || 'sandbox'

  if (!clientId || !secret) {
    throw new Error('Missing PLAID_CLIENT_ID or PLAID_SECRET environment variables')
  }

  const host = PLAID_HOSTS[env] || PLAID_HOSTS.sandbox

  return { clientId, secret, env, host }
}

export async function plaidRequest(path: string, body: Record<string, unknown>) {
  const { clientId, secret, host } = getPlaidConfig()

  const response = await fetch(`https://${host}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      ...body,
    }),
  })

  const data = await response.json()
  return { response, data }
}

/**
 * Plaid errors that mean the bank connection itself needs the user: they have
 * to sign in to their bank again through Plaid Link (update mode). Retrying a
 * sync can't fix these.
 */
const RECONNECT_CODES = new Set([
  'ITEM_LOGIN_REQUIRED',
  'PENDING_EXPIRATION',
  'PENDING_DISCONNECT',
  'INVALID_UPDATED_USERNAME',
  'USER_PERMISSION_REVOKED',
  'ACCESS_NOT_GRANTED',
])

export class PlaidApiError extends Error {
  code: string | null
  needsReconnect: boolean

  constructor(code: string | null, message: string) {
    super(message)
    this.name = 'PlaidApiError'
    this.code = code
    this.needsReconnect = Boolean(code && RECONNECT_CODES.has(code))
  }
}

/** Plain-language text for a Plaid error, instead of Plaid's own wording. */
export function friendlyPlaidMessage(code: string | null, fallback: string): string {
  if (code && RECONNECT_CODES.has(code)) {
    return 'Your bank needs you to sign in again before PennyPig can sync. Tap Reconnect.'
  }
  switch (code) {
    case 'INSTITUTION_DOWN':
    case 'INSTITUTION_NOT_RESPONDING':
    case 'INSTITUTION_NO_LONGER_SUPPORTED':
      return 'Your bank is not responding right now. Try again later.'
    case 'PRODUCT_NOT_READY':
      return 'Your bank is still preparing transactions. Try again in a few minutes.'
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many sync requests. Wait a minute and try again.'
    default:
      return fallback
  }
}

/** Throws a PlaidApiError when a Plaid response failed. */
export function assertPlaidOk(
  response: Response,
  data: { error_code?: string; error_message?: string },
  fallback: string
): void {
  if (response.ok) return
  const code = data?.error_code || null
  throw new PlaidApiError(code, friendlyPlaidMessage(code, data?.error_message || fallback))
}
