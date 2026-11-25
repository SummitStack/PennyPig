import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import AuthShell, { FormError } from '../components/Auth/AuthShell'

export default function SignupPage() {
  const navigate = useNavigate()
  const { user, loading, error, signUp } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [checkEmail, setCheckEmail] = useState(false)

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    const result = await signUp(email, password)
    setIsSubmitting(false)
    if (result.needsConfirmation) {
      setCheckEmail(true)
      return
    }
    if (result.success) navigate('/')
  }

  if (checkEmail) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}. Open it, then sign in.`}
        footer={
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="material-symbols-rounded text-[28px]">mark_email_read</span>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your budget in a couple of minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError>{localError || error}</FormError>
        <div>
          <label htmlFor="signup-email" className="field-label">Email</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="field-label">Password</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="field"
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label htmlFor="signup-confirm" className="field-label">Confirm password</label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="field"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={isSubmitting || loading} className="btn btn-primary w-full py-2.5">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
