import { useCallback, useEffect, useMemo, useState } from 'react'
import { movimentoTemDocumentoBase } from '../lib/associarDocumentoMovimento'
import {
  movimentosContaAtiva,
  nucleoTemContaBancaria,
} from '../lib/contaBancaria'
import { getContaDeltaDesde } from '../lib/folhaMensal'
import { sanitizeFileName } from '../lib/movimentoFiles'
import { STORAGE_BUCKET, supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'
import { useMovimentosMes } from './useMovimentosMes'
import { useSaldoAbertura } from './useSaldoAbertura'

const SIGNED_URL_TTL_SECONDS = 60 * 60

export function useFechoMensal(monthRef) {
  const { user, nucleoProfile } = useAuth()
  const { movimentos, fecho, loading, error, reload } = useMovimentosMes(monthRef)
  const { saldoAnteriorCaixa, saldoAnteriorBanco } = useSaldoAbertura(monthRef)
  const [extratoUrl, setExtratoUrl] = useState('')
  const [extratoSubmitting, setExtratoSubmitting] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [fechoError, setFechoError] = useState('')
  const [movimentoIdsComModelo, setMovimentoIdsComModelo] = useState(() => new Set())

  const dataRef = nucleoProfile?.dataReferenciaSaldos || ''
  const temContaBancaria = nucleoTemContaBancaria(nucleoProfile)

  const saldoFinalCaixa = useMemo(
    () => saldoAnteriorCaixa + getContaDeltaDesde(movimentos, 'caixa', dataRef),
    [saldoAnteriorCaixa, movimentos, dataRef],
  )

  const saldoFinalBanco = useMemo(() => {
    if (!temContaBancaria) return 0
    return saldoAnteriorBanco + getContaDeltaDesde(movimentos, 'banco', dataRef)
  }, [temContaBancaria, saldoAnteriorBanco, movimentos, dataRef])

  useEffect(() => {
    if (!user?.id) {
      setMovimentoIdsComModelo(new Set())
      return
    }

    let cancelled = false
    async function loadModelosLigados() {
      const { data, error: modelosError } = await supabase
        .from('documentos_modelos')
        .select('movimento_id')
        .eq('nucleo_id', user.id)
        .eq('month_ref', monthRef)
        .not('movimento_id', 'is', null)

      if (cancelled) return
      if (modelosError) {
        console.error(modelosError)
        setMovimentoIdsComModelo(new Set())
        return
      }
      setMovimentoIdsComModelo(
        new Set((data || []).map((row) => row.movimento_id).filter(Boolean)),
      )
    }
    loadModelosLigados()
    return () => {
      cancelled = true
    }
  }, [user?.id, monthRef])

  useEffect(() => {
    async function loadExtratoUrl() {
      if (!fecho?.extrato_path) {
        setExtratoUrl('')
        return
      }
      const { data, error: urlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(fecho.extrato_path, SIGNED_URL_TTL_SECONDS)
      if (urlError) {
        console.error(urlError)
        setExtratoUrl('')
        return
      }
      setExtratoUrl(data?.signedUrl || '')
    }
    loadExtratoUrl()
  }, [fecho?.extrato_path])

  const validation = useMemo(() => {
    const relevantes = movimentosContaAtiva(movimentos, nucleoProfile)
    const movimentosCount = relevantes.length
    const hasMovimentos = movimentosCount > 0
    const movimentosSemDoc = relevantes.filter(
      (m) => !movimentoTemDocumentoBase(m, movimentoIdsComModelo),
    )
    const allHaveBaseDoc = movimentosSemDoc.length === 0
    const bancoMovimentos = temContaBancaria
      ? movimentos.filter((m) => m.tipo_conta === 'banco')
      : []
    const bancoSemComprovativo = bancoMovimentos.filter((m) => !m.comprovativo_banco_path)
    const allBancoHaveComprovativo = bancoSemComprovativo.length === 0
    const hasExtrato = temContaBancaria ? Boolean(fecho?.extrato_path) : true

    const ready = temContaBancaria
      ? hasMovimentos && allHaveBaseDoc && allBancoHaveComprovativo && hasExtrato
      : hasMovimentos && allHaveBaseDoc

    return {
      temContaBancaria,
      hasMovimentos,
      movimentosCount,
      allHaveBaseDoc,
      movimentosSemDocCount: movimentosSemDoc.length,
      allBancoHaveComprovativo,
      bancoSemComprovativoCount: bancoSemComprovativo.length,
      bancoMovimentosCount: bancoMovimentos.length,
      hasExtrato,
      ready,
    }
  }, [movimentos, fecho?.extrato_path, movimentoIdsComModelo, nucleoProfile?.temContaBancaria, temContaBancaria])

  const saveMonthlyMeta = useCallback(
    async (extra = {}) => {
      if (!user?.id) return
      const payload = {
        nucleo_id: user.id,
        month_ref: monthRef,
        saldo_anterior_caixa: saldoAnteriorCaixa,
        saldo_anterior_banco: temContaBancaria ? saldoAnteriorBanco : 0,
        ...extra,
      }
      const { error: upsertError } = await supabase
        .from('fechos_mensais')
        .upsert(payload, { onConflict: 'nucleo_id,month_ref' })
      if (upsertError) throw upsertError
    },
    [user?.id, monthRef, saldoAnteriorCaixa, saldoAnteriorBanco, temContaBancaria],
  )

  const uploadExtrato = useCallback(
    async (file) => {
      if (!user?.id || !file) return false
      if (fecho?.fechado_em) {
        setFechoError('Este mês está fechado. Reabre-o para substituir o extrato.')
        return false
      }
      setExtratoSubmitting(true)
      setFechoError('')
      try {
        const path = `${user.id}/${monthRef}/extrato/extrato-${sanitizeFileName(file.name)}`
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, { upsert: true })
        if (uploadError) throw uploadError
        await saveMonthlyMeta({ extrato_path: path })
        await reload()
        return true
      } catch (uploadError) {
        setFechoError('Falha no upload do extrato mensal.')
        console.error(uploadError)
        return false
      } finally {
        setExtratoSubmitting(false)
      }
    },
    [user?.id, monthRef, saveMonthlyMeta, reload, fecho?.fechado_em],
  )

  const finalizeFecho = useCallback(async () => {
    if (!validation.ready || !user?.id) return false
    setFechoError('')
    setFinalizando(true)
    try {
      await saveMonthlyMeta({})
      return true
    } catch (finalizeError) {
      setFechoError('Não foi possível concluir o fecho mensal.')
      console.error(finalizeError)
      return false
    } finally {
      setFinalizando(false)
    }
  }, [validation.ready, user?.id, saveMonthlyMeta])

  const isFechado = Boolean(fecho?.fechado_em)

  const fecharMes = useCallback(async () => {
    if (!validation.ready || !user?.id || isFechado) return false
    setFechoError('')
    setFinalizando(true)
    try {
      await saveMonthlyMeta({
        fechado_em: new Date().toISOString(),
        estado_validacao: 'submetido',
        submetido_em: new Date().toISOString(),
      })
      await reload()
      return true
    } catch (closeError) {
      setFechoError('Não foi possível fechar o mês.')
      console.error(closeError)
      return false
    } finally {
      setFinalizando(false)
    }
  }, [validation.ready, user?.id, isFechado, saveMonthlyMeta, reload])

  const reabrirMes = useCallback(async () => {
    if (!user?.id || !isFechado) return false
    setFechoError('')
    setFinalizando(true)
    try {
      await saveMonthlyMeta({ fechado_em: null, estado_validacao: 'rascunho' })
      await reload()
      return true
    } catch (reopenError) {
      setFechoError('Não foi possível reabrir o mês.')
      console.error(reopenError)
      return false
    } finally {
      setFinalizando(false)
    }
  }, [user?.id, isFechado, saveMonthlyMeta, reload])

  return {
    movimentos,
    fecho,
    loading,
    error: error || fechoError,
    validation,
    extratoUrl,
    extratoSubmitting,
    finalizando,
    isFechado,
    fechadoEm: fecho?.fechado_em || null,
    estadoValidacao: fecho?.estado_validacao || 'rascunho',
    comentarioRevisao: fecho?.comentario_revisao || '',
    submetidoEm: fecho?.submetido_em || null,
    revistoEm: fecho?.revisto_em || null,
    uploadExtrato,
    finalizeFecho,
    fecharMes,
    reabrirMes,
    saldoAnteriorCaixa,
    saldoAnteriorBanco,
    saldoFinalCaixa,
    saldoFinalBanco,
  }
}
