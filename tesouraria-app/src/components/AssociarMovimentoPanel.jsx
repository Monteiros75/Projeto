import { Link2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  associarDocumentoAMovimento,
  canAssociarATipoMovimento,
  isComprovativoTipo,
  tipoDocumentoToBaseTipo,
} from '../lib/associarDocumentoMovimento'
import { formatDatePt, formatEur } from '../lib/folhaMensal'
import { formatSupabaseError } from '../lib/movimentoErrors'
import { formatMonthLabel } from '../lib/monthRef'
import { useAuth } from '../hooks/useAuth'
import { useMovimentosAssociar } from '../hooks/useMovimentosAssociar'
import RegistarMovimentoForm from './RegistarMovimentoForm'

export default function AssociarMovimentoPanel({
  monthRef,
  tipoConta,
  tipoDocumento,
  storagePath,
  documentoExtraId,
  documentoModeloId,
  tituloDocumento,
  onAssociated,
  onDismiss,
  className = '',
}) {
  const { user } = useAuth()
  const [modo, setModo] = useState('existente')
  const [filtroMes, setFiltroMes] = useState(monthRef || '')
  const [todosMeses, setTodosMeses] = useState(false)
  const [pesquisa, setPesquisa] = useState('')
  const [movimentoId, setMovimentoId] = useState('')
  const [anexoFile, setAnexoFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setFiltroMes(monthRef || '')
    setMovimentoId('')
    setPesquisa('')
    setTodosMeses(false)
    setError('')
    setSuccess('')
  }, [monthRef, tipoConta, tipoDocumento, storagePath, documentoExtraId, documentoModeloId])

  const { movimentos, loading, reload } = useMovimentosAssociar({
    monthRef: filtroMes,
    todosMeses,
    tipoConta,
  })

  const movimentosVisiveis = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()
    if (!termo) return movimentos
    return movimentos.filter((m) => {
      const haystack = [
        m.descricao,
        m.numero_documento,
        m.valor,
        formatDatePt(m.data),
        formatMonthLabel(m.month_ref, { long: true }),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(termo)
    })
  }, [movimentos, pesquisa])

  const movimentoSeleccionado = movimentos.find((m) => m.id === movimentoId)
  const mesNovoMovimento = filtroMes || monthRef

  const modeloNaApp = Boolean(documentoModeloId)
  const precisaFicheiroExtra =
    !modeloNaApp &&
    !storagePath &&
    !isComprovativoTipo(tipoDocumento) &&
    canAssociarATipoMovimento(tipoDocumento)
  const precisaComprovativoExtra =
    isComprovativoTipo(tipoDocumento) && tipoConta === 'banco' && !storagePath

  const documentoBaseTipo = tipoDocumentoToBaseTipo(tipoDocumento)
  const folhaPath = tipoConta === 'banco' ? '/folha-bancaria' : '/folha-caixa'

  if (!canAssociarATipoMovimento(tipoDocumento)) {
    return (
      <div className={`rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm text-[#6B7280] ${className}`}>
        Extratos bancários mensais não se associam a um movimento individual. Usa Fecho Mensal.
      </div>
    )
  }

  async function handleAssociarExistente() {
    if (!movimentoId || !movimentoSeleccionado) {
      setError('Escolhe um movimento.')
      return
    }
    if (precisaFicheiroExtra && !anexoFile) {
      setError('Anexa o PDF do documento (ex.: impressão do ofício).')
      return
    }
    if (precisaComprovativoExtra && !anexoFile) {
      setError('Anexa o ficheiro do comprovativo.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await associarDocumentoAMovimento({
        movimentoId,
        tipoDocumento,
        storagePath: storagePath || null,
        documentoExtraId,
        documentoModeloId,
        anexoFile: precisaFicheiroExtra || precisaComprovativoExtra ? anexoFile : null,
        userId: user?.id,
        monthRef: movimentoSeleccionado.month_ref || filtroMes || monthRef,
      })
      setSuccess('Documento associado ao movimento.')
      await reload()
      onAssociated?.(movimentoId)
    } catch (e) {
      console.error(e)
      setError(formatSupabaseError(e, 'Não foi possível associar.'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleNovoMovimento(movimentoIdCriado) {
    setSuccess('Movimento criado e documento associado.')
    reload()
    onAssociated?.(movimentoIdCriado)
  }

  return (
    <div className={`rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Link2 className="mt-0.5 h-5 w-5 text-[#1F6FEB]" />
          <div>
            <h3 className="text-[15px] font-semibold text-[#111827]">Associar a movimento</h3>
            {tituloDocumento ? (
              <p className="text-[13px] text-[#6B7280]">{tituloDocumento}</p>
            ) : null}
            {modeloNaApp ? (
              <p className="mt-1 text-[12px] text-[#1E40AF]">
                Ofício/errata na app: basta escolher o movimento, sem anexar PDF.
              </p>
            ) : null}
          </div>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[13px] text-[#6B7280] hover:text-[#111827]"
          >
            Fechar
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setModo('existente')}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
            modo === 'existente' ? 'bg-[#1F6FEB] text-white' : 'bg-white text-[#374151]'
          }`}
        >
          Movimento existente
        </button>
        <button
          type="button"
          onClick={() => setModo('novo')}
          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
            modo === 'novo' ? 'bg-[#1F6FEB] text-white' : 'bg-white text-[#374151]'
          }`}
        >
          Criar movimento
        </button>
      </div>

      {success ? (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {modo === 'existente' ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
              Mês dos movimentos
              <input
                type="month"
                value={filtroMes}
                disabled={todosMeses}
                onChange={(e) => {
                  setFiltroMes(e.target.value)
                  setMovimentoId('')
                }}
                className="mt-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] disabled:bg-[#F3F4F6]"
              />
            </label>
            <label className="flex items-end gap-2 pb-2 text-[13px] text-[#374151]">
              <input
                type="checkbox"
                checked={todosMeses}
                onChange={(e) => {
                  setTodosMeses(e.target.checked)
                  setMovimentoId('')
                }}
                className="rounded border-[#D1D5DB]"
              />
              Mostrar todos os meses
            </label>
          </div>

          <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
            Pesquisar
            <span className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Descrição, n.º documento, valor..."
                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              />
            </span>
          </label>

          {loading ? (
            <p className="text-sm text-[#6B7280]">A carregar movimentos...</p>
          ) : movimentosVisiveis.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              Não há movimentos de {tipoConta}
              {!todosMeses && filtroMes ? ` em ${formatMonthLabel(filtroMes, { long: true })}` : ''}.
              {' '}
              <button type="button" onClick={() => setModo('novo')} className="text-[#1F6FEB] underline">
                Cria um movimento
              </button>{' '}
              ou regista na{' '}
              <Link to={`${folhaPath}?mes=${filtroMes || monthRef}`} className="text-[#1F6FEB] underline">
                folha
              </Link>
              .
            </p>
          ) : (
            <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
              Movimento ({movimentosVisiveis.length})
              <select
                value={movimentoId}
                onChange={(e) => setMovimentoId(e.target.value)}
                className="mt-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827]"
              >
                <option value="">— Escolher —</option>
                {movimentosVisiveis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatMonthLabel(m.month_ref)} · {formatDatePt(m.data)} ·{' '}
                    {m.descricao || m.numero_documento || 'Sem descrição'} · {formatEur(m.valor)}
                    {m.fatura_ou_oficio_path ? ' · com doc.' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {precisaFicheiroExtra || precisaComprovativoExtra ? (
            <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
              {precisaComprovativoExtra ? 'Ficheiro do comprovativo' : 'PDF / ficheiro do documento'}
              <input
                type="file"
                onChange={(e) => setAnexoFile(e.target.files?.[0] || null)}
                className="mt-1 text-[13px]"
              />
            </label>
          ) : null}

          <button
            type="button"
            onClick={handleAssociarExistente}
            disabled={submitting || !movimentoId}
            className="rounded-lg bg-[#1F6FEB] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'A associar...' : 'Associar ao movimento'}
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
          <label className="mb-3 flex flex-col text-[12px] font-medium text-[#6B7280]">
            Mês do novo movimento
            <input
              type="month"
              value={mesNovoMovimento}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
            />
          </label>
          <RegistarMovimentoForm
            tipoConta={tipoConta}
            monthRef={mesNovoMovimento}
            userId={user?.id}
            initialDocumentoBaseTipo={documentoBaseTipo}
            existingBasePath={
              !isComprovativoTipo(tipoDocumento) && storagePath ? storagePath : undefined
            }
            existingComprovativoPath={
              isComprovativoTipo(tipoDocumento) && storagePath ? storagePath : undefined
            }
            documentoExtraId={documentoExtraId}
            documentoModeloId={documentoModeloId}
            skipBaseFile={Boolean(
              modeloNaApp || (!isComprovativoTipo(tipoDocumento) && storagePath),
            )}
            skipComprovativoFile={Boolean(isComprovativoTipo(tipoDocumento) && storagePath)}
            linkedModeloOnly={modeloNaApp}
            onSuccess={handleNovoMovimento}
          />
        </div>
      )}
    </div>
  )
}
