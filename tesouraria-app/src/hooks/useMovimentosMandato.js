import { useCallback, useEffect, useState } from 'react'
import { movimentoNoMandato, resumoMovimentos } from '../lib/racImport'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useMovimentosMandato(mandatoInicio, mandatoFim) {
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
      const { data, error: queryError } = await supabase
        .from('movimentos')
        .select('id, data, month_ref, descricao, natureza, valor, tipo_conta, numero_documento')
        .eq('nucleo_id', user.id)
        .order('data', { ascending: true })

      if (queryError) throw queryError

      const filtrados = (data || []).filter((m) =>
        movimentoNoMandato(m, mandatoInicio, mandatoFim),
      )
      setMovimentos(filtrados)
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar movimentos do mandato.')
      setMovimentos([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, mandatoInicio, mandatoFim])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    movimentos,
    resumo: resumoMovimentos(movimentos),
    loading,
    error,
    reload,
  }
}
