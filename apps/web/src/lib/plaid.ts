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
