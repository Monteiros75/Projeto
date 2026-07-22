/**
 * Fecho mensal de um nucleo, em modo leitura, para revisao pelo concelho fiscal.
 * Reaproveita a mesma logica de validacao de useFechoMensal.js, mas para um
 * nucleoId arbitrario (nao o utilizador autenticado) — nao usar useAuth().nucleoProfile
 * aqui, que representa a sessao do membro do concelho, nao o nucleo em revisao.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { movimentoTemDocumentoBase } from '../lib/associarDocumentoMovimento'
import { movimentosContaAtiva, nucleoTemContaBancaria } from '../lib/contaBancaria'
import { mapNucleoFromDb } from '../lib/nucleoMapper'
import { createSignedUrlForPath } from '../lib/storageSignedUrl'
import { supabase } from '../supabase/supabaseClient'
import { useMovimentosMes } from './useMovimentosMes'
import { useSaldoAbertura } from './useSaldoAbertura'

export function useConselhoFecho(nucleoId, monthRef) {
  const { movimentos, fecho, loading: movimentosLoading, error, reload } = useMovimentosMes(
    monthRef,
    { nucleoId },
  )
  const [nucleoProfile, setNucleoProfile] = useState(null)
  const [nucleoLoading, setNucleoLoading] = useState(true)
  const [extratoUrl, setExtratoUrl] = useState('')
  const [modelosPorMovimento, setModelosPorMovimento] = useState(() => new Map())
  const [revisaoSubmitting, setRevisaoSubmitting] = useState(false)
  const [revisaoError, setRevisaoError] = useState('')

  const temContaBancaria = nucleoTemContaBancaria(nucleoProfile)
  const { saldoAnteriorCaixa, saldoAnteriorBanco } = useSaldoAbertura(monthRef, {
    nucleoId,
    nucleoProfile,
  })

  useEffect(() => {
    if (!nucleoId) {
      setNucleoProfile(null)
      setNucleoLoading(false)
      return
    }

    let cancelled = false
    async function loadNucleo() {
      setNucleoLoading(true)
      const { data, error: nucleoError } = await supabase
        .from('nucleos')
        .select('*')
        .eq('id', nucleoId)
        .maybeSingle()
      if (cancelled) return
      if (nucleoError) {
        console.error(nucleoError)
        setNucleoProfile(null)
      } else {
        setNucleoProfile(mapNucleoFromDb(data))
      }
      setNucleoLoading(false)
    }
    loadNucleo()
    return () => {
      cancelled = true
    }
  }, [nucleoId])

  useEffect(() => {
    if (!nucleoId || !monthRef) {
      setModelosPorMovimento(new Map())
      return
    }

    let cancelled = false
    async function loadModelosLigados() {
      const { data, error: modelosError } = await supabase
        .from('documentos_modelos')
        .select('id, titulo, movimento_id')
        .eq('nucleo_id', nucleoId)
        .eq('month_ref', monthRef)
        .not('movimento_id', 'is', null)

      if (cancelled) return
      if (modelosError) {
        console.error(modelosError)
        setModelosPorMovimento(new Map())
        return
      }
      const map = new Map()
      for (const row of data || []) {
        if (row.movimento_id) map.set(row.movimento_id, { id: row.id, titulo: row.titulo })
      }
      setModelosPorMovimento(map)
    }
    loadModelosLigados()
    return () => {
      cancelled = true
    }
  }, [nucleoId, monthRef])

  const movimentoIdsComModelo = useMemo(
    () => new Set(modelosPorMovimento.keys()),
    [modelosPorMovimento],
  )

  useEffect(() => {
    async function loadExtratoUrl() {
      if (!fecho?.extrato_path) {
        setExtratoUrl('')
        return
      }
      setExtratoUrl(await createSignedUrlForPath(fecho.extrato_path))
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
  }, [movimentos, fecho?.extrato_path, movimentoIdsComModelo, temContaBancaria])

  const revisar = useCallback(
    async (estado, comentario) => {
      if (!nucleoId || !monthRef) return false
      setRevisaoSubmitting(true)
      setRevisaoError('')
      try {
        const { error: rpcError } = await supabase.rpc('concelho_rever_fecho', {
          p_nucleo_id: nucleoId,
          p_month_ref: monthRef,
          p_estado: estado,
          p_comentario: comentario || null,
        })
        if (rpcError) throw rpcError
        await reload()
        return true
      } catch (err) {
        console.error(err)
        setRevisaoError(
          estado === 'aprovado'
            ? 'Não foi possível aprovar este fecho.'
            : 'Não foi possível pedir correções para este fecho.',
        )
        return false
      } finally {
        setRevisaoSubmitting(false)
      }
    },
    [nucleoId, monthRef, reload],
  )

  const aprovar = useCallback(() => revisar('aprovado'), [revisar])
  const reprovar = useCallback((comentario) => revisar('reprovado', comentario), [revisar])

  return {
    nucleoProfile,
    movimentos,
    fecho,
    loading: movimentosLoading || nucleoLoading,
    error,
    validation,
    extratoUrl,
    movimentoIdsComModelo,
    modelosPorMovimento,
    saldoAnteriorCaixa,
    saldoAnteriorBanco,
    estadoValidacao: fecho?.estado_validacao || 'rascunho',
    comentarioRevisao: fecho?.comentario_revisao || '',
    submetidoEm: fecho?.submetido_em || null,
    revistoEm: fecho?.revisto_em || null,
    revisaoSubmitting,
    revisaoError,
    aprovar,
    reprovar,
    reload,
  }
}
