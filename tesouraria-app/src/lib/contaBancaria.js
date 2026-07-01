import { getContaDeltaDesde } from './folhaMensal'

export function nucleoTemContaBancaria(nucleoProfile) {
  return Boolean(nucleoProfile?.temContaBancaria)
}

/** Movimentos que contam para validação, saldos e fecho (exclui banco se não houver conta). */
export function movimentosContaAtiva(movimentos, nucleoProfile) {
  if (nucleoTemContaBancaria(nucleoProfile)) return movimentos || []
  return (movimentos || []).filter((m) => m.tipo_conta !== 'banco')
}

export function saldoInicialBancoPerfil(nucleoProfile) {
  if (!nucleoTemContaBancaria(nucleoProfile)) return 0
  return Number(nucleoProfile?.saldoAtualBanco || 0)
}

export function calcSaldoBanco(movimentos, nucleoProfile, dataRef) {
  if (!nucleoTemContaBancaria(nucleoProfile)) return 0
  return (
    saldoInicialBancoPerfil(nucleoProfile) +
    getContaDeltaDesde(movimentos || [], 'banco', dataRef || '')
  )
}
