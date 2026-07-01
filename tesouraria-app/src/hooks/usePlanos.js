import { useCallback, useEffect, useState } from 'react'
import { anoFromMandato, monthInputToDate } from '../lib/mandatoFormat'
import { SECCOES_PADRAO } from '../lib/seccoes'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function usePlanos() {
  const { user } = useAuth()
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!user?.id) {
      setPlanos([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data, error: queryError } = await supabase
        .from('planos')
        .select('*')
        .eq('nucleo_id', user.id)
        .order('mandato_inicio', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (queryError) throw queryError
      setPlanos(data || [])
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar os planos.')
      setPlanos([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    reload()
  }, [reload])

  const criarPlano = useCallback(
    async ({ tipo, titulo, mandatoInicio, mandatoFim, introducao, paoReferenciaId }) => {
      if (!user?.id) return null

      const mandato_inicio = monthInputToDate(mandatoInicio)
      const mandato_fim = monthInputToDate(mandatoFim)
      const ano = anoFromMandato(mandato_inicio)

      let referencia = paoReferenciaId || null
      let seccoes = [...SECCOES_PADRAO]
      let paoMandato = { mandato_inicio, mandato_fim }

      if (tipo === 'relatorio') {
        if (referencia) {
          const { data: paoRef } = await supabase
            .from('planos')
            .select('seccoes, mandato_inicio, mandato_fim')
            .eq('id', referencia)
            .eq('nucleo_id', user.id)
            .maybeSingle()
          if (paoRef) {
            if (Array.isArray(paoRef.seccoes) && paoRef.seccoes.length) {
              seccoes = paoRef.seccoes
            }
            paoMandato = {
              mandato_inicio: paoRef.mandato_inicio || mandato_inicio,
              mandato_fim: paoRef.mandato_fim || mandato_fim,
            }
          }
        } else if (mandato_inicio && mandato_fim) {
          const { data: paoMatch } = await supabase
            .from('planos')
            .select('id, seccoes, mandato_inicio, mandato_fim')
            .eq('nucleo_id', user.id)
            .eq('tipo', 'pao')
            .eq('mandato_inicio', mandato_inicio)
            .eq('mandato_fim', mandato_fim)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (paoMatch) {
            referencia = paoMatch.id
            if (Array.isArray(paoMatch.seccoes) && paoMatch.seccoes.length) {
              seccoes = paoMatch.seccoes
            }
          }
        }
      }

      const { data, error: insertError } = await supabase
        .from('planos')
        .insert({
          nucleo_id: user.id,
          tipo,
          titulo,
          ano,
          mandato_inicio: tipo === 'relatorio' && referencia ? paoMandato.mandato_inicio : mandato_inicio,
          mandato_fim: tipo === 'relatorio' && referencia ? paoMandato.mandato_fim : mandato_fim,
          seccoes,
          introducao: introducao || null,
          pao_referencia_id: tipo === 'relatorio' ? referencia : null,
        })
        .select()
        .single()
      if (insertError) throw insertError
      await reload()
      return data
    },
    [user?.id, reload],
  )

  const apagarPlano = useCallback(
    async (id) => {
      const { error: deleteError } = await supabase.from('planos').delete().eq('id', id)
      if (deleteError) throw deleteError
      await reload()
    },
    [reload],
  )

  return { planos, loading, error, reload, criarPlano, apagarPlano }
}
