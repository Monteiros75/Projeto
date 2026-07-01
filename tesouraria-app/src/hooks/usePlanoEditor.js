import { useCallback, useEffect, useState } from 'react'
import { anoFromMandato, monthInputToDate } from '../lib/mandatoFormat'
import { getSeccoesDoPlano } from '../lib/seccoes'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function usePlanoEditor(planoId) {
  const { user } = useAuth()
  const [plano, setPlano] = useState(null)
  const [linhas, setLinhas] = useState([])
  const [paoReferencia, setPaoReferencia] = useState(null)
  const [linhasPaoReferencia, setLinhasPaoReferencia] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!user?.id || !planoId) {
      setPlano(null)
      setLinhas([])
      setPaoReferencia(null)
      setLinhasPaoReferencia([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: planoRow, error: planoError } = await supabase
        .from('planos')
        .select('*')
        .eq('id', planoId)
        .eq('nucleo_id', user.id)
        .maybeSingle()
      if (planoError) throw planoError

      const { data: linhasRows, error: linhasError } = await supabase
        .from('plano_linhas')
        .select('*')
        .eq('plano_id', planoId)
        .eq('nucleo_id', user.id)
        .order('ordem', { ascending: true })
      if (linhasError) throw linhasError

      setPlano(planoRow || null)
      setLinhas(linhasRows || [])

      if (planoRow?.pao_referencia_id) {
        const [paoRes, linhasPaoRes] = await Promise.all([
          supabase
            .from('planos')
            .select('*')
            .eq('id', planoRow.pao_referencia_id)
            .eq('nucleo_id', user.id)
            .maybeSingle(),
          supabase
            .from('plano_linhas')
            .select('*')
            .eq('plano_id', planoRow.pao_referencia_id)
            .eq('nucleo_id', user.id)
            .order('ordem', { ascending: true }),
        ])
        if (paoRes.error) throw paoRes.error
        if (linhasPaoRes.error) throw linhasPaoRes.error
        setPaoReferencia(paoRes.data || null)
        setLinhasPaoReferencia(linhasPaoRes.data || [])
      } else {
        setPaoReferencia(null)
        setLinhasPaoReferencia([])
      }
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar o plano.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, planoId])

  useEffect(() => {
    reload()
  }, [reload])

  const guardarCabecalho = useCallback(
    async (campos) => {
      if (!planoId) return
      const { error: updateError } = await supabase
        .from('planos')
        .update(campos)
        .eq('id', planoId)
      if (updateError) throw updateError
      setPlano((prev) => (prev ? { ...prev, ...campos } : prev))
    },
    [planoId],
  )

  const guardarPrevisaoSecao = useCallback(
    async (seccao, texto) => {
      if (!plano) return
      const previsao = { ...(plano.previsao_seccoes || {}), [seccao]: texto }
      await guardarCabecalho({ previsao_seccoes: previsao })
    },
    [plano, guardarCabecalho],
  )

  const guardarPaoReferencia = useCallback(
    async (paoId) => {
      await guardarCabecalho({ pao_referencia_id: paoId || null })
      await reload()
    },
    [guardarCabecalho, reload],
  )

  const guardarMandato = useCallback(
    async (mandatoInicio, mandatoFim) => {
      const mandato_inicio = monthInputToDate(mandatoInicio)
      const mandato_fim = monthInputToDate(mandatoFim)
      await guardarCabecalho({
        mandato_inicio,
        mandato_fim,
        ano: anoFromMandato(mandato_inicio),
      })
    },
    [guardarCabecalho],
  )

  const guardarSecoes = useCallback(
    async (seccoes) => {
      await guardarCabecalho({ seccoes })
    },
    [guardarCabecalho],
  )

  const adicionarSeccao = useCallback(
    async (nome) => {
      const trimmed = nome.trim()
      if (!trimmed || !plano) return
      const actuais = getSeccoesDoPlano(plano)
      if (actuais.includes(trimmed)) return
      await guardarSecoes([...actuais, trimmed])
    },
    [plano, guardarSecoes],
  )

  const renomearSeccao = useCallback(
    async (nomeAntigo, nomeNovo) => {
      const trimmed = nomeNovo.trim()
      if (!trimmed || !plano || nomeAntigo === trimmed) return
      const actuais = getSeccoesDoPlano(plano)
      if (actuais.includes(trimmed)) return

      const { error: linhasError } = await supabase
        .from('plano_linhas')
        .update({ seccao: trimmed })
        .eq('plano_id', planoId)
        .eq('seccao', nomeAntigo)
      if (linhasError) throw linhasError

      const previsao = { ...(plano.previsao_seccoes || {}) }
      if (previsao[nomeAntigo] !== undefined) {
        previsao[trimmed] = previsao[nomeAntigo]
        delete previsao[nomeAntigo]
      }

      const novasSecoes = actuais.map((s) => (s === nomeAntigo ? trimmed : s))
      await guardarCabecalho({ seccoes: novasSecoes, previsao_seccoes: previsao })
      await reload()
    },
    [plano, planoId, guardarCabecalho, reload],
  )

  const removerSeccao = useCallback(
    async (nome) => {
      if (!plano) return
      const actuais = getSeccoesDoPlano(plano)
      if (actuais.length <= 1) return

      const { error: linhasError } = await supabase
        .from('plano_linhas')
        .delete()
        .eq('plano_id', planoId)
        .eq('seccao', nome)
      if (linhasError) throw linhasError

      const previsao = { ...(plano.previsao_seccoes || {}) }
      delete previsao[nome]

      const novasSecoes = actuais.filter((s) => s !== nome)
      await guardarCabecalho({ seccoes: novasSecoes, previsao_seccoes: previsao })
      await reload()
    },
    [plano, planoId, guardarCabecalho, reload],
  )

  const adicionarLinha = useCallback(
    async (seccao) => {
      if (!user?.id || !planoId) return
      const maxOrdem = linhas
        .filter((l) => l.seccao === seccao)
        .reduce((max, l) => Math.max(max, l.ordem || 0), 0)
      const { data, error: insertError } = await supabase
        .from('plano_linhas')
        .insert({
          plano_id: planoId,
          nucleo_id: user.id,
          seccao,
          designacao: '',
          ordem: maxOrdem + 1,
        })
        .select()
        .single()
      if (insertError) throw insertError
      setLinhas((prev) => [...prev, data])
    },
    [user?.id, planoId, linhas],
  )

  const atualizarLinha = useCallback(async (id, campos) => {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, ...campos } : l)))
    const { error: updateError } = await supabase
      .from('plano_linhas')
      .update(campos)
      .eq('id', id)
    if (updateError) console.error(updateError)
  }, [])

  const removerLinha = useCallback(async (id) => {
    setLinhas((prev) => prev.filter((l) => l.id !== id))
    const { error: deleteError } = await supabase.from('plano_linhas').delete().eq('id', id)
    if (deleteError) console.error(deleteError)
  }, [])

  const importarLinhas = useCallback(
    async (drafts) => {
      if (!user?.id || !planoId || !drafts?.length) return 0

      const ordemPorSeccao = {}
      for (const linha of linhas) {
        ordemPorSeccao[linha.seccao] = Math.max(ordemPorSeccao[linha.seccao] || 0, linha.ordem || 0)
      }

      const rows = drafts.map((draft) => {
        const seccao = draft.seccao
        ordemPorSeccao[seccao] = (ordemPorSeccao[seccao] || 0) + 1
        return {
          plano_id: planoId,
          nucleo_id: user.id,
          seccao,
          designacao: draft.designacao || '',
          data_realizacao: draft.data_realizacao || '',
          despesa_designacao: draft.despesa_designacao || '',
          despesa_valor: Number(draft.despesa_valor || 0),
          receita_designacao: draft.receita_designacao || '',
          receita_valor: Number(draft.receita_valor || 0),
          ordem: ordemPorSeccao[seccao],
        }
      })

      const { data, error: insertError } = await supabase
        .from('plano_linhas')
        .insert(rows)
        .select()
      if (insertError) throw insertError

      setLinhas((prev) => [...prev, ...(data || [])])
      return data?.length || 0
    },
    [user?.id, planoId, linhas],
  )

  return {
    plano,
    linhas,
    paoReferencia,
    linhasPaoReferencia,
    loading,
    error,
    reload,
    guardarCabecalho,
    guardarPrevisaoSecao,
    guardarPaoReferencia,
    guardarMandato,
    guardarSecoes,
    adicionarSeccao,
    renomearSeccao,
    removerSeccao,
    adicionarLinha,
    atualizarLinha,
    removerLinha,
    importarLinhas,
  }
}
