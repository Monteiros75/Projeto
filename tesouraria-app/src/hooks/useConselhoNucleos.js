/**
 * Núcleos atribuídos ao membro do concelho fiscal autenticado (com o estado do
 * fecho mais relevante) e núcleos disponíveis para se associar. Cada núcleo só
 * pode ter um membro responsável de cada vez (imposto por constraint na BD).
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useConselhoNucleos() {
  const { user } = useAuth()
  const [nucleos, setNucleos] = useState([])
  const [disponiveis, setDisponiveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)

  const reload = useCallback(async () => {
    if (!user?.id) {
      setNucleos([])
      setDisponiveis([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const [atribuicoesRes, disponiveisRes] = await Promise.all([
        supabase
          .from('concelho_atribuicoes')
          .select('nucleo_id, nucleos(id, nome_nucleo, nome_tesoureiro)')
          .eq('membro_id', user.id),
        supabase.rpc('concelho_listar_nucleos_disponiveis'),
      ])

      if (atribuicoesRes.error) throw atribuicoesRes.error
      if (disponiveisRes.error) throw disponiveisRes.error

      const nucleoRows = (atribuicoesRes.data || []).map((row) => row.nucleos).filter(Boolean)
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
      setDisponiveis(
        (disponiveisRes.data || []).map((row) => ({
          id: row.id,
          nomeNucleo: row.nome_nucleo || '',
          nomeTesoureiro: row.nome_tesoureiro || '',
        })),
      )
    } catch (e) {
      console.error(e)
      setError('Erro ao carregar núcleos.')
      setNucleos([])
      setDisponiveis([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    reload()
  }, [reload])

  const associar = useCallback(
    async (nucleoId) => {
      if (!user?.id || !nucleoId) return false
      setActionSubmitting(true)
      setActionError('')
      try {
        const { error: insertError } = await supabase
          .from('concelho_atribuicoes')
          .insert({ membro_id: user.id, nucleo_id: nucleoId })
        if (insertError) throw insertError
        await reload()
        return true
      } catch (e) {
        console.error(e)
        setActionError(
          e?.code === '23505'
            ? 'Este núcleo acabou de ser associado a outro membro. Atualiza a lista.'
            : 'Não foi possível associar este núcleo.',
        )
        await reload()
        return false
      } finally {
        setActionSubmitting(false)
      }
    },
    [user?.id, reload],
  )

  const desassociar = useCallback(
    async (nucleoId) => {
      if (!user?.id || !nucleoId) return false
      setActionSubmitting(true)
      setActionError('')
      try {
        const { error: deleteError } = await supabase
          .from('concelho_atribuicoes')
          .delete()
          .eq('membro_id', user.id)
          .eq('nucleo_id', nucleoId)
        if (deleteError) throw deleteError
        await reload()
        return true
      } catch (e) {
        console.error(e)
        setActionError('Não foi possível desassociar este núcleo.')
        return false
      } finally {
        setActionSubmitting(false)
      }
    },
    [user?.id, reload],
  )

  return {
    nucleos,
    disponiveis,
    loading,
    error,
    actionError,
    actionSubmitting,
    associar,
    desassociar,
    reload,
  }
}
