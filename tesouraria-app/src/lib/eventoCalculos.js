export function num(value) {
  return Number(value || 0)
}

export function linhasPorTipo(linhas, tipo) {
  return (linhas || [])
    .filter((linha) => linha.tipo === tipo)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
}

export function totaisTipo(linhas, tipo, modo = 'estimado') {
  const usarReal = modo === 'real'
  const valorKey = usarReal ? 'valor_real' : 'valor_estimado'
  return linhasPorTipo(linhas, tipo).reduce((acc, linha) => acc + num(linha[valorKey]), 0)
}

export function totaisEvento(linhas, modo = 'estimado') {
  const despesas = totaisTipo(linhas, 'despesa', modo)
  const receitas = totaisTipo(linhas, 'receita', modo)
  return { despesas, receitas, balanco: receitas - despesas }
}

export const STATUS_EVENTO = {
  planeado: { label: 'Planeado', className: 'bg-[#FEF3C7] text-[#92400E]' },
  realizado: { label: 'Realizado', className: 'bg-[#DCFCE7] text-[#166534]' },
  cancelado: { label: 'Cancelado', className: 'bg-[#F3F4F6] text-[#6B7280]' },
}

export const TIPO_LINHA_EVENTO = {
  despesa: { label: 'Despesas', corTitulo: 'text-[#DC2626]' },
  receita: { label: 'Receitas', corTitulo: 'text-[#059669]' },
}
