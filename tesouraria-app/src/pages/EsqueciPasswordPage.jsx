import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { mapSupabaseAuthError } from '../utils/supabaseAuthErrors'

function EsqueciPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await requestPasswordReset(email)
      setEnviado(true)
    } catch (e) {
      setError(mapSupabaseAuthError(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
        <div className="w-full max-w-[440px] rounded-lg border border-[#E5E7EB] bg-white p-8 text-center">
          <h1 className="text-[22px] font-medium text-[#111827]">Email enviado</h1>
          <p className="mt-3 text-[14px] text-[#374151]">
            Se existir conta com <strong>{email}</strong>, receberás um link para definir nova
            password.
          </p>
          <p className="mt-2 text-[13px] text-[#6B7280]">Verifica também a pasta de spam.</p>
          <Link
            to="/login"
            className="mt-6 inline-block text-[14px] text-[#1F6FEB] hover:underline"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
      <div className="w-full max-w-[440px] rounded-lg border border-[#E5E7EB] bg-white p-8">
        <h1 className="text-[22px] font-medium text-[#111827]">Esqueci a password</h1>
        <p className="mt-1 text-[14px] text-[#6B7280]">
          Indica o email da conta. Enviaremos um link para escolheres uma nova password.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@nucleo.pt"
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
            {submitting ? 'A enviar...' : 'Enviar link'}
          </button>
        </form>

        <div className="mt-6 border-t border-[#E5E7EB] pt-6 text-center">
          <Link to="/login" className="text-[14px] text-[#1F6FEB] hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default EsqueciPasswordPage
