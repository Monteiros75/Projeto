import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { mapSupabaseAuthError } from '../utils/supabaseAuthErrors'

function RegisterPage() {
  const { user, registerNucleo } = useAuth()
  const navigate = useNavigate()
  const [nomeNucleo, setNomeNucleo] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)
  const [emailRegisto, setEmailRegisto] = useState('')

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  if (emailEnviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
        <div className="w-full max-w-[460px] rounded-lg border border-[#E5E7EB] bg-white p-8 text-center">
          <h1 className="text-[22px] font-medium text-[#111827]">Confirma o teu email</h1>
          <p className="mt-3 text-[14px] text-[#374151]">
            Enviámos um link de confirmação para <strong>{emailRegisto}</strong>.
          </p>
          <p className="mt-2 text-[13px] text-[#6B7280]">
            Abre o email, clica em confirmar e depois entra na aplicação. Verifica também a pasta
            de spam.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white hover:bg-[#1557C0]"
          >
            Ir para entrar
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As passwords não coincidem.')
      return
    }

    setSubmitting(true)
    try {
      const result = await registerNucleo({ nomeNucleo, email, password })
      if (result?.needsEmailConfirmation) {
        setEmailRegisto(email)
        setEmailEnviado(true)
        return
      }
      navigate('/configuracoes/perfil', { replace: true })
    } catch (registerError) {
      setError(mapSupabaseAuthError(registerError))
      console.error(registerError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
      <div className="w-full max-w-[460px] rounded-lg border border-[#E5E7EB] bg-white p-8">
        <h1 className="text-[24px] font-medium text-[#111827]">Criar conta do núcleo</h1>
        <p className="mt-1 text-[14px] text-[#6B7280]">Regista o núcleo para começar a usar a plataforma.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            value={nomeNucleo}
            onChange={(event) => setNomeNucleo(event.target.value)}
            placeholder="Nome do núcleo"
            className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            required
          />

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirmar password"
              className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#1F6FEB] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1557C0]"
          >
            {submitting ? 'A criar conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="mt-6 border-t border-[#E5E7EB] pt-6 text-center">
          <Link to="/login" className="text-sm text-[#1F6FEB] hover:underline">
            Já tens conta? Entrar
          </Link>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
