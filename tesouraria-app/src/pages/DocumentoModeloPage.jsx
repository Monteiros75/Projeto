import { ArrowLeft, Plus, Printer, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AssociarMovimentoPanel from '../components/AssociarMovimentoPanel'
import { useAuth } from '../hooks/useAuth'
import { currentMonthRef } from '../lib/monthRef'
import MonthRefInput from '../components/MonthRefInput'
import { createSignedUrlForPath, sanitizeFileName } from '../lib/storageSignedUrl'
import { STORAGE_BUCKET, supabase } from '../supabase/supabaseClient'

function createEmptyExtraNucleo() {
  return {
    id: crypto.randomUUID(),
    nome: '',
    responsavel: '',
    logoPath: '',
    logoUrl: '',
    logoFile: null,
  }
}

function normalizeExtraNucleo(item) {
  if (typeof item === 'string') {
    return {
      ...createEmptyExtraNucleo(),
      nome: item.trim(),
    }
  }

  return {
    ...createEmptyExtraNucleo(),
    id: item?.id || crypto.randomUUID(),
    nome: item?.nome || '',
    responsavel: item?.responsavel || '',
    logoPath: item?.logoPath || '',
  }
}

function parseSavedNucleosConfig(raw, defaultPrimaryResponsavel) {
  if (!raw) {
    return {
      primaryResponsavel: defaultPrimaryResponsavel || '',
      extraNucleos: [],
    }
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return {
        primaryResponsavel: defaultPrimaryResponsavel || '',
        extraNucleos: parsed.map(normalizeExtraNucleo),
      }
    }

    if (parsed && typeof parsed === 'object') {
      return {
        primaryResponsavel: parsed.primaryResponsavel || defaultPrimaryResponsavel || '',
        extraNucleos: Array.isArray(parsed.extraNucleos)
          ? parsed.extraNucleos.map(normalizeExtraNucleo)
          : [],
      }
    }
  } catch {
    // Compatibilidade com versoes antigas que guardavam apenas texto livre.
  }

  return {
    primaryResponsavel: defaultPrimaryResponsavel || '',
    extraNucleos: String(raw)
      .split(/[\n,;]+/)
      .map((nome) => nome.trim())
      .filter(Boolean)
      .map((nome) => ({
        ...createEmptyExtraNucleo(),
        nome,
      })),
  }
}

function serializeNucleosConfig(primaryResponsavel, extraNucleos) {
  return JSON.stringify(
    {
      primaryResponsavel: primaryResponsavel.trim() || '',
      extraNucleos: extraNucleos
        .map((item) => ({
          id: item.id,
          nome: item.nome.trim(),
          responsavel: item.responsavel?.trim() || '',
          logoPath: item.logoPath || '',
        }))
        .filter((item) => item.nome),
    },
  )
}

async function resolveExtraNucleosWithUrls(extraNucleos) {
  return Promise.all(
    extraNucleos.map(async (item) => ({
      ...item,
      logoUrl: item.logoPath ? await createSignedUrlForPath(item.logoPath) : '',
      logoFile: null,
    })),
  )
}

function initials(name) {
  const p = (name || '').trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function formatDataDocPt(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  if (!d) return iso
  return `${d}/${m}/${y}`
}

function formatModeloLabel(modelo) {
  return modelo === 'errata' ? 'ERRATA:' : 'OFICIO:'
}

function getBodyParagraphs(corpo) {
  return String(corpo || '')
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getFriendlySaveError(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || error?.details || error?.hint || '')
  const lowerMessage = message.toLowerCase()

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    (lowerMessage.includes('documentos_modelos') &&
      (lowerMessage.includes('does not exist') || lowerMessage.includes('schema cache')))
  ) {
    return 'A tabela documentos_modelos ainda não existe no teu Supabase. Correr a secção Documentos do ficheiro supabase/schema.sql no SQL Editor.'
  }

  if (message) {
    return `Não foi possível guardar. ${message}`
  }

  return 'Não foi possível guardar o documento.'
}

export default function DocumentoModeloPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, nucleoProfile } = useAuth()
  const isNew = id === 'novo'

  const [monthRef, setMonthRef] = useState(() => currentMonthRef())
  const [tipoConta, setTipoConta] = useState('caixa')
  const [modelo, setModelo] = useState('oficio')
  const [titulo, setTitulo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [extraNucleos, setExtraNucleos] = useState([])
  const [dataDocumento, setDataDocumento] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const responsavelDefault =
    nucleoProfile?.nomeTesoureiro?.trim() || 'Tiago Monteiro'
  const [responsavelPrincipal, setResponsavelPrincipal] = useState('')

  const involvedNucleos = useMemo(() => {
    const primaryName = nucleoProfile?.nomeNucleo?.trim() || 'Núcleo'

    return [
      {
        id: 'principal',
        nome: primaryName,
        logoUrl: nucleoProfile?.logoUrl || '',
        isPrimary: true,
        responsavel: responsavelPrincipal.trim() || responsavelDefault,
      },
      ...extraNucleos
        .filter((item) => item.nome.trim())
        .map((item) => ({
          id: item.id,
          nome: item.nome.trim(),
          logoUrl: item.logoUrl || '',
          isPrimary: false,
          responsavel: item.responsavel?.trim() || 'Responsável',
        })),
    ]
  }, [
    extraNucleos,
    nucleoProfile?.logoUrl,
    nucleoProfile?.nomeNucleo,
    responsavelDefault,
    responsavelPrincipal,
  ])

  const bodyParagraphs = useMemo(() => getBodyParagraphs(corpo), [corpo])

  useEffect(() => {
    if (!isNew) return
    setResponsavelPrincipal((prev) => prev || responsavelDefault)
  }, [isNew, responsavelDefault])

  useEffect(() => {
    if (isNew || !id || !user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data, error: qErr } = await supabase
          .from('documentos_modelos')
          .select('*')
          .eq('id', id)
          .eq('nucleo_id', user.id)
          .maybeSingle()
        if (qErr) throw qErr
        if (!data) {
          setError('Modelo não encontrado.')
          return
        }
        if (cancelled) return
        setMonthRef(data.month_ref)
        setTipoConta(data.tipo_conta || 'caixa')
        setModelo(data.modelo || 'oficio')
        setTitulo(data.titulo || '')
        setCorpo(data.corpo || '')
        const savedNucleosConfig = parseSavedNucleosConfig(
          data.outros_nucleos || '',
          responsavelDefault,
        )
        setResponsavelPrincipal(savedNucleosConfig.primaryResponsavel || responsavelDefault)
        setExtraNucleos(await resolveExtraNucleosWithUrls(savedNucleosConfig.extraNucleos))
        setDataDocumento(data.data_documento || new Date().toISOString().slice(0, 10))
      } catch (e) {
        console.error(e)
        if (!cancelled) setError('Erro ao carregar modelo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, isNew, responsavelDefault, user?.id])

  function handleAddExtraNucleo() {
    setExtraNucleos((prev) => [...prev, createEmptyExtraNucleo()])
  }

  function handleRemoveExtraNucleo(extraId) {
    setExtraNucleos((prev) => prev.filter((item) => item.id !== extraId))
  }

  function handleExtraNucleoChange(extraId, field, value) {
    setExtraNucleos((prev) =>
      prev.map((item) => (item.id === extraId ? { ...item, [field]: value } : item)),
    )
  }

  function handleExtraLogoFileChange(extraId, file) {
    setExtraNucleos((prev) =>
      prev.map((item) =>
        item.id === extraId
          ? {
              ...item,
              logoFile: file || null,
              logoUrl: file ? URL.createObjectURL(file) : item.logoUrl,
            }
          : item,
      ),
    )
  }

  function handleRemoveExtraLogo(extraId) {
    setExtraNucleos((prev) =>
      prev.map((item) =>
        item.id === extraId
          ? {
              ...item,
              logoPath: '',
              logoUrl: '',
              logoFile: null,
            }
          : item,
      ),
    )
  }

  async function handleSave() {
    if (!user?.id || saving) return
    setSaving(true)
    setError('')
    try {
      const modelId = isNew ? crypto.randomUUID() : id
      const uploadedExtraNucleos = await Promise.all(
        extraNucleos.map(async (item) => {
          const nome = item.nome.trim()
          if (!nome) return null

          let logoPath = item.logoPath || ''
          let logoUrl = item.logoUrl || ''

          if (item.logoFile) {
            logoPath = `${user.id}/${monthRef}/documentos-modelos/${modelId}/logos/${item.id}-${sanitizeFileName(item.logoFile.name)}`
            const { error: uploadError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .upload(logoPath, item.logoFile, { upsert: true })
            if (uploadError) throw uploadError
            logoUrl = await createSignedUrlForPath(logoPath)
          }

          return {
            ...item,
            nome,
            responsavel: item.responsavel?.trim() || '',
            logoPath,
            logoUrl,
            logoFile: null,
          }
        }),
      )

      const normalizedExtraNucleos = uploadedExtraNucleos.filter(Boolean)
      const payload = {
        id: modelId,
        nucleo_id: user.id,
        month_ref: monthRef,
        tipo_conta: tipoConta,
        modelo,
        titulo: titulo.trim() || null,
        corpo: corpo.trim(),
        outros_nucleos: normalizedExtraNucleos.length
          ? serializeNucleosConfig(responsavelPrincipal, normalizedExtraNucleos)
          : responsavelPrincipal.trim()
            ? serializeNucleosConfig(responsavelPrincipal, [])
            : null,
        data_documento: dataDocumento,
      }

      if (isNew) {
        const { data, error: insErr } = await supabase
          .from('documentos_modelos')
          .insert(payload)
          .select('id')
          .single()
        if (insErr) throw insErr
        setExtraNucleos(normalizedExtraNucleos)
        navigate(`/documentos/modelo/${data.id}`, { replace: true })
      } else {
        const { error: upErr } = await supabase
          .from('documentos_modelos')
          .update(payload)
          .eq('id', id)
          .eq('nucleo_id', user.id)
        if (upErr) throw upErr
        setExtraNucleos(normalizedExtraNucleos)
      }
    } catch (e) {
      console.error(e)
      setError(getFriendlySaveError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-4 print:hidden">
        <Link
          to="/documentos"
          className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#374151] hover:bg-[#F9FAFB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Documentos
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white hover:bg-[#1557C0]"
        >
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[14px] font-medium text-[#111827] hover:bg-[#F9FAFB] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'A guardar...' : 'Guardar'}
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>
      ) : null}

      {!loading && !isNew ? (
          <AssociarMovimentoPanel
            className="mb-8 print:hidden"
            monthRef={monthRef}
            tipoConta={tipoConta}
            tipoDocumento={modelo}
            documentoModeloId={id}
            tituloDocumento={titulo.trim() || (modelo === 'errata' ? 'Errata' : 'Ofício')}
          />
      ) : null}

      {loading ? (
        <p className="text-[14px] text-[#6B7280]">A carregar...</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 rounded-xl border border-[#E5E7EB] bg-white p-4 print:hidden lg:grid-cols-2">
            <h1 className="text-xl font-semibold text-[#111827] lg:col-span-2">
              {isNew ? 'Novo documento (ofício ou errata)' : 'Editar modelo'}
            </h1>

            <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
              Mês de referência
              <MonthRefInput
                value={monthRef}
                onChange={(e) => setMonthRef(e.target.value)}
                dataReferencia={nucleoProfile?.dataReferenciaSaldos}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
              />
            </label>
            <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
              Conta (filtro na lista de documentos)
              <select
                value={tipoConta}
                onChange={(e) => setTipoConta(e.target.value)}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
              >
                <option value="caixa">Caixa</option>
                <option value="banco">Banco</option>
              </select>
            </label>

            <div className="lg:col-span-2">
              <p className="mb-2 text-[12px] font-medium text-[#6B7280]">Tipo de modelo</p>
              <div className="flex gap-3">
                {[
                  { v: 'oficio', l: 'Ofício' },
                  { v: 'errata', l: 'Errata' },
                ].map((opt) => (
                  <label key={opt.v} className="flex cursor-pointer items-center gap-2 text-[14px]">
                    <input
                      type="radio"
                      name="modelo"
                      checked={modelo === opt.v}
                      onChange={() => setModelo(opt.v)}
                    />
                    {opt.l}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex flex-col text-[12px] font-medium text-[#6B7280] lg:col-span-2">
              Título
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
                placeholder="Ex.: Ofício sobre quotas"
              />
            </label>

            <label className="flex flex-col text-[12px] font-medium text-[#6B7280] lg:col-span-2">
              Texto do documento
              <textarea
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                rows={8}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
                placeholder="Corpo do ofício ou da errata..."
              />
            </label>

            <label className="flex flex-col text-[12px] font-medium text-[#6B7280] lg:col-span-2">
              Responsável do teu núcleo
              <input
                value={responsavelPrincipal}
                onChange={(e) => setResponsavelPrincipal(e.target.value)}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
                placeholder="Ex.: Tiago Monteiro"
              />
            </label>

            <label className="flex flex-col text-[12px] font-medium text-[#6B7280] lg:col-span-2">
              Outros núcleos envolvidos
              <div className="mt-2 space-y-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] text-[#6B7280]">
                    Adiciona outros núcleos e, se quiseres, a respetiva logo.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddExtraNucleo}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar núcleo
                  </button>
                </div>

                {extraNucleos.length === 0 ? (
                  <p className="text-[13px] text-[#9CA3AF]">Sem outros núcleos adicionados.</p>
                ) : (
                  extraNucleos.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 lg:grid-cols-[1fr_220px_auto]"
                    >
                      <div className="space-y-3">
                        <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
                        Nome do núcleo #{index + 2}
                        <input
                          value={item.nome}
                          onChange={(e) =>
                            handleExtraNucleoChange(item.id, 'nome', e.target.value)
                          }
                          className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
                          placeholder="Ex.: Núcleo de Engenharia"
                        />
                        </label>

                        <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
                          Responsável deste núcleo
                          <input
                            value={item.responsavel}
                            onChange={(e) =>
                              handleExtraNucleoChange(item.id, 'responsavel', e.target.value)
                            }
                            className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
                            placeholder="Ex.: Tiago Monteiro"
                          />
                        </label>
                      </div>

                      <div className="flex flex-col gap-2 text-[12px] font-medium text-[#6B7280]">
                        <span>Logo (opcional)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleExtraLogoFileChange(item.id, e.target.files?.[0] || null)
                          }
                          className="text-[13px]"
                        />
                        {item.logoUrl ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={item.logoUrl}
                              alt=""
                              className="h-10 w-10 rounded border border-[#E5E7EB] object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraLogo(item.id)}
                              className="text-[12px] text-rose-700 hover:underline"
                            >
                              Remover logo
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-start justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraNucleo(item.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-[13px] text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </label>

            <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
              Data no documento
              <input
                type="date"
                value={dataDocumento}
                onChange={(e) => setDataDocumento(e.target.value)}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
              />
            </label>
          </div>

          <div className="mx-auto max-w-4xl border border-[#E5E7EB] bg-white p-8 shadow-sm print:border-0 print:shadow-none">
            <div id="modelo-print-root">
              <header className="mb-8">
                <div className="mb-6 flex items-start justify-between gap-6">
                  {involvedNucleos.slice(0, 2).map((nucleo) =>
                    nucleo.logoUrl ? (
                      <img
                        key={nucleo.id}
                        src={nucleo.logoUrl}
                        alt=""
                        className="h-20 w-20 object-contain"
                      />
                    ) : (
                      <div
                        key={nucleo.id}
                        className="flex h-20 w-20 items-center justify-center border border-[#D1D5DB] bg-[#F9FAFB] text-xl font-bold text-[#374151]"
                      >
                        {initials(nucleo.nome || 'N')}
                      </div>
                    ),
                  )}
                </div>

                <div className="space-y-3">
                  <h1 className="max-w-3xl text-[18px] leading-snug text-[#111827]">
                    <span className="font-bold">{formatModeloLabel(modelo)}</span>
                    {titulo || 'Sem titulo'}
                  </h1>

                  <div>
                    <p className="text-[16px] font-semibold text-[#111827]">
                      Tesouraria {nucleoProfile?.nomeNucleo || 'Núcleo'}
                    </p>
                    <p className="mt-2 text-[13px] text-[#374151]">Data: {formatDataDocPt(dataDocumento)}</p>
                  </div>
                </div>
              </header>

              <section className="space-y-6 text-[16px] leading-relaxed text-[#111827]">
                {bodyParagraphs.length > 0 ? (
                  bodyParagraphs.map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-wrap">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="whitespace-pre-wrap">...</p>
                )}
              </section>

              <footer className="mt-16">
                <p className="mb-12 text-[15px] text-[#111827]">
                  Covilha, {formatDataDocPt(dataDocumento)}
                </p>

                <div
                  className={`grid gap-10 ${
                    involvedNucleos.length > 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'
                  }`}
                >
                  {involvedNucleos.map((nucleo) => (
                    <div key={nucleo.id} className="text-center">
                      <p className="mb-10 text-[14px] font-medium text-[#111827]">
                        {nucleo.responsavel}
                      </p>
                      <div className="mx-auto mb-2 h-px w-full max-w-[180px] border-b border-[#111827]" />
                      <p className="text-[14px] text-[#111827]">({nucleo.nome})</p>
                    </div>
                  ))}
                </div>
              </footer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
