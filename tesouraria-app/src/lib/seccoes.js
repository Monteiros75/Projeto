export const SECCOES_PADRAO = [
  'Direção',
  'Secção Pedagógica',
  'Secção de Imagem',
  'Secção Recreativa e Cultural',
]

/** @deprecated usar getSeccoesDoPlano(plano) */
export const SECCOES = SECCOES_PADRAO

export const TIPOS_PLANO = {
  pao: {
    valor: 'pao',
    label: 'Plano de Atividades e Orçamento',
    sigla: 'PAO',
    descricao: 'Previsão de atividades e orçamento no início do mandato',
    colunaValor: 'Valor previsto',
  },
  relatorio: {
    valor: 'relatorio',
    label: 'Relatório Anual de Contas',
    sigla: 'RAC',
    descricao: 'Receitas e despesas reais ao longo do mandato',
    colunaValor: 'Valor real',
  },
}

export function getSeccoesDoPlano(plano) {
  if (Array.isArray(plano?.seccoes) && plano.seccoes.length) {
    return plano.seccoes.filter(Boolean)
  }
  return [...SECCOES_PADRAO]
}
