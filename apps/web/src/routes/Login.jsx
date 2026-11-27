import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import AuthShell, { FormError } from '../components/Auth/AuthShell'
import EmailLinkSignIn from '../components/Auth/EmailLinkSignIn'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, loading, error, signIn } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await signIn(email, password)
    if (result.success) navigate('/')
    setIsSubmitting(false)
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New to PennyPig?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError>{error}</FormError>
        <div>
          <label htmlFor="login-email" className="field-label">Email</label>
          <input
            id="login-email"
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
          <div className="flex items-baseline justify-between">
            <label htmlFor="login-password" className="field-label">Password</label>
            <Link to="/forgot-password" className="text-label-md font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="field"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={isSubmitting || loading} className="btn btn-primary w-full py-2.5">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="mt-4">
        <EmailLinkSignIn email={email} />
      </div>
    </AuthShell>
  )
}
