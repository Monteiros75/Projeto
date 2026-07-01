export function formatDatePt(isoDate) {
  if (!isoDate) return ''
  const parts = String(isoDate).split('-')
  if (parts.length !== 3) return isoDate
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

export function formatEur(value) {
  return Number(value || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  })
}

/** Série mensal receitas/despesas para gráficos da dashboard. */
export function buildSerieMensal(movimentos, monthRefs) {
  const showYear = monthRefsSpanYears(monthRefs)
  return monthRefs.map((ref) => {
    const doMes = (movimentos || []).filter((m) => m.month_ref === ref)
    const receitas = doMes
      .filter((m) => m.natureza === 'recebimento')
      .reduce((acc, m) => acc + Number(m.valor || 0), 0)
    const despesas = doMes
      .filter((m) => m.natureza === 'pagamento')
      .reduce((acc, m) => acc + Number(m.valor || 0), 0)
    const [year] = String(ref).split('-')
    const mesCurto = formatMonthLabelCurto(ref)
    return {
      monthRef: ref,
      mes: showYear ? `${mesCurto} ${String(year).slice(-2)}` : mesCurto,
      receitas,
      despesas,
    }
  })
}

function formatMonthLabelCurto(monthRef) {
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const [, month] = String(monthRef).split('-').map(Number)
  return MESES[(month || 1) - 1] || monthRef
}

function monthRefsSpanYears(monthRefs) {
  if (!monthRefs?.length) return false
  const years = new Set(monthRefs.map((ref) => String(ref).slice(0, 4)))
  return years.size > 1
}

export function getMovimentoDelta(movimento) {
  const valor = Number(movimento?.valor || 0)
  return movimento?.natureza === 'recebimento' ? valor : -valor
}

export function getContaDelta(movimentos, tipoConta) {
  return movimentos
    .filter((m) => m.tipo_conta === tipoConta)
    .reduce((acc, movimento) => acc + getMovimentoDelta(movimento), 0)
}

export function movimentosDesde(movimentos, dataReferencia) {
  if (!dataReferencia) return movimentos
  return movimentos.filter((m) => String(m.data || '') >= dataReferencia)
}

export function getContaDeltaDesde(movimentos, tipoConta, dataReferencia) {
  return getContaDelta(movimentosDesde(movimentos, dataReferencia), tipoConta)
}

export function getDeltaAntesDoMes(movimentos, tipoConta, monthRef) {
  return getContaDelta(
    movimentos.filter((m) => (m.month_ref || '') < monthRef),
    tipoConta,
  )
}

export function getSaldoAtualConta(movimentos, tipoConta, saldoInicial) {
  return Number(saldoInicial || 0) + getContaDelta(movimentos, tipoConta)
}

export function getSaldoAberturaMes(movimentos, tipoConta, saldoInicial, monthRef) {
  return Number(saldoInicial || 0) + getDeltaAntesDoMes(movimentos, tipoConta, monthRef)
}

export function buildControlRows(movimentos, tipoConta, saldoAnterior, prefixo) {
  const rows = movimentos
    .filter((m) => m.tipo_conta === tipoConta)
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''))

  let saldo = Number(saldoAnterior || 0)
  return rows.map((m, idx) => {
    const valor = Number(m.valor || 0)
    const recebimentos = m.natureza === 'recebimento' ? valor : 0
    const pagamentos = m.natureza === 'pagamento' ? valor : 0
    saldo = saldo + recebimentos - pagamentos

    return {
      ...m,
      linha: `${prefixo}${idx + 1}`,
      recebimentos,
      pagamentos,
      saldo,
    }
  })
}

/** Mapa movimento id → código de linha (C1, B2, …) como na folha mensal. */
export function buildMovimentoLinhaMap(movimentos) {
  const map = new Map()
  for (const { tipo, prefix } of [
    { tipo: 'caixa', prefix: 'C' },
    { tipo: 'banco', prefix: 'B' },
  ]) {
    movimentos
      .filter((m) => m.tipo_conta === tipo)
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
      .forEach((m, idx) => map.set(m.id, `${prefix}${idx + 1}`))
  }
  return map
}
