export function currentMonthRef() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Limite inferior do selector de mês (YYYY-MM). */
export function monthInputMin(dataReferencia, yearsBefore = 2) {
  const refYear = dataReferencia ? Number(String(dataReferencia).slice(0, 4)) : null
  const floorYear = (refYear || new Date().getFullYear()) - yearsBefore
  return `${floorYear}-01`
}

/** Limite superior do selector de mês — permite planear até 24 meses à frente. */
export function monthInputMax(monthsAhead = 24) {
  const d = new Date()
  d.setMonth(d.getMonth() + monthsAhead)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Maior referência mensal entre duas (YYYY-MM). */
export function maxMonthRef(a, b) {
  if (!a) return b || ''
  if (!b) return a
  return a >= b ? a : b
}

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function monthRefToDate(monthRef) {
  const [year, month] = String(monthRef).split('-').map(Number)
  return new Date(year, (month || 1) - 1, 1)
}

export function formatMonthLabel(monthRef, { long = false } = {}) {
  const [year, month] = String(monthRef).split('-').map(Number)
  const idx = (month || 1) - 1
  const nome = long ? MESES_LONGOS[idx] : MESES_CURTOS[idx]
  return long ? `${nome} de ${year}` : nome
}

export function lastMonthRefs(count = 6) {
  const now = new Date()
  const refs = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    refs.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return refs
}

/** Lista YYYY-MM consecutivos entre dois meses (inclusive). */
export function monthRefsInRange(fromRef, toRef) {
  if (!fromRef || !toRef) return []
  const start = monthRefToDate(fromRef)
  const end = monthRefToDate(toRef)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []

  const refs = []
  const cursor = new Date(start)
  while (cursor <= end) {
    refs.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return refs
}

export function earliestMonthRefFromMovimentos(movimentos, fallbackRef = currentMonthRef()) {
  const refs = (movimentos || [])
    .map((m) => m.month_ref)
    .filter(Boolean)
    .sort()
  return refs[0] || fallbackRef
}
