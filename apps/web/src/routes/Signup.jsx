import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function SignupPage() {
  const navigate = useNavigate()
  const { user, loading, error, signUp } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    setIsSubmitting(true)
    const result = await signUp(email, password)
    if (result.success) {
      navigate('/')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mb-space-sm flex items-center justify-center gap-space-sm">
            <span className="material-symbols-outlined text-[28px] text-secondary">savings</span>
            <h1 className="text-headline-lg font-bold tracking-tight text-on-surface">Create Account</h1>
          </div>
          <p className="text-body-md text-on-surface-variant">Start managing your budget today</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-border-hairline bg-surface-base p-8 shadow-sm"
        >
          {error && (
            <div className="p-4 bg-status-error bg-opacity-10 border border-status-error rounded text-status-error text-body-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-label-md text-on-surface-variant mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-surface border border-border-hairline rounded text-on-surface focus:outline-none focus:border-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-label-md text-on-surface-variant mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-surface border border-border-hairline rounded text-on-surface focus:outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-label-md text-on-surface-variant mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 bg-surface border border-border-hairline rounded text-on-surface focus:outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full py-2 bg-primary text-surface rounded font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-body-sm text-on-surface-variant">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
