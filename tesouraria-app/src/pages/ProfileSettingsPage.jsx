import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { STORAGE_BUCKET, supabase } from '../supabase/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { mapSupabaseSaveError } from '../utils/supabaseAuthErrors'
import { formatIban, isValidIban, normalizeIban } from '../lib/iban'

function sanitizeFileName(name) {
  return name.replace(/[^\w.-]/g, '_')
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500'

function Card({ title, description, children }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-[15px] font-medium text-gray-900">{title}</h3>
        {description ? <p className="mt-0.5 text-[13px] text-gray-500">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-gray-700">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-gray-400">{hint}</span> : null}
    </label>
  )
}

function ProfileSettingsPage() {
  const navigate = useNavigate()
  const {
    user,
    nucleoProfile,
    profileLoading,
    onboardingRequired,
    saveNucleoProfile,
  } = useAuth()

  const [formData, setFormData] = useState({
    nomeNucleo: '',
    associacaoAcademica: '',
    nomeTesoureiro: '',
    nomePresidente: '',
    emailContacto: '',
    temContaBancaria: false,
    iban: '',
    saldoAtualCaixa: '0',
    saldoAtualBanco: '0',
    dataReferenciaSaldos: '',
    observacoes: '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const formSyncedRef = useRef(false)

  useEffect(() => {
    if (!nucleoProfile) return
    if (formSyncedRef.current) return

    setFormData({
      nomeNucleo: nucleoProfile.nomeNucleo || '',
      associacaoAcademica: nucleoProfile.associacaoAcademica || '',
      nomeTesoureiro: nucleoProfile.nomeTesoureiro || '',
      nomePresidente: nucleoProfile.nomePresidente || '',
      emailContacto: nucleoProfile.emailContacto || nucleoProfile.email || '',
      temContaBancaria: Boolean(nucleoProfile.temContaBancaria),
      iban: nucleoProfile.iban ? formatIban(nucleoProfile.iban) : '',
      saldoAtualCaixa: String(nucleoProfile.saldoAtualCaixa ?? '0'),
      saldoAtualBanco: String(nucleoProfile.saldoAtualBanco ?? '0'),
      dataReferenciaSaldos: nucleoProfile.dataReferenciaSaldos || '',
      observacoes: nucleoProfile.observacoes || '',
    })
    setLogoPreviewUrl(nucleoProfile.logoUrl || '')
    formSyncedRef.current = true
  }, [nucleoProfile])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!user?.id || saving) return

    setError('')
    setWarning('')
    setSuccess('')

    if (!formData.nomeNucleo.trim()) {
      setError('Indica o nome do núcleo.')
      return
    }
    if (!formData.nomeTesoureiro.trim()) {
      setError('Indica o nome do tesoureiro.')
      return
    }
    if (!formData.nomePresidente.trim()) {
      setError('Indica o nome do presidente.')
      return
    }
    if (!formData.dataReferenciaSaldos) {
      setError('Indica a data de referência dos saldos.')
      return
    }

    const saldoCaixa = Number(formData.saldoAtualCaixa)
    const saldoBanco = Number(formData.saldoAtualBanco || 0)
    if (Number.isNaN(saldoCaixa) || saldoCaixa < 0) {
      setError('O saldo de caixa deve ser um número válido (>= 0).')
      return
    }
    if (formData.temContaBancaria && (Number.isNaN(saldoBanco) || saldoBanco < 0)) {
      setError('O saldo bancário deve ser um número válido (>= 0).')
      return
    }

    const ibanNormalizado = normalizeIban(formData.iban)
    if (formData.temContaBancaria && ibanNormalizado && !isValidIban(ibanNormalizado)) {
      setError('O IBAN indicado não é válido. Confirma o número.')
      return
    }

    setSaving(true)
    try {
      let logoPath = nucleoProfile?.logoPath || ''
      let nextLogoPreviewUrl = nucleoProfile?.logoUrl || ''
      if (logoFile) {
        try {
          const safeName = sanitizeFileName(logoFile.name)
          const candidatePath = `${user.id}/perfil/logo-${Date.now()}-${safeName}`
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(candidatePath, logoFile, { upsert: true })
          if (uploadError) throw uploadError

          logoPath = candidatePath
          const { data: signedData, error: signedError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(candidatePath, 60 * 60)
          if (signedError) throw signedError
          nextLogoPreviewUrl = signedData?.signedUrl || ''
        } catch (logoError) {
          console.error(logoError)
          setWarning(
            'Não foi possível carregar o logo com as policies atuais. Os restantes dados foram guardados.',
          )
        }
      }

      await saveNucleoProfile({
        nomeNucleo: formData.nomeNucleo.trim(),
        associacaoAcademica: formData.associacaoAcademica.trim(),
        nomeTesoureiro: formData.nomeTesoureiro.trim(),
        nomePresidente: formData.nomePresidente.trim(),
        emailContacto: formData.emailContacto.trim(),
        temContaBancaria: formData.temContaBancaria,
        iban: formData.temContaBancaria ? ibanNormalizado : '',
        saldoAtualCaixa: saldoCaixa,
        saldoAtualBanco: formData.temContaBancaria ? saldoBanco : 0,
        dataReferenciaSaldos: formData.dataReferenciaSaldos,
        observacoes: formData.observacoes.trim(),
        logoPath,
      })

      setLogoFile(null)
      setLogoPreviewUrl(nextLogoPreviewUrl)
      setSuccess('Perfil guardado com sucesso.')
      formSyncedRef.current = false

      if (onboardingRequired) {
        navigate('/dashboard', { replace: true })
      }
    } catch (saveError) {
      console.error(saveError)
      setError(mapSupabaseSaveError(saveError))
    } finally {
      setSaving(false)
    }
  }

  if (profileLoading && !nucleoProfile) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-gray-600">A carregar configurações do perfil...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <PageHeader
        title={onboardingRequired ? 'Configuração inicial do núcleo' : 'Configurações de perfil'}
        description={
          onboardingRequired
            ? 'Antes de continuar, configura os dados base do núcleo e os saldos atuais.'
            : 'Atualiza os dados do núcleo, responsáveis e saldos sempre que necessário.'
        }
      />

      {onboardingRequired ? (
        <div className="mb-6 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-[13px] text-[#1E3A8A]">
          <p className="font-medium">Passos obrigatórios</p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>Dados do núcleo e email de contacto</li>
            <li>Nome do tesoureiro e do presidente</li>
            <li>Data de referência e saldos iniciais de caixa (e banco, se aplicável)</li>
          </ol>
          <p className="mt-2 text-[#2563EB]">
            Precisas de ajuda?{' '}
            <Link to="/ajuda" className="underline hover:text-[#1D4ED8]">
              Ver ajuda
            </Link>
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Dados do núcleo">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome do núcleo" required>
              <input
                type="text"
                value={formData.nomeNucleo}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, nomeNucleo: event.target.value }))
                }
                placeholder="Ex.: Núcleo de Informática"
                className={inputClass}
                required
              />
            </Field>
            <Field label="Associação académica" hint="Aparece no cabeçalho das folhas impressas.">
              <input
                type="text"
                value={formData.associacaoAcademica}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, associacaoAcademica: event.target.value }))
                }
                placeholder="Ex.: AAUBI - Associação Académica da UBI"
                className={inputClass}
              />
            </Field>
            <Field label="Email de contacto" required>
              <input
                type="email"
                value={formData.emailContacto}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, emailContacto: event.target.value }))
                }
                placeholder="contacto@nucleo.pt"
                className={inputClass}
                required
              />
            </Field>
          </div>
        </Card>

        <Card title="Responsáveis">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome do tesoureiro" required>
              <input
                type="text"
                value={formData.nomeTesoureiro}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, nomeTesoureiro: event.target.value }))
                }
                placeholder="Nome completo"
                className={inputClass}
                required
              />
            </Field>
            <Field label="Nome do presidente" required>
              <input
                type="text"
                value={formData.nomePresidente}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, nomePresidente: event.target.value }))
                }
                placeholder="Nome completo"
                className={inputClass}
                required
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Saldos iniciais"
          description="Ponto de partida na data de referência. O saldo atual é calculado automaticamente a partir destes valores mais os movimentos registados."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Data de referência dos saldos" required>
              <input
                type="date"
                value={formData.dataReferenciaSaldos}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, dataReferenciaSaldos: event.target.value }))
                }
                className={inputClass}
                required
              />
            </Field>
            <Field label="Saldo inicial de caixa (EUR)" required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.saldoAtualCaixa}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, saldoAtualCaixa: event.target.value }))
                }
                placeholder="0.00"
                className={inputClass}
                required
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
            <input
              type="checkbox"
              checked={formData.temContaBancaria}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  temContaBancaria: event.target.checked,
                  saldoAtualBanco: event.target.checked ? prev.saldoAtualBanco : '0',
                  iban: event.target.checked ? prev.iban : '',
                }))
              }
              className="h-4 w-4"
            />
            <span className="text-sm text-gray-700">O núcleo tem conta bancária</span>
          </label>

          {formData.temContaBancaria ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Saldo inicial de banco (EUR)" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.saldoAtualBanco}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, saldoAtualBanco: event.target.value }))
                  }
                  placeholder="0.00"
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="IBAN da conta" hint="Facilita a consulta e a partilha para transferências.">
                <input
                  type="text"
                  value={formData.iban}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, iban: event.target.value }))
                  }
                  onBlur={() =>
                    setFormData((prev) => ({ ...prev, iban: formatIban(prev.iban) }))
                  }
                  placeholder="PT50 0000 0000 0000 0000 0000 0"
                  className={`${inputClass} font-mono tracking-wide`}
                />
              </Field>
            </div>
          ) : null}
        </Card>

        <Card title="Logotipo e observações">
          <div className="space-y-4">
            <Field label="Logotipo do núcleo (opcional)">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:text-blue-700 hover:file:bg-blue-100"
              />
            </Field>
            {logoPreviewUrl ? (
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-xs font-medium text-gray-500">Logotipo atual</p>
                <img
                  src={logoPreviewUrl}
                  alt="Logo do núcleo"
                  className="h-20 w-20 rounded-lg border border-gray-200 object-contain"
                />
              </div>
            ) : null}
            <Field label="Observações internas (opcional)">
              <textarea
                value={formData.observacoes}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, observacoes: event.target.value }))
                }
                placeholder="Notas internas sobre o núcleo..."
                className={`${inputClass} min-h-[110px]`}
              />
            </Field>
          </div>
        </Card>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {warning ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{warning}</p>
        ) : null}
        {success ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? 'A guardar...'
              : onboardingRequired
                ? 'Concluir configuração inicial'
                : 'Guardar perfil'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProfileSettingsPage
