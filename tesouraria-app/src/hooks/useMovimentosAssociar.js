import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useMovimentosAssociar({ monthRef, todosMeses, tipoConta }) {
  const { user } = useAuth()
  const [movimentos, setMovimentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!user?.id) {
      setMovimentos([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      let query = supabase
        .from('movimentos')
        .select('*')
        .eq('nucleo_id', user.id)
        .order('data', { ascending: false })
        .limit(todosMeses ? 500 : 200)

      if (!todosMeses && monthRef) {
        query = query.eq('month_ref', monthRef)
      }

      if (tipoConta) {
        query = query.eq('tipo_conta', tipoConta)
      }

      const { data, error: queryError } = await query
      if (queryError) throw queryError
      setMovimentos(data || [])
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar movimentos.')
      setMovimentos([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, monthRef, todosMeses, tipoConta])

  useEffect(() => {
    reload()
  }, [reload])

  return { movimentos, loading, error, reload }
}
