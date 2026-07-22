/** Núcleos atribuídos ao membro do concelho fiscal autenticado, com o estado do fecho mais relevante. */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useConselhoNucleos() {
  const { user } = useAuth()
  const [nucleos, setNucleos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!user?.id) {
      setNucleos([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data: atribuicoes, error: atribuicoesError } = await supabase
        .from('concelho_atribuicoes')
        .select('nucleo_id, nucleos(id, nome_nucleo, nome_tesoureiro)')
        .eq('membro_id', user.id)

      if (atribuicoesError) throw atribuicoesError

      const nucleoRows = (atribuicoes || []).map((row) => row.nucleos).filter(Boolean)
      const nucleoIds = nucleoRows.map((row) => row.id)

      const fechoByNucleo = new Map()
      if (nucleoIds.length > 0) {
        const { data: fechos, error: fechosError } = await supabase
          .from('fechos_mensais')
          .select('nucleo_id, month_ref, estado_validacao, submetido_em, fechado_em')
          .in('nucleo_id', nucleoIds)
          .order('month_ref', { ascending: false })

        if (fechosError) throw fechosError

        for (const row of fechos || []) {
          const current = fechoByNucleo.get(row.nucleo_id)
          if (!current) {
            fechoByNucleo.set(row.nucleo_id, row)
            continue
          }
          // Prioriza o mes mais antigo ainda a aguardar revisao; senao fica o mes mais recente.
          if (current.estado_validacao !== 'submetido' && row.estado_validacao === 'submetido') {
            fechoByNucleo.set(row.nucleo_id, row)
          }
        }
      }

      const merged = nucleoRows.map((row) => ({
        id: row.id,
        nomeNucleo: row.nome_nucleo || '',
        nomeTesoureiro: row.nome_tesoureiro || '',
        ultimoFecho: fechoByNucleo.get(row.id) || null,
      }))

      merged.sort((a, b) => {
        const aPendente = a.ultimoFecho?.estado_validacao === 'submetido'
        const bPendente = b.ultimoFecho?.estado_validacao === 'submetido'
        if (aPendente !== bPendente) return aPendente ? -1 : 1
        return (a.nomeNucleo || '').localeCompare(b.nomeNucleo || '')
      })

      setNucleos(merged)
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar núcleos atribuídos.')
      setNucleos([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    reload()
  }, [reload])

  return { nucleos, loading, error, reload }
}
