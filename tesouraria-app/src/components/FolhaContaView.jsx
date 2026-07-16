import { AlertTriangle, CheckCircle2, Plus, Printer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AnexosMovimentoModal from './AnexosMovimentoModal'
import CollapsibleSection from './CollapsibleSection'
import EditarMovimentoModal from './EditarMovimentoModal'
import RegistarMovimentoForm from './RegistarMovimentoForm'
import { useAuth } from '../hooks/useAuth'
import { useMovimentoActions } from '../hooks/useMovimentoActions'
import { useMovimentosMes } from '../hooks/useMovimentosMes'
import { useSaldoAbertura } from '../hooks/useSaldoAbertura'
import { movimentoTemDocumentoBase } from '../lib/associarDocumentoMovimento'
import { buildControlRows, formatDatePt, formatEur } from '../lib/folhaMensal'
import { formatFechadoEm, isMesFechado } from '../lib/fechoPrazo'
import { currentMonthRef, formatMonthLabel } from '../lib/monthRef'
import MonthRefInput from './MonthRefInput'
import { supabase } from '../supabase/supabaseClient'

function getDocStatus(movimento, movimentoIdsComModelo) {
  const temBase = movimentoTemDocumentoBase(movimento, movimentoIdsComModelo)
  const precisaComprovativo = movimento.tipo_conta === 'banco'
  const temComprovativo = Boolean(movimento.comprovativo_banco_path)
  const completo = temBase && (!precisaComprovativo || temComprovativo)

  let falta = ''
  if (!temBase && precisaComprovativo && !temComprovativo) falta = 'Falta fatura/ofício e comprovativo'
  else if (!temBase) falta = 'Falta fatura ou ofício'
  else if (precisaComprovativo && !temComprovativo) falta = 'Falta comprovativo bancário'

  return { completo, falta }
}

export default function FolhaContaView({
  tipoConta,
  titulo,
  descricao,
  linhaPrefixo,
  outraFolhaTo,
  outraFolhaLabel,
}) {
  const { user, nucleoProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const mesFromUrl = searchParams.get('mes')
  const autoPrint = searchParams.get('imprimir') === '1'
  const [monthRef, setMonthRef] = useState(() => mesFromUrl || currentMonthRef())
  const { movimentos, fecho, loading, error, reload } = useMovimentosMes(monthRef)
  const { saldoAnteriorCaixa, saldoAnteriorBanco } = useSaldoAbertura(monthRef)
  const { deleteMovimento, error: actionError } = useMovimentoActions()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewingAnexos, setViewingAnexos] = useState(null)
  const [modelosPorMovimento, setModelosPorMovimento] = useState(() => new Map())
  const movimentoIdsComModelo = useMemo(
    () => new Set(modelosPorMovimento.keys()),
    [modelosPorMovimento],
  )

  const saldoAnterior = tipoConta === 'caixa' ? saldoAnteriorCaixa : saldoAnteriorBanco

  useEffect(() => {
    if (mesFromUrl) setMonthRef(mesFromUrl)
  }, [mesFromUrl])

  const rowsWithSaldo = useMemo(
    () => buildControlRows(movimentos, tipoConta, saldoAnterior, linhaPrefixo),
    [movimentos, tipoConta, saldoAnterior, linhaPrefixo],
  )

  const mesFechado = isMesFechado(fecho)

  useEffect(() => {
    setShowForm(false)
  }, [monthRef])

  useEffect(() => {
    if (!user?.id) {
      setModelosPorMovimento(new Map())
      return
    }
    let cancelled = false
    async function loadModelosLigados() {
      const { data, error: modelosError } = await supabase
        .from('documentos_modelos')
        .select('id, titulo, movimento_id')
        .eq('nucleo_id', user.id)
        .eq('month_ref', monthRef)
        .not('movimento_id', 'is', null)
      if (cancelled) return
      if (modelosError) {
        setModelosPorMovimento(new Map())
        return
      }
      const map = new Map()
      for (const row of data || []) {
        if (row.movimento_id) map.set(row.movimento_id, { id: row.id, titulo: row.titulo })
      }
      setModelosPorMovimento(map)
    }
    loadModelosLigados()
    return () => {
      cancelled = true
    }
  }, [user?.id, monthRef, movimentos])

  const semDocumentoCount = useMemo(
    () => rowsWithSaldo.filter((m) => !getDocStatus(m, movimentoIdsComModelo).completo).length,
    [rowsWithSaldo, movimentoIdsComModelo],
  )

  const totais = useMemo(() => {
    const totalRecebimentos = rowsWithSaldo.reduce((acc, r) => acc + r.recebimentos, 0)
    const totalPagamentos = rowsWithSaldo.reduce((acc, r) => acc + r.pagamentos, 0)
    const saldoFinal = rowsWithSaldo.length
      ? rowsWithSaldo[rowsWithSaldo.length - 1].saldo
      : saldoAnterior
    return { totalRecebimentos, totalPagamentos, saldoFinal }
  }, [rowsWithSaldo, saldoAnterior])

  const tituloImpressao =
    tipoConta === 'caixa'
      ? 'Folha de controlo de caixa do mês de:'
      : 'Folha de controlo bancário do mês de:'

  async function handleDelete(movimento) {
    if (!window.confirm('Apagar este movimento?')) return
    const ok = await deleteMovimento(movimento)
    if (ok) reload()
  }

  function handleRegistado() {
    setShowForm(false)
    reload()
  }

  useEffect(() => {
    if (!autoPrint || loading) return
    const id = window.setTimeout(() => window.print(), 600)
    return () => window.clearTimeout(id)
  }, [autoPrint, loading, monthRef])

  return (
    <div className="p-4 md:p-8 print:p-0">
      <div className="mb-6 hidden border-b border-black pb-4 print:block">
        <div className="flex items-center gap-4">
          {nucleoProfile?.logoUrl ? (
            <img
              src={nucleoProfile.logoUrl}
              alt=""
              className="h-16 w-16 flex-shrink-0 object-contain"
            />
          ) : null}
          <div>
            {nucleoProfile?.associacaoAcademica ? (
              <p className="text-[13px] font-bold uppercase text-black">
                {nucleoProfile.associacaoAcademica}
              </p>
            ) : null}
            <p className="text-[16px] font-bold text-black">
              Núcleo: {nucleoProfile?.nomeNucleo || '-'}
            </p>
            <p className="text-[12px] text-black">
              Tesoureiro: {nucleoProfile?.nomeTesoureiro || '-'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <h2 className="text-[13px] font-bold uppercase text-black">
            {tituloImpressao} {formatMonthLabel(monthRef, { long: true })}
          </h2>
          <p className="text-[12px] text-black">
            Saldo anterior: <strong>{formatEur(saldoAnterior)}</strong>
          </p>
        </div>
      </div>

      {mesFechado ? (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#6366F1] bg-[#EEF2FF] p-4 print:hidden">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#6366F1]" />
          <div>
            <p className="text-[14px] font-medium text-[#3730A3]">
              Mês fechado em {formatFechadoEm(fecho.fechado_em)}
            </p>
            <p className="mt-1 text-[13px] text-[#4338CA]">
              Consulta e impressão disponíveis. Para alterar movimentos, reabre o mês em{' '}
              <Link to={`/fecho-mensal?mes=${monthRef}`} className="font-medium underline">
                Fecho Mensal
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <h1 className="text-[24px] font-medium text-[#111827]">{titulo}</h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">{descricao}</p>
          {outraFolhaTo ? (
            <Link to={outraFolhaTo} className="mt-2 inline-block text-[13px] text-[#1F6FEB] hover:underline">
              {outraFolhaLabel}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
            Mês
            <MonthRefInput
              value={monthRef}
              onChange={(e) => setMonthRef(e.target.value)}
              dataReferencia={nucleoProfile?.dataReferenciaSaldos}
              className="mt-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            disabled={mesFechado}
            className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-[14px] text-[#111827] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Registar movimento
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white transition-colors hover:bg-[#1557C0]"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>

      {(error || actionError) && !loading ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          {error || actionError}
        </p>
      ) : null}

      {!loading && semDocumentoCount > 0 ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] px-4 py-3 text-[13px] text-[#92400E] print:hidden">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {semDocumentoCount === 1
            ? '1 movimento ainda sem documento completo. Anexa em Documentos antes de fechar o mês.'
            : `${semDocumentoCount} movimentos ainda sem documento completo. Anexa em Documentos antes de fechar o mês.`}
        </div>
      ) : null}

      {!mesFechado ? (
      <CollapsibleSection
        className="mb-4 print:hidden"
        title={`Novo movimento de ${tipoConta === 'caixa' ? 'caixa' : 'banco'}`}
        subtitle="Preenche os dados. Os anexos podem ser adicionados depois."
        open={showForm}
        onToggle={() => setShowForm((v) => !v)}
      >
        <RegistarMovimentoForm
          tipoConta={tipoConta}
          monthRef={monthRef}
          userId={user?.id}
          onSuccess={handleRegistado}
        />
      </CollapsibleSection>
      ) : null}

      {loading ? (
        <p className="text-[14px] text-[#6B7280]">A carregar...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white print:overflow-visible print:rounded-none print:border-0">
          <table className="folha-controlo w-full">
            <colgroup>
              <col className="fc-num" />
              <col className="fc-data" />
              <col className="fc-ft" />
              <col className="fc-desc" />
              <col className="fc-rec" />
              <col className="fc-pag" />
              <col className="fc-saldo" />
              <col className="fc-acoes" />
            </colgroup>
            <thead className="border-b-2 border-[#E5E7EB] bg-[#F9FAFB] print:bg-white">
              <tr>
                {['Nº', 'Data', 'Nº FT', 'Descrição', 'Recebimentos', 'Pagamentos', 'Saldo', ''].map(
                  (head) => (
                    <th
                      key={head || 'acoes'}
                      className={`px-4 py-3 text-left text-[12px] font-medium text-[#6B7280] ${
                        head === 'Recebimentos' || head === 'Pagamentos' || head === 'Saldo'
                          ? 'text-right'
                          : ''
                      } ${head === '' ? 'print:hidden' : ''}`}
                    >
                      {head}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              <tr className="bg-[#F9FAFB] print:hidden">
                <td className="px-4 py-3 text-[14px] text-[#111827]" colSpan={6}>
                  Saldo anterior
                </td>
                <td className="px-4 py-3 text-right text-[14px] font-medium text-[#111827]">
                  {formatEur(saldoAnterior)}
                </td>
                <td />
              </tr>
              {rowsWithSaldo.length === 0 ? (
                <>
                  <tr className="print:hidden">
                    <td className="px-4 py-10 text-center" colSpan={8}>
                      <p className="text-[14px] font-medium text-[#374151]">
                        Ainda não há movimentos em {formatMonthLabel(monthRef, { long: true })}
                      </p>
                      <p className="mx-auto mt-2 max-w-md text-[13px] text-[#6B7280]">
                        Clica em <strong>Registar movimento</strong> para adicionar o primeiro.
                        Cada linha mostra o estado dos documentos (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="inline h-3.5 w-3.5 text-[#10B981]" /> completo
                        </span>
                        ,{' '}
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="inline h-3.5 w-3.5 text-[#F59E0B]" /> em falta
                        </span>
                        ).
                      </p>
                    </td>
                  </tr>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="hidden print:table-row">
                      <td className="px-1.5 py-2">&nbsp;</td>
                      <td className="px-1.5 py-2" />
                      <td className="px-1.5 py-2" />
                      <td className="px-1.5 py-2" />
                      <td className="px-1.5 py-2" />
                      <td className="px-1.5 py-2" />
                      <td className="px-1.5 py-2" />
                    </tr>
                  ))}
                </>
              ) : (
                rowsWithSaldo.map((movimento) => {
                  const docStatus = getDocStatus(movimento, movimentoIdsComModelo)
                  return (
                  <tr key={movimento.id} className="group">
                    <td className="px-4 py-3 text-[14px] text-[#111827]">
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingAnexos(movimento)}
                          className="rounded p-0.5 hover:bg-[#F3F4F6] print:hidden"
                          title={
                            (docStatus.completo ? 'Documentos completos' : docStatus.falta) +
                            ' — clica para ver'
                          }
                        >
                          {docStatus.completo ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-[#F59E0B]" />
                          )}
                        </button>
                        {movimento.linha}
                      </span>
                    </td>
                    <td className="fc-cell-data px-4 py-3 text-[14px] text-[#111827] print:px-1 print:text-[11px]">
                      {formatDatePt(movimento.data)}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#111827]">
                      {movimento.numero_documento || '-'}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#111827]">
                      {movimento.descricao || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-[14px] text-[#10B981]">
                      {movimento.recebimentos > 0 ? formatEur(movimento.recebimentos) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-[14px] text-[#EF4444]">
                      {movimento.pagamentos > 0 ? formatEur(movimento.pagamentos) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-[14px] font-medium text-[#111827]">
                      {formatEur(movimento.saldo)}
                    </td>
                    <td className="px-2 py-2 print:hidden">
                      {!mesFechado ? (
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setEditing(movimento)}
                          className="rounded px-2 py-1 text-[12px] text-[#1F6FEB] hover:bg-[#EFF6FF]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(movimento)}
                          className="rounded px-2 py-1 text-[12px] text-rose-600 hover:bg-rose-50"
                        >
                          Apagar
                        </button>
                      </div>
                      ) : null}
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB] font-medium print:bg-white">
                <td className="px-4 py-3 text-right text-[13px] font-medium text-[#6B7280]" colSpan={4}>
                  Total
                </td>
                <td className="px-4 py-3 text-right text-[14px] text-[#10B981]">
                  {formatEur(totais.totalRecebimentos)}
                </td>
                <td className="px-4 py-3 text-right text-[14px] text-[#EF4444]">
                  {formatEur(totais.totalPagamentos)}
                </td>
                <td className="px-4 py-3 text-right text-[14px] text-[#111827]">
                  {formatEur(totais.saldoFinal)}
                </td>
                <td className="print:hidden" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-16 hidden justify-end print:flex">
        <div className="w-64 border-t border-black pt-2 text-center text-[12px] text-black">
          O Tesoureiro
        </div>
      </div>

      {editing ? (
        <EditarMovimentoModal
          movimento={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      ) : null}

      {viewingAnexos ? (
        <AnexosMovimentoModal
          movimento={viewingAnexos}
          modelo={modelosPorMovimento.get(viewingAnexos.id) || null}
          monthRef={monthRef}
          onClose={() => setViewingAnexos(null)}
        />
      ) : null}
    </div>
  )
}
