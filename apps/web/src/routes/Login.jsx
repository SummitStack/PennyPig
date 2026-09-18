import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, loading, error, signIn } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await signIn(email, password)
    if (result.success) {
      navigate('/')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-headline-lg font-bold text-on-surface">PennyPig</h1>
          <p className="text-body-md text-on-surface-variant mt-2">Smart budgeting made simple</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-surface-container p-8 rounded-lg border border-border-hairline">
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

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full py-2 bg-primary text-surface rounded font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Sign up link */}
        <p className="text-center text-body-sm text-on-surface-variant">
          Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
