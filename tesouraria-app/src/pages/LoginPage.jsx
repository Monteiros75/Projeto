import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { mapSupabaseAuthError } from '../utils/supabaseAuthErrors'

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/dashboard'
  const successMessage = location.state?.message || ''

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (loginError) {
      setError(mapSupabaseAuthError(loginError))
      console.error(loginError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-[24px] font-medium text-[#111827]">Tesouraria Estudantil</h1>
          <p className="text-[14px] text-[#6B7280]">Sistema de controlo de movimentos financeiros</p>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white p-8">
          <h2 className="mb-6 text-[20px] font-medium text-[#111827]">Entrar</h2>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-[14px] text-[#111827]">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@nucleo.pt"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 text-[#111827] placeholder:text-[#9CA3AF] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[14px] text-[#111827]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-10 pr-4 text-[#111827] placeholder:text-[#9CA3AF] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
                  required
                />
              </div>
            </div>

            {successMessage ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {successMessage}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#1F6FEB] py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#1557C0]"
            >
              {submitting ? 'A entrar...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/esqueci-password" className="text-[13px] text-[#1F6FEB] hover:underline">
              Esqueci a password
            </Link>
          </div>

          <div className="mt-6 border-t border-[#E5E7EB] pt-6 text-center">
            <Link to="/registo" className="text-[14px] text-[#1F6FEB] hover:underline">
              Criar conta do núcleo
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
