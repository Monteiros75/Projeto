const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/** Converte valor de <input type="month"> (YYYY-MM) para date ISO (1.º dia). */
export function monthInputToDate(monthValue) {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return null
  return `${monthValue}-01`
}

/** Converte date/timestamp da BD para YYYY-MM (input month). */
export function dateToMonthInput(value) {
  if (!value) return ''
  const str = String(value)
  return str.length >= 7 ? str.slice(0, 7) : ''
}

function formatMesAno(value) {
  const monthInput = dateToMonthInput(value)
  if (!monthInput) return ''
  const [year, month] = monthInput.split('-')
  const idx = Number(month) - 1
  const nomeMes = MESES[idx]
  if (!nomeMes || !year) return monthInput
  return `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)} de ${year}`
}

export function formatMandatoLabel(inicio, fim) {
  const ini = formatMesAno(inicio)
  const end = formatMesAno(fim)
  if (ini && end) return `${ini} a ${end}`
  if (ini) return `Desde ${ini}`
  if (end) return `Até ${end}`
  return 'Mandato não definido'
}

export function anoFromMandato(inicio) {
  const monthInput = dateToMonthInput(inicio)
  if (!monthInput) return null
  return Number(monthInput.split('-')[0])
}

/** Mandato predefinido: dezembro do ano corrente até dezembro do ano seguinte. */
export function mandatoPadraoSugerido() {
  const now = new Date()
  const year = now.getMonth() >= 11 ? now.getFullYear() : now.getFullYear() - 1
  return {
    inicio: `${year}-12`,
    fim: `${year + 1}-12`,
  }
}

export function tituloPadraoPlano(tipoLabel, inicio, fim) {
  const ini = formatMesAno(inicio)
  const end = formatMesAno(fim)
  if (ini && end) {
    return `${tipoLabel} (${ini} – ${end})`
  }
  return tipoLabel
}
