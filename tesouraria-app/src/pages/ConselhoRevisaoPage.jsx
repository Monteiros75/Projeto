import { AlertCircle, ArrowLeft, CheckCircle2, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import EntregaImpressaoChecklist from '../components/EntregaImpressaoChecklist'
import FolhaContaSomenteLeitura from '../components/FolhaContaSomenteLeitura'
import MonthRefInput from '../components/MonthRefInput'
import { useConselhoFecho } from '../hooks/useConselhoFecho'
import { useEntregaImpressao } from '../hooks/useEntregaImpressao'
import { formatFechadoEm } from '../lib/fechoPrazo'
import { currentMonthRef, formatMonthLabel } from '../lib/monthRef'

function ChecklistRow({ checked, label }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${
        checked ? 'border-[#10B981] bg-[#DCFCE7]' : 'border-[#F59E0B] bg-[#FEF3C7]'
      }`}
    >
      {checked ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#10B981]" />
      ) : (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]" />
      )}
      <p className={`text-[14px] font-medium ${checked ? 'text-[#166534]' : 'text-[#92400E]'}`}>
        {label}
      </p>
    </div>
  )
}

function ConselhoRevisaoPage() {
  const { nucleoId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const mesFromUrl = searchParams.get('mes')
  const [monthRef, setMonthRef] = useState(() => mesFromUrl || currentMonthRef())
  const [comentario, setComentario] = useState('')

  const {
    nucleoProfile,
    movimentos,
    loading,
    error,
    validation,
    movimentoIdsComModelo,
    modelosPorMovimento,
    saldoAnteriorCaixa,
    saldoAnteriorBanco,
    estadoValidacao,
    comentarioRevisao,
    submetidoEm,
    revistoEm,
    revisaoSubmitting,
    revisaoError,
    aprovar,
    reprovar,
  } = useConselhoFecho(nucleoId, monthRef)

  const entrega = useEntregaImpressao(monthRef, !loading, { nucleoId, nucleoProfile })

  useEffect(() => {
    if (mesFromUrl) setMonthRef(mesFromUrl)
  }, [mesFromUrl])

  function handleMonthChange(event) {
    const value = event.target.value
    setMonthRef(value)
    setSearchParams({ mes: value })
  }

  const nomeMes = formatMonthLabel(monthRef, { long: true })
  const podeRever = estadoValidacao === 'submetido'
  const temContaBancaria = validation.temContaBancaria

  async function handleAprovar() {
    if (!window.confirm(`Aprovar a contabilidade de ${nomeMes} de ${nucleoProfile?.nomeNucleo || 'este núcleo'}?`)) {
      return
    }
    await aprovar()
  }

  async function handleReprovar() {
    if (!comentario.trim()) {
      window.alert('Escreve um comentário a explicar o que falta corrigir.')
      return
    }
    const ok = await reprovar(comentario.trim())
    if (ok) setComentario('')
  }

  return (
    <div className="p-4 md:p-8">
      <Link
        to="/concelho"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1F6FEB] hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Núcleos atribuídos
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[24px] font-medium text-[#111827]">
            {nucleoProfile?.nomeNucleo || 'Núcleo'}
          </h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            Tesoureiro: {nucleoProfile?.nomeTesoureiro || '-'}
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
          <p className="text-[12px] font-medium text-[#6B7280]">Mês em revisão</p>
          <p className="mt-0.5 text-[15px] font-medium text-[#111827]">{nomeMes}</p>
          <MonthRefInput
            value={monthRef}
            onChange={handleMonthChange}
            dataReferencia={nucleoProfile?.dataReferenciaSaldos}
            className="mt-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
          />
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          {error}
        </p>
      ) : null}

      {submetidoEm && estadoValidacao === 'submetido' ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-[#1F6FEB] bg-[#EFF6FF] p-4">
          <Clock className="h-5 w-5 shrink-0 text-[#1F6FEB]" />
          <p className="text-[14px] text-[#1E40AF]">
            Submetido para revisão em {formatFechadoEm(submetidoEm)}.
          </p>
        </div>
      ) : null}

      {estadoValidacao === 'aprovado' ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-[#10B981] bg-[#DCFCE7] p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#10B981]" />
          <p className="text-[14px] text-[#166534]">
            Aprovado {revistoEm ? `em ${formatFechadoEm(revistoEm)}` : ''}.
          </p>
        </div>
      ) : null}

      {estadoValidacao === 'reprovado' ? (
        <div className="mb-6 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]" />
            <div>
              <p className="text-[14px] font-medium text-[#92400E]">
                Correções pedidas {revistoEm ? `em ${formatFechadoEm(revistoEm)}` : ''} — o tesoureiro ainda não resubmeteu.
              </p>
              {comentarioRevisao ? (
                <p className="mt-1 text-[13px] text-[#92400E]/90">{comentarioRevisao}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!submetidoEm ? (
        <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-4">
          <p className="text-[14px] text-[#6B7280]">
            Este mês ainda não foi submetido para revisão pelo tesoureiro.
          </p>
        </div>
      ) : null}

      <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
        <h2 className="mb-4 text-[18px] font-medium text-[#111827]">Checklist de validação</h2>
        {loading ? (
          <p className="text-[14px] text-[#6B7280]">A carregar...</p>
        ) : (
          <div className="space-y-3">
            <ChecklistRow
              checked={validation.hasMovimentos}
              label={
                validation.hasMovimentos
                  ? `${validation.movimentosCount} movimento(s) registados no mês`
                  : 'Não há movimentos registados no mês'
              }
            />
            <ChecklistRow
              checked={validation.allHaveBaseDoc && validation.hasMovimentos}
              label={
                !validation.hasMovimentos
                  ? 'Faturas e ofícios — sem movimentos'
                  : validation.allHaveBaseDoc
                    ? 'Todos os movimentos têm fatura ou ofício anexo'
                    : `${validation.movimentosSemDocCount} movimento(s) sem fatura ou ofício anexo`
              }
            />
            {temContaBancaria ? (
              <ChecklistRow
                checked={validation.allBancoHaveComprovativo || validation.bancoMovimentosCount === 0}
                label={
                  validation.bancoMovimentosCount === 0
                    ? 'Comprovativos bancários — sem movimentos de banco'
                    : validation.allBancoHaveComprovativo
                      ? 'Todos os movimentos de banco têm comprovativo'
                      : `${validation.bancoSemComprovativoCount} movimento(s) de banco sem comprovativo`
                }
              />
            ) : null}
            {temContaBancaria ? (
              <ChecklistRow
                checked={validation.hasExtrato}
                label={
                  validation.hasExtrato
                    ? 'Extrato bancário do mês carregado'
                    : 'Extrato bancário do mês não carregado'
                }
              />
            ) : null}
          </div>
        )}
      </div>

      {loading ? null : (
        <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-1 text-[18px] font-medium text-[#111827]">Folha de movimentos</h2>
          <p className="mb-5 text-[13px] text-[#6B7280]">
            Compara cada linha (data, nº de documento, valor) com as faturas físicas recebidas.
            Clica no ícone para ver os documentos anexados a um movimento.
          </p>
          <FolhaContaSomenteLeitura
            tipoConta="caixa"
            titulo="Folha de Caixa"
            linhaPrefixo="C"
            movimentos={movimentos}
            saldoAnterior={saldoAnteriorCaixa}
            movimentoIdsComModelo={movimentoIdsComModelo}
            modelosPorMovimento={modelosPorMovimento}
            monthRef={monthRef}
          />
          {temContaBancaria ? (
            <FolhaContaSomenteLeitura
              tipoConta="banco"
              titulo="Folha Bancária"
              linhaPrefixo="B"
              movimentos={movimentos}
              saldoAnterior={saldoAnteriorBanco}
              movimentoIdsComModelo={movimentoIdsComModelo}
              modelosPorMovimento={modelosPorMovimento}
              monthRef={monthRef}
            />
          ) : null}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
        <h2 className="mb-1 text-[18px] font-medium text-[#111827]">Documentos</h2>
        <p className="mb-5 text-[13px] text-[#6B7280]">
          Consulta os documentos submetidos pelo tesoureiro para este mês.
        </p>
        <EntregaImpressaoChecklist {...entrega} />
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
        <h2 className="mb-4 text-[18px] font-medium text-[#111827]">Decisão</h2>
        {!podeRever ? (
          <p className="text-[14px] text-[#6B7280]">
            Só é possível aprovar ou pedir correções quando o mês estiver submetido para revisão.
          </p>
        ) : (
          <>
            <label htmlFor="comentario" className="mb-2 block text-[14px] text-[#111827]">
              Comentário (obrigatório para pedir correções)
            </label>
            <textarea
              id="comentario"
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
              rows={3}
              placeholder="Ex.: fatura nº 123 sem número de documento, falta comprovativo do movimento de 12/03..."
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            />

            {revisaoError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
                {revisaoError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAprovar}
                disabled={revisaoSubmitting}
                className="flex-1 rounded-lg bg-[#10B981] px-4 py-3 text-[14px] font-medium text-white hover:bg-[#0EA371] disabled:opacity-70"
              >
                {revisaoSubmitting ? 'A guardar...' : 'Aprovar'}
              </button>
              <button
                type="button"
                onClick={handleReprovar}
                disabled={revisaoSubmitting}
                className="flex-1 rounded-lg border border-[#F59E0B] bg-white px-4 py-3 text-[14px] font-medium text-[#92400E] hover:bg-[#FEF3C7] disabled:opacity-70"
              >
                {revisaoSubmitting ? 'A guardar...' : 'Pedir correções'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ConselhoRevisaoPage
