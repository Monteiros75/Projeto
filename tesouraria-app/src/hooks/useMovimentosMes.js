import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useMovimentosMes(monthRef, { nucleoId } = {}) {
  const { user } = useAuth()
  const targetNucleoId = nucleoId || user?.id
  const [movimentos, setMovimentos] = useState([])
  const [fecho, setFecho] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!targetNucleoId) {
      setMovimentos([])
      setFecho(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data: movimentosRows, error: movimentosError } = await supabase
        .from('movimentos')
        .select('*')
        .eq('nucleo_id', targetNucleoId)
        .eq('month_ref', monthRef)
        .order('data', { ascending: true })

      if (movimentosError) throw movimentosError

      const { data: fechoRow, error: fechoError } = await supabase
        .from('fechos_mensais')
        .select('*')
        .eq('nucleo_id', targetNucleoId)
        .eq('month_ref', monthRef)
        .maybeSingle()

      if (fechoError) throw fechoError

      setMovimentos(movimentosRows || [])
      setFecho(fechoRow || null)
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar movimentos do mês.')
      setMovimentos([])
      setFecho(null)
    } finally {
      setLoading(false)
    }
  }, [targetNucleoId, monthRef])

  useEffect(() => {
    reload()
  }, [reload])

  return { movimentos, fecho, loading, error, reload }
}
