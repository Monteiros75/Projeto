export function getPrevisaoSecao(plano, seccao) {
  if (!plano?.previsao_seccoes || typeof plano.previsao_seccoes !== 'object') return ''
  return plano.previsao_seccoes[seccao] || ''
}

export function parsePrevisaoLinhas(texto) {
  return (texto || '')
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
}

export function tituloOrcamentoSecao(seccao) {
  if (seccao === 'Direção') return 'Atividades da Direção do Núcleo'
  return `Orçamento ${seccao}`
}

export function seccaoTemConteudo(seccao, plano, linhasSeccao) {
  const previsao = getPrevisaoSecao(plano, seccao).trim()
  return Boolean(previsao || (linhasSeccao && linhasSeccao.length))
}

export function seccoesComOrcamento(linhas, plano, seccoes) {
  const grupos = new Map()
  for (const seccao of seccoes) {
    const linhasSeccao = (linhas || []).filter((l) => l.seccao === seccao)
    if (linhasSeccao.length) grupos.set(seccao, linhasSeccao)
  }
  return grupos
}
