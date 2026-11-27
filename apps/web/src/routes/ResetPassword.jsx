import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthShell, { FormError } from '../components/Auth/AuthShell'

/** Landing page for the reset link: the link signs the user in, then they pick a new password. */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setChecked(true)
      return undefined
    }
    let cancelled = false
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    // The client reads the token from the link on load; give it a moment.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) setReady(true)
      setChecked(true)
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(t)
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) setError(err.message)
    else navigate('/')
  }

  const expired = checked && !ready

  return (
    <AuthShell
      title={expired ? 'Link expired' : 'Set a new password'}
      subtitle={
        expired
          ? 'This reset link is no longer valid. Ask for a new one.'
          : 'Pick a password you haven’t used here before.'
      }
      footer={
        <Link to={expired ? '/forgot-password' : '/login'} className="font-semibold text-primary hover:underline">
          {expired ? 'Send a new link' : 'Back to sign in'}
        </Link>
      }
    >
      {!expired && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormError>{error}</FormError>
          <div>
            <label htmlFor="reset-password" className="field-label">
              New password
            </label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="field-label">
              Confirm password
            </label>
            <input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="field"
            />
          </div>
          <button type="submit" disabled={saving || !ready} className="btn btn-primary w-full py-2.5">
            {saving ? 'Saving…' : 'Save password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
