import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  isAposPrazoEntrega,
  isDiaLembreteFecho,
  monthRefEntregaPendente,
} from '../lib/fechoPrazo'
import { movimentoTemDocumentoBase } from '../lib/associarDocumentoMovimento'
import {
  calcSaldoBanco,
  movimentosContaAtiva,
  nucleoTemContaBancaria,
} from '../lib/contaBancaria'
import { getContaDeltaDesde } from '../lib/folhaMensal'
import {
  currentMonthRef,
  earliestMonthRefFromMovimentos,
  maxMonthRef,
} from '../lib/monthRef'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useDashboardData() {
  const { user, nucleoProfile } = useAuth()
  const [movimentos, setMovimentos] = useState([])
  const [fechoMesEntrega, setFechoMesEntrega] = useState(null)
  const [modelosMesEntrega, setModelosMesEntrega] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!user?.id) {
      setMovimentos([])
      setFechoMesEntrega(null)
      setModelosMesEntrega(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')

    const mesEntregaRef = monthRefEntregaPendente()

    const [movRes, fechoRes, modelosRes] = await Promise.all([
      supabase
        .from('movimentos')
        .select(
          'id, natureza, valor, tipo_conta, month_ref, data, descricao, numero_documento, created_at, fatura_ou_oficio_path, comprovativo_banco_path',
        )
        .eq('nucleo_id', user.id),
      supabase
        .from('fechos_mensais')
        .select('fechado_em, extrato_path')
        .eq('nucleo_id', user.id)
        .eq('month_ref', mesEntregaRef)
        .maybeSingle(),
      supabase
        .from('documentos_modelos')
        .select('movimento_id')
        .eq('nucleo_id', user.id)
        .eq('month_ref', mesEntregaRef)
        .not('movimento_id', 'is', null),
    ])

    if (movRes.error) {
      console.error(movRes.error)
      setError('Erro ao carregar dados da dashboard.')
      setMovimentos([])
      setFechoMesEntrega(null)
      setModelosMesEntrega(new Set())
      setLoading(false)
      return
    }
    setMovimentos(movRes.data || [])
    setFechoMesEntrega(fechoRes.data || null)
    setModelosMesEntrega(
      new Set((modelosRes.data || []).map((row) => row.movimento_id).filter(Boolean)),
    )
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    reload()
  }, [reload])

  const dados = useMemo(() => {
    const temContaBancaria = nucleoTemContaBancaria(nucleoProfile)
    const saldoInicialCaixa = Number(nucleoProfile?.saldoAtualCaixa || 0)
    const dataRef = nucleoProfile?.dataReferenciaSaldos || ''
    const movimentosVisiveis = movimentosContaAtiva(movimentos, nucleoProfile)

    const saldoCaixa = saldoInicialCaixa + getContaDeltaDesde(movimentosVisiveis, 'caixa', dataRef)
    const saldoBanco = calcSaldoBanco(movimentos, nucleoProfile, dataRef)

    const mesAtualRef = currentMonthRef()

    const movMesAtual = movimentosVisiveis.filter((m) => m.month_ref === mesAtualRef)
    const receitasMes = movMesAtual
      .filter((m) => m.natureza === 'recebimento')
      .reduce((acc, m) => acc + Number(m.valor || 0), 0)
    const despesasMes = movMesAtual
      .filter((m) => m.natureza === 'pagamento')
      .reduce((acc, m) => acc + Number(m.valor || 0), 0)

    const ultimosMovimentos = [...movimentosVisiveis]
      .sort((a, b) => {
        const dataCmp = String(b.data || '').localeCompare(String(a.data || ''))
        if (dataCmp !== 0) return dataCmp
        return String(b.created_at || '').localeCompare(String(a.created_at || ''))
      })
      .slice(0, 5)

    const mesEntregaRef = monthRefEntregaPendente()
    const movMesEntrega = movimentosVisiveis.filter((m) => m.month_ref === mesEntregaRef)
    const mesFechado = Boolean(fechoMesEntrega?.fechado_em)
    const temMovimentosEntrega = movMesEntrega.length > 0
    const fechoPendente = isAposPrazoEntrega() && temMovimentosEntrega && !mesFechado
    const lembreteFecho = isDiaLembreteFecho() && temMovimentosEntrega && !mesFechado

    const semDocumento = movMesEntrega.filter(
      (m) => !movimentoTemDocumentoBase(m, modelosMesEntrega),
    ).length
    const semComprovativo = temContaBancaria
      ? movMesEntrega.filter((m) => m.tipo_conta === 'banco' && !m.comprovativo_banco_path).length
      : 0
    const faltaExtrato =
      temContaBancaria && temMovimentosEntrega && !mesFechado && !fechoMesEntrega?.extrato_path

    const alertaEntrega = {
      show:
        !mesFechado &&
        temMovimentosEntrega &&
        (semDocumento > 0 || semComprovativo > 0 || faltaExtrato),
      semDocumento,
      semComprovativo,
      faltaExtrato,
    }

    const chartDesdeRef =
      earliestMonthRefFromMovimentos(movimentosVisiveis, mesAtualRef) ||
      (dataRef ? String(dataRef).slice(0, 7) : mesAtualRef)
    const latestMovRef = movimentosVisiveis
      .map((m) => m.month_ref)
      .filter(Boolean)
      .sort()
      .pop()
    const chartAteRef = maxMonthRef(mesAtualRef, latestMovRef)

    return {
      temContaBancaria,
      saldoCaixa,
      saldoBanco,
      saldoTotal: temContaBancaria ? saldoCaixa + saldoBanco : saldoCaixa,
      movimentosVisiveis,
      mesAtualRef,
      chartDesdeRef,
      chartAteRef,
      mesAnteriorRef: mesEntregaRef,
      receitasMes,
      despesasMes,
      numReceitasMes: movMesAtual.filter((m) => m.natureza === 'recebimento').length,
      numDespesasMes: movMesAtual.filter((m) => m.natureza === 'pagamento').length,
      totalMovimentos: movimentosVisiveis.length,
      ultimosMovimentos,
      fechoPendente,
      lembreteFecho,
      mesEntregaFechado: mesFechado,
      alertaEntrega,
    }
  }, [
    movimentos,
    fechoMesEntrega,
    modelosMesEntrega,
    nucleoProfile?.saldoAtualCaixa,
    nucleoProfile?.saldoAtualBanco,
    nucleoProfile?.dataReferenciaSaldos,
    nucleoProfile?.temContaBancaria,
  ])

  return { ...dados, loading, error, reload }
}
