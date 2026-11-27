import { useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * "Email me a sign-in link": signs in (or signs up, when createUser is set)
 * without a password. Supabase emails a one-time link that lands back on the
 * app already signed in. Uses the email typed in the form above it.
 */
export default function EmailLinkSignIn({ email, createUser = false }) {
  const [state, setState] = useState('idle') // idle | sending | sent
  const [error, setError] = useState(null)

  const send = async () => {
    const address = String(email || '').trim()
    if (!address) {
      setError('Enter your email above first.')
      return
    }
    if (!supabase) {
      setError('Supabase is not configured')
      return
    }
    setError(null)
    setState('sending')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: createUser,
        emailRedirectTo: `${window.location.origin}/`,
      },
    })
    if (err) {
      setError(
        /signups not allowed|user not found/i.test(err.message)
          ? 'No account uses that email yet. Create one first.'
          : err.message
      )
      setState('idle')
      return
    }
    setState('sent')
  }

  return (
    <div className="space-y-3" data-testid="email-link">
      <div className="flex items-center gap-3 text-label-md text-on-surface-variant">
        <span className="h-px flex-1 bg-border-hairline" />
        or
        <span className="h-px flex-1 bg-border-hairline" />
      </div>
      {state === 'sent' ? (
        <p role="status" className="rounded-xl bg-primary/10 px-3 py-2.5 text-body-sm text-on-surface">
          Check {String(email).trim()} for a sign-in link. It works once and expires in an hour.
        </p>
      ) : (
        <button
          type="button"
          onClick={send}
          disabled={state === 'sending'}
          className="btn btn-secondary w-full py-2.5"
        >
          {state === 'sending' ? 'Sending…' : createUser ? 'Sign up with an email link' : 'Email me a sign-in link'}
        </button>
      )}
      {error && <p className="text-label-md text-status-error">{error}</p>}
    </div>
  )
}
