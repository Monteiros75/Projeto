/** Dia limite de entrega a contabilidade (mes seguinte) */
export const DIA_PRAZO_ENTREGA = 10

/** Dia do mes seguinte em que enviamos lembrete (5 dias antes do prazo) */
export const DIA_LEMBRETE_FECHO = 5

export function monthRefFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Mes anterior ao calendario de `date` */
export function previousMonthRef(fromDate = new Date()) {
  const d = new Date(fromDate.getFullYear(), fromDate.getMonth() - 1, 1)
  return monthRefFromDate(d)
}

/** Mes cuja contabilidade deve ser entregue ate dia 10 do mes corrente */
export function monthRefEntregaPendente(fromDate = new Date()) {
  return previousMonthRef(fromDate)
}

export function isDiaLembreteFecho(fromDate = new Date()) {
  return fromDate.getDate() === DIA_LEMBRETE_FECHO
}

export function isAposPrazoEntrega(fromDate = new Date()) {
  return fromDate.getDate() > DIA_PRAZO_ENTREGA
}

export function isMesFechado(fecho) {
  return Boolean(fecho?.fechado_em)
}

export function formatFechadoEm(fechadoEm) {
  if (!fechadoEm) return ''
  const d = new Date(fechadoEm)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
