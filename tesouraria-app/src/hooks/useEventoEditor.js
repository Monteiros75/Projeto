import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useEventoEditor(eventoId) {
  const { user } = useAuth()
  const [evento, setEvento] = useState(null)
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!user?.id || !eventoId) {
      setEvento(null)
      setLinhas([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data: eventoRow, error: eventoError } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventoId)
        .eq('nucleo_id', user.id)
        .maybeSingle()
      if (eventoError) throw eventoError

      const { data: linhasRows, error: linhasError } = await supabase
        .from('evento_linhas')
        .select('*')
        .eq('evento_id', eventoId)
        .eq('nucleo_id', user.id)
        .order('tipo', { ascending: true })
        .order('ordem', { ascending: true })
      if (linhasError) throw linhasError

      setEvento(eventoRow || null)
      setLinhas(linhasRows || [])
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar o evento.')
    } finally {
      setLoading(false)
    }
  }, [user?.id, eventoId])

  useEffect(() => {
    reload()
  }, [reload])

  const guardarEvento = useCallback(
    async (campos) => {
      if (!eventoId) return
      const { error: updateError } = await supabase.from('eventos').update(campos).eq('id', eventoId)
      if (updateError) throw updateError
      setEvento((prev) => (prev ? { ...prev, ...campos } : prev))
    },
    [eventoId],
  )

  const adicionarLinha = useCallback(
    async (tipo) => {
      if (!user?.id || !eventoId || !tipo) return
      setError('')
      const linhasTipo = linhas.filter((linha) => linha.tipo === tipo)
      const maxOrdem = linhasTipo.reduce((max, linha) => Math.max(max, linha.ordem || 0), 0)
      try {
        const { data, error: insertError } = await supabase
          .from('evento_linhas')
          .insert({
            evento_id: eventoId,
            nucleo_id: user.id,
            tipo,
            ordem: maxOrdem + 1,
          })
          .select()
          .single()
        if (insertError) throw insertError
        setLinhas((prev) => [...prev, data])
        return data
      } catch (e) {
        console.error(e)
        setError(
          'Não foi possível adicionar a linha. Confirma as policies RLS da tabela evento_linhas no Supabase.',
        )
        throw e
      }
    },
    [user?.id, eventoId, linhas],
  )

  const atualizarLinha = useCallback(async (id, campos) => {
    setLinhas((prev) => prev.map((linha) => (linha.id === id ? { ...linha, ...campos } : linha)))
    const { error: updateError } = await supabase.from('evento_linhas').update(campos).eq('id', id)
    if (updateError) console.error(updateError)
  }, [])

  const removerLinha = useCallback(async (id) => {
    setLinhas((prev) => prev.filter((linha) => linha.id !== id))
    const { error: deleteError } = await supabase.from('evento_linhas').delete().eq('id', id)
    if (deleteError) console.error(deleteError)
  }, [])

  return {
    evento,
    linhas,
    loading,
    error,
    reload,
    guardarEvento,
    adicionarLinha,
    atualizarLinha,
    removerLinha,
  }
}
