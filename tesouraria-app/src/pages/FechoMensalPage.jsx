import { AlertCircle, ArrowRight, CheckCircle2, Clock, ExternalLink, FileUp, Lock, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EntregaImpressaoChecklist from '../components/EntregaImpressaoChecklist'
import { useAuth } from '../hooks/useAuth'
import { useEntregaImpressao } from '../hooks/useEntregaImpressao'
import { useFechoMensal } from '../hooks/useFechoMensal'
import { formatFechadoEm } from '../lib/fechoPrazo'
import { formatEur } from '../lib/folhaMensal'
import { currentMonthRef, formatMonthLabel } from '../lib/monthRef'
import MonthRefInput from '../components/MonthRefInput'

function ChecklistRow({ checked, label, hint, action, children }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        checked ? 'border-[#10B981] bg-[#DCFCE7]' : 'border-[#F59E0B] bg-[#FEF3C7]'
      }`}
    >
      <div className="flex items-start gap-3">
        {checked ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#10B981]" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]" />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-[14px] font-medium ${checked ? 'text-[#166534]' : 'text-[#92400E]'}`}>
            {label}
          </p>
          {!checked && hint ? <p className="mt-1 text-[13px] text-[#92400E]/90">{hint}</p> : null}
          {!checked && action ? (
            <Link
              to={action.to}
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1F6FEB] hover:underline"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </div>
  )
}

function FechoMensalPage() {
  const { nucleoProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const mesFromUrl = searchParams.get('mes')
  const [monthRef, setMonthRef] = useState(() => mesFromUrl || currentMonthRef())
  const [extratoFile, setExtratoFile] = useState(null)
  const [preparado, setPreparado] = useState(false)
  const extratoInputRef = useRef(null)
  const {
    loading,
    error,
    validation,
    extratoUrl,
    extratoSubmitting,
    finalizando,
    isFechado,
    fechadoEm,
    uploadExtrato,
    finalizeFecho,
    fecharMes,
    reabrirMes,
    saldoAnteriorCaixa,
    saldoAnteriorBanco,
    saldoFinalCaixa,
    saldoFinalBanco,
    estadoValidacao,
    comentarioRevisao,
    submetidoEm,
    revistoEm,
  } = useFechoMensal(monthRef)

  useEffect(() => {
    if (mesFromUrl) setMonthRef(mesFromUrl)
  }, [mesFromUrl])

  useEffect(() => {
    setPreparado(false)
    setExtratoFile(null)
  }, [monthRef])

  const showEntrega = !loading && (validation.hasMovimentos || isFechado)
  const entrega = useEntregaImpressao(monthRef, showEntrega)

  const nomeMes = formatMonthLabel(monthRef, { long: true })
  const mesQuery = `?mes=${monthRef}`
  const temContaBancaria = validation.temContaBancaria

  async function handleUploadExtrato() {
    if (!extratoFile || isFechado) return
    const ok = await uploadExtrato(extratoFile)
    if (ok) {
      setExtratoFile(null)
      if (extratoInputRef.current) extratoInputRef.current.value = ''
    }
  }

  async function handlePreparar() {
    if (!validation.ready || isFechado) return
    const ok = await finalizeFecho()
    if (ok) setPreparado(true)
  }

  async function handleFecharMes() {
    if (!validation.ready || isFechado) return
    if (
      !window.confirm(
        `Fechar ${nomeMes} e submeter ao concelho fiscal?\n\nDepois disto não podes alterar movimentos deste mês até haver resposta. Se o concelho fiscal pedir correções, os movimentos são desbloqueados automaticamente para corrigires e resubmeteres.`,
      )
    ) {
      return
    }
    await fecharMes()
  }

  async function handleReabrirMes() {
    if (!isFechado) return
    if (
      !window.confirm(
        `Reabrir ${nomeMes}? Vais poder voltar a editar movimentos. Usa apenas se ainda não entregaste o processo em papel à contabilidade.`,
      )
    ) {
      return
    }
    const ok = await reabrirMes()
    if (ok) setPreparado(false)
  }

  const extratoUpload = !isFechado ? (
    <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white/80 p-3">
      <input
        ref={extratoInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(event) => setExtratoFile(event.target.files?.[0] || null)}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => extratoInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
        >
          <Upload className="h-4 w-4 text-[#6B7280]" />
          Escolher ficheiro
        </button>
        <p className="min-w-0 flex-1 truncate text-[12px] text-[#6B7280]">
          {extratoFile
            ? extratoFile.name
            : validation.hasExtrato
              ? 'Extrato carregado — escolhe outro para substituir'
              : 'PDF ou imagem do extrato bancário do mês'}
        </p>
        <button
          type="button"
          onClick={handleUploadExtrato}
          disabled={!extratoFile || extratoSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1F6FEB] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#1557C0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileUp className="h-4 w-4" />
          {extratoSubmitting ? 'A enviar...' : 'Enviar extrato'}
        </button>
      </div>
    </div>
  ) : null

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[24px] font-medium text-[#111827]">Fecho Mensal</h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            Validação, impressão e fecho do mês para entrega à contabilidade.
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
          <p className="text-[12px] font-medium text-[#6B7280]">Mês a fechar</p>
          <p className="mt-0.5 text-[15px] font-medium text-[#111827]">{nomeMes}</p>
          <MonthRefInput
            value={monthRef}
            onChange={(e) => setMonthRef(e.target.value)}
            dataReferencia={nucleoProfile?.dataReferenciaSaldos}
            className="mt-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
          />
        </div>
      </div>

      {isFechado ? (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-[#6366F1] bg-[#EEF2FF] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#6366F1]" />
            <div>
              <p className="text-[14px] font-medium text-[#3730A3]">
                {nomeMes} fechado em {formatFechadoEm(fechadoEm)}
              </p>
              <p className="mt-1 text-[13px] text-[#4338CA]">
                Movimentos bloqueados.{' '}
                {estadoValidacao === 'submetido'
                  ? 'A aguardar revisão do concelho fiscal antes da entrega em papel.'
                  : estadoValidacao === 'aprovado'
                    ? 'Aprovado pelo concelho fiscal — entrega o processo em papel à contabilidade.'
                    : 'Entrega o processo em papel à contabilidade.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReabrirMes}
            disabled={finalizando}
            className="shrink-0 rounded-lg border border-[#6366F1] bg-white px-4 py-2 text-[13px] font-medium text-[#4338CA] hover:bg-[#E0E7FF] disabled:opacity-50"
            title="Desbloqueia movimentos deste mês para corrigir erros"
          >
            Reabrir mês para editar
          </button>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#F59E0B]" />
            <p className="text-[14px] text-[#92400E]">
              Prazo de entrega: até dia 10 do mês seguinte. A 5 dias do prazo recebes um email se o
              mês ainda não estiver fechado. Regista movimentos na{' '}
              <Link to={`/folha-caixa${mesQuery}`} className="font-medium underline">
                folha de caixa
              </Link>
              {temContaBancaria ? (
                <>
                  {' '}
                  e{' '}
                  <Link to={`/folha-bancaria${mesQuery}`} className="font-medium underline">
                    folha bancária
                  </Link>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>
      )}

      {submetidoEm && estadoValidacao === 'submetido' ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-[#1F6FEB] bg-[#EFF6FF] p-4">
          <Clock className="h-5 w-5 shrink-0 text-[#1F6FEB]" />
          <p className="text-[14px] text-[#1E40AF]">
            Submetido ao concelho fiscal em {formatFechadoEm(submetidoEm)} — aguarda revisão.
          </p>
        </div>
      ) : null}

      {estadoValidacao === 'aprovado' ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-[#10B981] bg-[#DCFCE7] p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#10B981]" />
          <p className="text-[14px] text-[#166534]">
            Aprovado pelo concelho fiscal {revistoEm ? `em ${formatFechadoEm(revistoEm)}` : ''} —
            pronto para entrega em papel à contabilidade.
          </p>
        </div>
      ) : null}

      {estadoValidacao === 'reprovado' ? (
        <div className="mb-6 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F59E0B]" />
            <div>
              <p className="text-[14px] font-medium text-[#92400E]">
                O concelho fiscal pediu correções{revistoEm ? ` em ${formatFechadoEm(revistoEm)}` : ''}.
                Os movimentos já estão desbloqueados — corrige e volta a fechar o mês para resubmeter.
              </p>
              {comentarioRevisao ? (
                <p className="mt-1 text-[13px] text-[#92400E]/90">{comentarioRevisao}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
        <h2 className="mb-4 text-[18px] font-medium text-[#111827]">Resumo do mês</h2>
        {loading ? (
          <p className="text-[14px] text-[#6B7280]">A carregar...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-[12px] text-[#6B7280]">Núcleo</p>
              <p className="text-[14px] text-[#111827]">{nucleoProfile?.nomeNucleo || '-'}</p>
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Tesoureiro</p>
              <p className="text-[14px] text-[#111827]">{nucleoProfile?.nomeTesoureiro || '-'}</p>
            </div>
            <div>
              <p className="text-[12px] text-[#6B7280]">Caixa (abertura → fecho do mês)</p>
              <p className="text-[14px] text-[#111827]">
                {formatEur(saldoAnteriorCaixa)} → {formatEur(saldoFinalCaixa)}
              </p>
            </div>
            {temContaBancaria ? (
              <div>
                <p className="text-[12px] text-[#6B7280]">Banco (abertura → fecho do mês)</p>
                <p className="text-[14px] text-[#111827]">
                  {formatEur(saldoAnteriorBanco)} → {formatEur(saldoFinalBanco)}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
        <h2 className="mb-4 text-[18px] font-medium text-[#111827]">Checklist de validação</h2>
        <div className="space-y-3">
          <ChecklistRow
            checked={validation.hasMovimentos}
            label={
              validation.hasMovimentos
                ? `${validation.movimentosCount} movimento(s) registados no mês`
                : 'Não há movimentos registados no mês'
            }
            hint={
              temContaBancaria
                ? 'Regista receitas e despesas nas folhas de caixa e banco.'
                : 'Regista receitas e despesas na folha de caixa.'
            }
            action={
              validation.hasMovimentos
                ? null
                : { label: 'Ir para folha de caixa', to: `/folha-caixa${mesQuery}` }
            }
          />

          <ChecklistRow
            checked={validation.allHaveBaseDoc && validation.hasMovimentos}
            label={
              !validation.hasMovimentos
                ? 'Faturas e ofícios — aguarda movimentos'
                : validation.allHaveBaseDoc
                  ? 'Todos os movimentos têm fatura ou ofício anexo'
                  : validation.movimentosSemDocCount === 1
                    ? '1 movimento sem fatura ou ofício anexo'
                    : `${validation.movimentosSemDocCount} movimentos sem fatura ou ofício anexo`
            }
            hint="Anexa documentos em Documentos ou ao registar cada movimento."
            action={
              validation.allHaveBaseDoc || !validation.hasMovimentos
                ? null
                : { label: 'Ver documentos em falta', to: `/documentos${mesQuery}` }
            }
          />

          {temContaBancaria ? (
            <ChecklistRow
              checked={
                validation.allBancoHaveComprovativo || validation.bancoMovimentosCount === 0
              }
              label={
                validation.bancoMovimentosCount === 0
                  ? 'Comprovativos bancários — sem movimentos de banco'
                  : validation.allBancoHaveComprovativo
                    ? 'Todos os movimentos de banco têm comprovativo'
                    : validation.bancoSemComprovativoCount === 1
                      ? '1 movimento de banco sem comprovativo'
                      : `${validation.bancoSemComprovativoCount} movimentos de banco sem comprovativo`
              }
              hint="Cada movimento bancário precisa de comprovativo de transferência."
              action={
                validation.allBancoHaveComprovativo || validation.bancoMovimentosCount === 0
                  ? null
                  : { label: 'Ir para folha bancária', to: `/folha-bancaria${mesQuery}` }
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
              hint={
                validation.hasExtrato
                  ? null
                  : 'Carrega o PDF ou imagem do extrato bancário do mês abaixo.'
              }
            >
              {!validation.hasExtrato ? extratoUpload : null}
              {validation.hasExtrato && extratoUrl ? (
                <a
                  href={extratoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1F6FEB] hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver extrato carregado
                </a>
              ) : null}
              {validation.hasExtrato && !isFechado ? extratoUpload : null}
            </ChecklistRow>
          ) : null}
        </div>

        <p
          className={`mt-4 rounded-lg px-3 py-2 text-[14px] ${
            validation.ready ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#92400E]'
          }`}
        >
          {isFechado
            ? estadoValidacao === 'submetido'
              ? 'Mês fechado — submetido ao concelho fiscal, aguarda revisão.'
              : estadoValidacao === 'aprovado'
                ? 'Mês fechado — aprovado, pronto para entrega.'
                : 'Mês fechado — processo pronto para entrega.'
            : validation.ready
              ? 'Validação completa. Prepara a impressão abaixo e fecha o mês para submeter ao concelho fiscal.'
              : 'Completa os itens em falta antes de fechar o mês.'}
        </p>

        {!isFechado && validation.ready && !preparado ? (
          <button
            type="button"
            onClick={handlePreparar}
            disabled={finalizando}
            className="mt-5 w-full rounded-lg bg-[#1F6FEB] px-4 py-3 text-[14px] font-medium text-white hover:bg-[#1557C0] disabled:opacity-70"
          >
            {finalizando ? 'A guardar...' : 'Validar e preparar entrega'}
          </button>
        ) : null}

        {!isFechado && preparado && validation.ready ? (
          <div className="mt-5 rounded-lg border border-[#10B981] bg-[#DCFCE7] p-4 text-[14px] text-[#166534]">
            Validação guardada — imprime os documentos na checklist abaixo e fecha o mês para
            submeter ao concelho fiscal.
          </div>
        ) : null}
      </div>

      {showEntrega ? (
        <div className="mt-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-1 text-[18px] font-medium text-[#111827]">
            Entrega em papel à contabilidade
          </h2>
          <p className="mb-5 text-[13px] text-[#6B7280]">
            Imprime cada item e marca quando tiveres o documento físico pronto para juntar ao
            processo do mês.
          </p>
          {!validation.ready && !isFechado ? (
            <p className="mb-4 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] px-3 py-2 text-[13px] text-[#92400E]">
              A lista abaixo pode estar incompleta até concluíres a validação acima
              {temContaBancaria ? ' (documentos e extrato em falta)' : ' (documentos em falta)'}.
            </p>
          ) : null}
          <EntregaImpressaoChecklist {...entrega} />

          {!isFechado && validation.ready ? (
            <>
              {!entrega.progress.complete ? (
                <p className="mt-4 text-[13px] text-[#6B7280]">
                  Marca todos os itens como impressos antes de fechar o mês, ou confirma que já tens
                  o pacote em papel.
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleFecharMes}
                disabled={finalizando}
                className="mt-4 w-full rounded-lg bg-[#111827] px-4 py-3.5 text-[15px] font-medium text-white hover:bg-[#1F2937] disabled:opacity-70"
              >
                {finalizando ? 'A submeter...' : `Fechar ${nomeMes} e submeter ao concelho fiscal`}
              </button>
              <p className="mt-2 text-center text-[12px] text-[#6B7280]">
                Os movimentos ficam bloqueados e o mês fica à espera de revisão do concelho fiscal.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default FechoMensalPage
