import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthShell, { FormError } from '../components/Auth/AuthShell'
import Icon from '../components/ui/Icon'

/** Sends a password reset link. The link opens /reset-password signed in for recovery. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase) {
      setError('Sign-in is not configured.')
      return
    }
    setSending(true)
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSending(false)
    // Same message whether or not the address has an account, so the form
    // can't be used to find out who has signed up.
    if (err && !/not found|no user/i.test(err.message)) setError(err.message)
    else setSent(true)
  }

  return (
    <AuthShell
      title={sent ? 'Check your email' : 'Reset your password'}
      subtitle={
        sent
          ? `If ${email.trim()} has an account, a reset link is on its way.`
          : "Enter your email and we'll send you a link to set a new password."
      }
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="flex items-start gap-3 rounded-xl bg-primary/10 p-4 text-body-sm text-on-surface">
          <Icon name="mark_email_read" className="text-[22px] text-primary" />
          <p>Open the link on this device. It expires in an hour.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormError>{error}</FormError>
          <div>
            <label htmlFor="forgot-email" className="field-label">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="field"
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" disabled={sending} className="btn btn-primary w-full py-2.5">
            {sending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
