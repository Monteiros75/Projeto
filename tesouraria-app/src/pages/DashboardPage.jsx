import { AlertCircle, Plus, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboardData } from '../hooks/useDashboardData'
import { DIA_PRAZO_ENTREGA } from '../lib/fechoPrazo'
import { buildSerieMensal } from '../lib/folhaMensal'
import {
  currentMonthRef,
  formatMonthLabel,
  lastMonthRefs,
  monthInputMax,
  monthRefsInRange,
} from '../lib/monthRef'

const PERIODOS_GRAFICO = [
  { id: '3', label: 'Últimos 3 meses', months: 3 },
  { id: '6', label: 'Últimos 6 meses', months: 6 },
  { id: '12', label: 'Últimos 12 meses', months: 12 },
  { id: 'all', label: 'Todo o período' },
  { id: 'custom', label: 'Personalizado' },
]

function formatEur(value) {
  return Number(value || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  })
}

function formatEurAxis(value) {
  return `${Number(value || 0).toLocaleString('pt-PT')} €`
}

function formatDateShortPt(isoDate) {
  if (!isoDate) return ''
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

function resumoPendenciasEntrega(alertaEntrega) {
  if (!alertaEntrega?.show) return ''
  const partes = []
  if (alertaEntrega.semDocumento > 0) {
    partes.push(
      `${alertaEntrega.semDocumento} movimento${alertaEntrega.semDocumento === 1 ? '' : 's'} sem documento`,
    )
  }
  if (alertaEntrega.semComprovativo > 0) {
    partes.push(
      `${alertaEntrega.semComprovativo} sem comprovativo bancário`,
    )
  }
  if (alertaEntrega.faltaExtrato) {
    partes.push('extrato bancário em falta')
  }
  return partes.join(' · ')
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, valueColor, footer }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-[#6B7280]">{label}</p>
          <p className={`mt-1 text-[28px] font-semibold leading-tight ${valueColor || 'text-[#111827]'}`}>
            {value}
          </p>
          {footer ? <div className="mt-3">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const {
    saldoCaixa,
    saldoBanco,
    saldoTotal,
    movimentosVisiveis,
    mesAtualRef,
    chartDesdeRef,
    chartAteRef,
    receitasMes,
    despesasMes,
    numReceitasMes,
    numDespesasMes,
    totalMovimentos,
    ultimosMovimentos,
    fechoPendente,
    lembreteFecho,
    mesAnteriorRef,
    temContaBancaria,
    alertaEntrega,
    loading,
  } = useDashboardData()

  const [periodoGrafico, setPeriodoGrafico] = useState('6')
  const [customFrom, setCustomFrom] = useState(chartDesdeRef || currentMonthRef())
  const [customTo, setCustomTo] = useState(chartAteRef || currentMonthRef())

  useEffect(() => {
    if (chartDesdeRef) setCustomFrom(chartDesdeRef)
    if (chartAteRef) setCustomTo(chartAteRef)
  }, [chartDesdeRef, chartAteRef])

  const chartMaxRef = monthInputMax()

  const monthRefsGrafico = useMemo(() => {
    if (periodoGrafico === 'all') {
      return monthRefsInRange(chartDesdeRef || mesAtualRef, chartAteRef || mesAtualRef)
    }
    if (periodoGrafico === 'custom') {
      if (!customFrom || !customTo) return lastMonthRefs(6)
      return monthRefsInRange(customFrom, customTo)
    }
    const preset = PERIODOS_GRAFICO.find((item) => item.id === periodoGrafico)
    return lastMonthRefs(preset?.months || 6)
  }, [periodoGrafico, customFrom, customTo, chartDesdeRef, chartAteRef, mesAtualRef])

  const serie = useMemo(
    () => buildSerieMensal(movimentosVisiveis, monthRefsGrafico),
    [movimentosVisiveis, monthRefsGrafico],
  )

  const periodoGraficoLabel = useMemo(() => {
    if (periodoGrafico === 'custom' && customFrom && customTo) {
      return `${formatMonthLabel(customFrom, { long: true })} – ${formatMonthLabel(customTo, { long: true })}`
    }
    if (periodoGrafico === 'all') {
      return 'Todo o período com movimentos'
    }
    return PERIODOS_GRAFICO.find((item) => item.id === periodoGrafico)?.label || ''
  }, [periodoGrafico, customFrom, customTo])

  const nomeMes = mesAtualRef ? formatMonthLabel(mesAtualRef, { long: true }) : ''
  const nomeMesAnterior = mesAnteriorRef ? formatMonthLabel(mesAnteriorRef, { long: true }) : ''
  const prazoEntrega = `dia ${DIA_PRAZO_ENTREGA} de ${nomeMes.toLowerCase()}`
  const resultadoMes = receitasMes - despesasMes
  const pendenciasEntrega = resumoPendenciasEntrega(alertaEntrega)
  const mostrarAlertaDocs =
    alertaEntrega?.show && !lembreteFecho && !fechoPendente && pendenciasEntrega

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[24px] font-medium text-[#111827]">Dashboard</h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">Visão geral da situação financeira</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            to="/folha-caixa"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1F6FEB] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#1557C0]"
          >
            <Plus className="h-4 w-4" />
            Registar movimento
          </Link>
          <Link
            to={`/fecho-mensal${mesAnteriorRef ? `?mes=${mesAnteriorRef}` : ''}`}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            Fecho mensal
          </Link>
        </div>
      </div>

      {lembreteFecho ? (
        <Link
          to={`/fecho-mensal?mes=${mesAnteriorRef}`}
          className="mb-6 flex items-start gap-3 rounded-lg border border-[#F59E0B] bg-[#FEF3C7] p-4 transition-colors hover:bg-[#FDE9B0]"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#F59E0B]" />
          <div>
            <p className="text-[14px] font-medium text-[#92400E]">
              Fecho de {nomeMesAnterior} pendente · prazo até {prazoEntrega}
            </p>
            <p className="text-[13px] text-[#92400E]">
              O mês ainda não está fechado. Valida documentos, imprime e conclui em Fecho Mensal.
            </p>
            {pendenciasEntrega ? (
              <p className="mt-1 text-[13px] text-[#92400E]/90">{pendenciasEntrega}</p>
            ) : null}
          </div>
        </Link>
      ) : null}

      {fechoPendente ? (
        <Link
          to={`/fecho-mensal?mes=${mesAnteriorRef}`}
          className="mb-6 flex items-start gap-3 rounded-lg border border-[#EF4444] bg-[#FEE2E2] p-4 transition-colors hover:bg-[#FECACA]"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#EF4444]" />
          <div>
            <p className="text-[14px] font-medium text-[#991B1B]">
              Fecho de {nomeMesAnterior} em atraso · prazo era {prazoEntrega}
            </p>
            <p className="text-[13px] text-[#991B1B]">
              O mês ainda não foi fechado. Clica para concluir a entrega à contabilidade.
            </p>
            {pendenciasEntrega ? (
              <p className="mt-1 text-[13px] text-[#991B1B]/90">{pendenciasEntrega}</p>
            ) : null}
          </div>
        </Link>
      ) : null}

      {mostrarAlertaDocs ? (
        <Link
          to={`/fecho-mensal?mes=${mesAnteriorRef}`}
          className="mb-6 flex items-start gap-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-4 transition-colors hover:bg-[#DBEAFE]"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#1F6FEB]" />
          <div>
            <p className="text-[14px] font-medium text-[#1E3A8A]">
              {nomeMesAnterior} — pendências antes do fecho
            </p>
            <p className="text-[13px] text-[#1E40AF]">{pendenciasEntrega}</p>
          </div>
        </Link>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          icon={Wallet}
          iconBg="bg-[#F3F4F6]"
          iconColor="text-[#6B7280]"
          label="Saldo total"
          value={formatEur(saldoTotal)}
          footer={
            temContaBancaria ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#6B7280]">
                <span>
                  Caixa <span className="font-medium text-[#111827]">{formatEur(saldoCaixa)}</span>
                </span>
                <span>
                  Banco <span className="font-medium text-[#111827]">{formatEur(saldoBanco)}</span>
                </span>
              </div>
            ) : (
              <p className="text-[12px] text-[#6B7280]">Apenas movimentos de caixa</p>
            )
          }
        />

        <KpiCard
          icon={TrendingUp}
          iconBg="bg-[#DCFCE7]"
          iconColor="text-[#10B981]"
          label={`Receitas de ${nomeMes}`}
          value={formatEur(receitasMes)}
          valueColor="text-[#10B981]"
          footer={
            <p className="text-[12px] text-[#6B7280]">
              {numReceitasMes} {numReceitasMes === 1 ? 'movimento' : 'movimentos'}
            </p>
          }
        />

        <KpiCard
          icon={TrendingDown}
          iconBg="bg-[#FEE2E2]"
          iconColor="text-[#EF4444]"
          label={`Despesas de ${nomeMes}`}
          value={formatEur(despesasMes)}
          valueColor="text-[#EF4444]"
          footer={
            <p className="text-[12px] text-[#6B7280]">
              {numDespesasMes} {numDespesasMes === 1 ? 'movimento' : 'movimentos'}
            </p>
          }
        />
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF]">
          <Scale className="h-5 w-5 text-[#1F6FEB]" />
        </div>
        <div>
          <p className="text-[13px] text-[#6B7280]">Resultado de {nomeMes}</p>
          <p
            className={`text-[22px] font-semibold leading-tight ${
              resultadoMes >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
            }`}
          >
            {resultadoMes >= 0 ? '+' : ''}
            {formatEur(resultadoMes)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[18px] font-medium text-[#111827]">Evolução mensal</h2>
            <p className="mt-1 text-[13px] text-[#6B7280]">{periodoGraficoLabel}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#6B7280]">Período</span>
              <select
                value={periodoGrafico}
                onChange={(event) => setPeriodoGrafico(event.target.value)}
                className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#111827] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              >
                {PERIODOS_GRAFICO.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {periodoGrafico === 'custom' ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-[12px] text-[#6B7280]">De</span>
                  <input
                    type="month"
                    value={customFrom}
                    min={chartDesdeRef}
                    max={customTo || chartMaxRef}
                    onChange={(event) => setCustomFrom(event.target.value)}
                    className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#111827] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] text-[#6B7280]">Até</span>
                  <input
                    type="month"
                    value={customTo}
                    min={customFrom || chartDesdeRef}
                    max={chartMaxRef}
                    onChange={(event) => setCustomTo(event.target.value)}
                    className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#111827] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
                  />
                </label>
              </>
            ) : null}
            <div className="flex items-center gap-4 pb-2 text-[12px] text-[#6B7280]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-[#10B981]" />
                Receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-[#EF4444]" />
                Despesas
              </span>
            </div>
          </div>
        </div>
        {loading ? (
          <p className="py-12 text-center text-[14px] text-[#6B7280]">A carregar...</p>
        ) : totalMovimentos === 0 ? (
          <p className="py-12 text-center text-[14px] text-[#6B7280]">
            Ainda não há movimentos registados. Começa pela{' '}
            <Link to="/folha-caixa" className="text-[#1F6FEB] hover:underline">
              folha de caixa
            </Link>
            .
          </p>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mes" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <YAxis
                  stroke="#6B7280"
                  style={{ fontSize: '11px' }}
                  tickFormatter={formatEurAxis}
                  width={72}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatEur(value),
                    name === 'receitas' ? 'Receitas' : 'Despesas',
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (value === 'receitas' ? 'Receitas' : 'Despesas')}
                />
                <Line
                  type="monotone"
                  dataKey="receitas"
                  name="receitas"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="despesas"
                  name="despesas"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-medium text-[#111827]">Últimos movimentos</h2>
            <p className="mt-1 text-[13px] text-[#6B7280]">Os 5 registos mais recentes</p>
          </div>
          <Link to="/folha-caixa" className="text-[13px] font-medium text-[#1F6FEB] hover:underline">
            Ver folhas
          </Link>
        </div>
        {loading ? (
          <p className="py-8 text-center text-[14px] text-[#6B7280]">A carregar...</p>
        ) : ultimosMovimentos.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-[#6B7280]">Sem movimentos registados.</p>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {ultimosMovimentos.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-[#111827]">
                    {m.descricao || m.numero_documento || 'Movimento'}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">
                    {formatDateShortPt(m.data)} · {m.tipo_conta === 'banco' ? 'Banco' : 'Caixa'}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[15px] font-semibold tabular-nums ${
                    m.natureza === 'recebimento' ? 'text-[#10B981]' : 'text-[#EF4444]'
                  }`}
                >
                  {m.natureza === 'recebimento' ? '+' : '-'}
                  {formatEur(m.valor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
