import { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useMovimentoActions } from '../hooks/useMovimentoActions'
import { labelBaseDocumentType } from '../lib/movimentoFiles'

const DRAFT_PREFIX = 'tesouraria.movimentos.draft'

const inputClass =
  'w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]'

function buildDraftKey(userId, tipoConta) {
  return `${DRAFT_PREFIX}.${tipoConta}.${userId || 'anon'}`
}

function buildEmptyForm(monthRef, documentoBaseTipo) {
  return {
    natureza: 'pagamento',
    data: monthRef ? `${monthRef}-01` : '',
    numeroDocumento: '',
    descricao: '',
    valor: '',
    documentoBaseTipo: documentoBaseTipo || 'fatura',
  }
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-[#374151]">
        {label}
        {required ? <span className="text-[#EF4444]"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-[#6B7280]">{hint}</span> : null}
    </label>
  )
}

function NaturezaToggle({ value, onChange }) {
  const options = [
    { value: 'pagamento', label: 'Pagamento', activeClass: 'border-[#EF4444] bg-[#FEE2E2] text-[#991B1B]' },
    { value: 'recebimento', label: 'Recebimento', activeClass: 'border-[#10B981] bg-[#DCFCE7] text-[#166534]' },
  ]

  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-[14px] font-medium transition-colors ${
              active
                ? opt.activeClass
                : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function FilePicker({ label, hint, file, onChange, accept = '.pdf,.png,.jpg,.jpeg,.webp' }) {
  const inputRef = useRef(null)

  return (
    <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#FAFAFA] p-3">
      <p className="mb-2 text-[13px] font-medium text-[#374151]">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
        >
          <Upload className="h-4 w-4 text-[#6B7280]" />
          Escolher ficheiro
        </button>
        <p className="min-w-0 flex-1 truncate text-[13px] text-[#6B7280]">
          {file ? file.name : hint}
        </p>
        {file ? (
          <button
            type="button"
            onClick={() => {
              onChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="text-[12px] font-medium text-[#6B7280] hover:text-[#111827]"
          >
            Remover
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function RegistarMovimentoForm({
  tipoConta,
  monthRef,
  userId,
  onSuccess,
  initialDocumentoBaseTipo,
  existingBasePath,
  existingComprovativoPath,
  documentoExtraId,
  documentoModeloId,
  skipBaseFile = false,
  skipComprovativoFile = false,
  disableDraft = false,
  linkedModeloOnly = false,
}) {
  const { createMovimento, submitting, error, setError } = useMovimentoActions()
  const [formData, setFormData] = useState(() => {
    const base = buildEmptyForm(monthRef, initialDocumentoBaseTipo)
    if (disableDraft || !userId) return base
    try {
      const raw = window.sessionStorage.getItem(buildDraftKey(userId, tipoConta))
      if (!raw) return base
      const draft = JSON.parse(raw)
      if (draft?.formData) return { ...base, ...draft.formData }
    } catch (e) {
      console.error(e)
    }
    return base
  })
  const [faturaFile, setFaturaFile] = useState(null)
  const [comprovativoFile, setComprovativoFile] = useState(null)

  useEffect(() => {
    if (disableDraft || !userId) return
    try {
      window.sessionStorage.setItem(
        buildDraftKey(userId, tipoConta),
        JSON.stringify({ formData }),
      )
    } catch (e) {
      console.error(e)
    }
  }, [userId, tipoConta, formData, disableDraft])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const movimentoId = await createMovimento({
      monthRef,
      tipoConta,
      ...formData,
      faturaFile: skipBaseFile ? null : faturaFile,
      comprovativoFile: skipComprovativoFile ? null : comprovativoFile,
      existingBasePath: skipBaseFile && existingBasePath ? existingBasePath : undefined,
      existingComprovativoPath:
        skipComprovativoFile && existingComprovativoPath ? existingComprovativoPath : undefined,
      documentoExtraId,
      documentoModeloId,
    })
    if (!movimentoId) return

    setFormData(buildEmptyForm(monthRef, initialDocumentoBaseTipo))
    setFaturaFile(null)
    setComprovativoFile(null)
    if (!disableDraft && userId) window.sessionStorage.removeItem(buildDraftKey(userId, tipoConta))
    onSuccess?.(movimentoId)
  }

  const showBaseFile = !skipBaseFile
  const showComprovativo = tipoConta === 'banco' && !skipComprovativoFile
  const baseDocLabel = labelBaseDocumentType(formData.documentoBaseTipo)

  return (
    <form onSubmit={handleSubmit}>
      {linkedModeloOnly ? (
        <p className="mb-4 rounded-lg bg-[#EFF6FF] px-3 py-2 text-[13px] text-[#1E40AF]">
          O ofício/errata fica ligado a este movimento na app. Imprime quando precisares; não é
          obrigatório anexar ficheiro agora.
        </p>
      ) : null}

      {skipBaseFile && existingBasePath ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          O documento carregado será usado como anexo deste movimento.
        </p>
      ) : null}

      <div className="space-y-4">
        <Field label="Tipo de movimento" required>
          <NaturezaToggle
            value={formData.natureza}
            onChange={(natureza) => setFormData((prev) => ({ ...prev, natureza }))}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data" required>
            <input
              type="date"
              value={formData.data}
              onChange={(event) => setFormData((prev) => ({ ...prev, data: event.target.value }))}
              className={inputClass}
              required
            />
          </Field>

          <Field label="Nº FT / documento" required hint="Número da fatura, recibo ou documento de suporte.">
            <input
              type="text"
              value={formData.numeroDocumento}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, numeroDocumento: event.target.value }))
              }
              placeholder="Ex.: FT 2026/042"
              className={inputClass}
              required
            />
          </Field>
        </div>

        <Field label="Descrição" required hint="Breve descrição do movimento para a folha mensal.">
          <input
            type="text"
            value={formData.descricao}
            onChange={(event) => setFormData((prev) => ({ ...prev, descricao: event.target.value }))}
            placeholder="Ex.: Compra de material para evento"
            className={inputClass}
            required
          />
        </Field>

        <Field label="Valor" required>
          <div className="relative max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#6B7280]">
              €
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.valor}
              onChange={(event) => setFormData((prev) => ({ ...prev, valor: event.target.value }))}
              placeholder="0,00"
              className={`${inputClass} pl-8`}
              required
            />
          </div>
        </Field>

        {showBaseFile || showComprovativo ? (
          <div className="space-y-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <p className="text-[13px] font-medium text-[#374151]">Anexos (opcional agora)</p>
            <p className="text-[12px] text-[#6B7280]">
              Podes anexar já ou depois em Documentos. Movimentos de banco precisam de comprovativo
              antes do fecho mensal.
            </p>

            {showBaseFile ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo do documento">
                  <select
                    value={formData.documentoBaseTipo}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, documentoBaseTipo: event.target.value }))
                    }
                    className={inputClass}
                  >
                    <option value="fatura">Fatura</option>
                    <option value="oficio">Ofício</option>
                    <option value="errata">Errata</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <FilePicker
                    label={baseDocLabel}
                    hint={`PDF ou imagem — ${baseDocLabel.toLowerCase()}`}
                    file={faturaFile}
                    onChange={setFaturaFile}
                  />
                </div>
              </div>
            ) : null}

            {showComprovativo ? (
              <FilePicker
                label="Comprovativo bancário"
                hint="PDF ou imagem do comprovativo de transferência"
                file={comprovativoFile}
                onChange={setComprovativoFile}
              />
            ) : null}
          </div>
        ) : null}

        {skipComprovativoFile && existingComprovativoPath ? (
          <p className="text-[13px] text-emerald-700">
            Comprovativo do documento carregado será associado.
          </p>
        ) : null}
      </div>

      {formData.data && monthRef && !String(formData.data).startsWith(monthRef) ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          A data escolhida é de outro mês. Este movimento será registado em{' '}
          <strong>{String(formData.data).slice(0, 7)}</strong>, não no mês aberto ({monthRef}).
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p>
      ) : null}

      <div className="mt-5 flex justify-end border-t border-[#E5E7EB] pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#1F6FEB] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#1557C0] disabled:opacity-60"
        >
          {submitting ? 'A guardar...' : 'Guardar movimento'}
        </button>
      </div>
    </form>
  )
}
