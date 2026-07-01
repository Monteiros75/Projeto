import { useEffect, useState } from 'react'
import { getContaDeltaDesde } from '../lib/folhaMensal'
import { nucleoTemContaBancaria, saldoInicialBancoPerfil } from '../lib/contaBancaria'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useSaldoAbertura(monthRef) {
  const { user, nucleoProfile } = useAuth()
  const [deltaCaixa, setDeltaCaixa] = useState(0)
  const [deltaBanco, setDeltaBanco] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !monthRef) {
      setDeltaCaixa(0)
      setDeltaBanco(0)
      setLoading(false)
      return
    }

    const dataRef = nucleoProfile?.dataReferenciaSaldos || ''
    const temContaBancaria = nucleoTemContaBancaria(nucleoProfile)

    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('movimentos')
        .select('natureza, valor, tipo_conta, data')
        .eq('nucleo_id', user.id)
        .lt('month_ref', monthRef)

      if (cancelled) return
      if (error) {
        console.error(error)
        setDeltaCaixa(0)
        setDeltaBanco(0)
        setLoading(false)
        return
      }

      const rows = data || []
      setDeltaCaixa(getContaDeltaDesde(rows, 'caixa', dataRef))
      setDeltaBanco(
        temContaBancaria ? getContaDeltaDesde(rows, 'banco', dataRef) : 0,
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id, monthRef, nucleoProfile?.dataReferenciaSaldos, nucleoProfile?.temContaBancaria])

  const saldoAnteriorCaixa = Number(nucleoProfile?.saldoAtualCaixa || 0) + deltaCaixa
  const saldoAnteriorBanco = saldoInicialBancoPerfil(nucleoProfile) + deltaBanco

  return { saldoAnteriorCaixa, saldoAnteriorBanco, loading }
}
