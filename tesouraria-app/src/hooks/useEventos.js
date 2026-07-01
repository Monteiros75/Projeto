import { useCallback, useEffect, useState } from 'react'
import { totaisEvento } from '../lib/eventoCalculos'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

function agruparTotaisPorEvento(linhas) {
  const mapa = new Map()
  for (const linha of linhas || []) {
    const actuais = mapa.get(linha.evento_id) || []
    actuais.push(linha)
    mapa.set(linha.evento_id, actuais)
  }
  const totais = new Map()
  for (const [eventoId, lista] of mapa) {
    totais.set(eventoId, totaisEvento(lista))
  }
  return totais
}

export function useEventos() {
  const { user } = useAuth()
  const [eventos, setEventos] = useState([])
  const [totaisPorEvento, setTotaisPorEvento] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!user?.id) {
      setEventos([])
      setTotaisPorEvento(new Map())
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const [eventosRes, linhasRes] = await Promise.all([
        supabase
          .from('eventos')
          .select('*')
          .eq('nucleo_id', user.id)
          .order('data', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }),
        supabase.from('evento_linhas').select('*').eq('nucleo_id', user.id),
      ])

      if (eventosRes.error) throw eventosRes.error
      if (linhasRes.error) throw linhasRes.error

      setEventos(eventosRes.data || [])
      setTotaisPorEvento(agruparTotaisPorEvento(linhasRes.data || []))
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar os orçamentos de eventos.')
      setEventos([])
      setTotaisPorEvento(new Map())
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    reload()
  }, [reload])

  const criarEvento = useCallback(
    async ({ nome, data, status = 'planeado' }) => {
      if (!user?.id) return null
      const { data: novo, error: insertError } = await supabase
        .from('eventos')
        .insert({
          nucleo_id: user.id,
          nome: nome.trim(),
          data: data || null,
          status,
        })
        .select()
        .single()
      if (insertError) throw insertError
      await reload()
      return novo
    },
    [user?.id, reload],
  )

  const apagarEvento = useCallback(
    async (id) => {
      const { error: deleteError } = await supabase.from('eventos').delete().eq('id', id)
      if (deleteError) throw deleteError
      await reload()
    },
    [reload],
  )

  return { eventos, totaisPorEvento, loading, error, reload, criarEvento, apagarEvento }
}
