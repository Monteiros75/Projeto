import { useEffect, useState } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useResumoMovimentos() {
  const { user } = useAuth()
  const [resumo, setResumo] = useState({ receitas: 0, despesas: 0, balanco: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function carregar() {
      if (!user?.id) {
        setResumo({ receitas: 0, despesas: 0, balanco: 0, total: 0 })
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabase
        .from('movimentos')
        .select('natureza, valor')
        .eq('nucleo_id', user.id)

      if (cancelled) return
      if (error) {
        console.error(error)
        setResumo({ receitas: 0, despesas: 0, balanco: 0, total: 0 })
        setLoading(false)
        return
      }

      const receitas = (data || [])
        .filter((m) => m.natureza === 'recebimento')
        .reduce((acc, m) => acc + Number(m.valor || 0), 0)
      const despesas = (data || [])
        .filter((m) => m.natureza === 'pagamento')
        .reduce((acc, m) => acc + Number(m.valor || 0), 0)

      setResumo({
        receitas,
        despesas,
        balanco: receitas - despesas,
        total: (data || []).length,
      })
      setLoading(false)
    }
    carregar()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return { resumo, loading }
}
