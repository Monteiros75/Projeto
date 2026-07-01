import { SECCOES_PADRAO } from './seccoes'

export function num(value) {
  return Number(value || 0)
}

export function agruparPorSeccao(linhas, seccoes = SECCOES_PADRAO) {
  const mapa = new Map()
  for (const seccao of seccoes) {
    mapa.set(seccao, [])
  }
  for (const linha of linhas || []) {
    if (!mapa.has(linha.seccao)) {
      mapa.set(linha.seccao, [])
    }
    mapa.get(linha.seccao).push(linha)
  }
  for (const [, lista] of mapa) {
    lista.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  }
  return mapa
}

export function totaisSeccao(linhasSeccao) {
  const despesas = (linhasSeccao || []).reduce((acc, l) => acc + num(l.despesa_valor), 0)
  const receitas = (linhasSeccao || []).reduce((acc, l) => acc + num(l.receita_valor), 0)
  return { despesas, receitas, balanco: receitas - despesas }
}

export function totaisGlobais(linhas) {
  const despesas = (linhas || []).reduce((acc, l) => acc + num(l.despesa_valor), 0)
  const receitas = (linhas || []).reduce((acc, l) => acc + num(l.receita_valor), 0)
  return { despesas, receitas, balanco: receitas - despesas }
}

export function resumoPorSeccao(linhas, seccoes) {
  const mapa = agruparPorSeccao(linhas, seccoes)
  const resultado = []
  for (const [seccao, lista] of mapa) {
    if (!lista.length) continue
    resultado.push({ seccao, ...totaisSeccao(lista) })
  }
  return resultado
}
