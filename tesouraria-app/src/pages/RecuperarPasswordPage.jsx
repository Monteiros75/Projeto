import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabase/supabaseClient'
import { mapSupabaseAuthError } from '../utils/supabaseAuthErrors'

function RecuperarPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [linkValido, setLinkValido] = useState(false)
  const [aVerificar, setAVerificar] = useState(true)

  useEffect(() => {
    let cancelled = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setLinkValido(true)
        setAVerificar(false)
      }
    })

    async function verificarLink() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) {
        setLinkValido(true)
        setAVerificar(false)
        return
      }
      const hash = window.location.hash
      if (!hash.includes('access_token')) {
        setAVerificar(false)
      }
    }

    void verificarLink()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

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
      await updatePassword(password)
      await supabase.auth.signOut()
      navigate('/login', {
        replace: true,
        state: { message: 'Password atualizada. Podes entrar com a nova password.' },
      })
    } catch (e) {
      setError(mapSupabaseAuthError(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (aVerificar) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
        <p className="text-[14px] text-[#6B7280]">A verificar link...</p>
      </div>
    )
  }

  if (!linkValido) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
        <div className="w-full max-w-[440px] rounded-lg border border-[#E5E7EB] bg-white p-8 text-center">
          <h1 className="text-[20px] font-medium text-[#111827]">Link inválido ou expirado</h1>
          <p className="mt-2 text-[14px] text-[#6B7280]">
            Pede um novo link de recuperação de password.
          </p>
          <Link
            to="/esqueci-password"
            className="mt-6 inline-block rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white hover:bg-[#1557C0]"
          >
            Pedir novo link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
      <div className="w-full max-w-[440px] rounded-lg border border-[#E5E7EB] bg-white p-8">
        <h1 className="text-[22px] font-medium text-[#111827]">Nova password</h1>
        <p className="mt-1 text-[14px] text-[#6B7280]">Escolhe uma nova password para a tua conta.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova password"
              className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar password"
              className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#1F6FEB] py-2.5 text-[14px] font-medium text-white hover:bg-[#1557C0] disabled:opacity-50"
          >
            {submitting ? 'A guardar...' : 'Guardar nova password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default RecuperarPasswordPage
