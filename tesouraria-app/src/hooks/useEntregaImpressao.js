import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildEntregaItems,
  countPrinted,
  loadPrintedFromStorage,
  savePrintedToStorage,
} from '../lib/entregaContabilidade'
import { nucleoTemContaBancaria } from '../lib/contaBancaria'
import { createSignedUrlForPath } from '../lib/storageSignedUrl'
import { supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useEntregaImpressao(monthRef, enabled = true) {
  const { user, nucleoProfile } = useAuth()
  const temContaBancaria = nucleoTemContaBancaria(nucleoProfile)
  const [loading, setLoading] = useState(false)
  const [extras, setExtras] = useState([])
  const [modelos, setModelos] = useState([])
  const [movimentoIdsComModelo, setMovimentoIdsComModelo] = useState(() => new Set())
  const [signedUrls, setSignedUrls] = useState({})
  const [printed, setPrinted] = useState({})
  const [fecho, setFecho] = useState(null)
  const [movimentos, setMovimentos] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!enabled || !user?.id || !monthRef) {
      setExtras([])
      setModelos([])
      setMovimentos([])
      setFecho(null)
      setSignedUrls({})
      return
    }

    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [movRes, fechoRes, extrasRes, modelosRes] = await Promise.all([
          supabase
            .from('movimentos')
            .select('*')
            .eq('nucleo_id', user.id)
            .eq('month_ref', monthRef)
            .order('data', { ascending: true }),
          supabase
            .from('fechos_mensais')
            .select('*')
            .eq('nucleo_id', user.id)
            .eq('month_ref', monthRef)
            .maybeSingle(),
          supabase
            .from('documentos_extras')
            .select('*')
            .eq('nucleo_id', user.id)
            .eq('month_ref', monthRef),
          supabase
            .from('documentos_modelos')
            .select('*')
            .eq('nucleo_id', user.id)
            .eq('month_ref', monthRef),
        ])

        if (cancelled) return
        if (movRes.error) throw movRes.error
        if (fechoRes.error) throw fechoRes.error

        const movs = movRes.data || []
        const fechoRow = fechoRes.data || null
        const extrasRows = extrasRes.error ? [] : extrasRes.data || []
        const modelosRows = modelosRes.error ? [] : modelosRes.data || []

        const idsComModelo = new Set(
          modelosRows.filter((r) => r.movimento_id).map((r) => r.movimento_id),
        )

        const urls = {}
        if (fechoRow?.extrato_path) {
          urls[`fecho-${monthRef}-extrato`] = await createSignedUrlForPath(fechoRow.extrato_path)
        }
        for (const m of movs) {
          if (m.fatura_ou_oficio_path) {
            urls[`mov-${m.id}-fatura`] = await createSignedUrlForPath(m.fatura_ou_oficio_path)
          }
          if (m.comprovativo_banco_path) {
            urls[`mov-${m.id}-comp`] = await createSignedUrlForPath(m.comprovativo_banco_path)
          }
        }
        for (const row of extrasRows) {
          if (row.storage_path) {
            urls[`extra-${row.id}`] = await createSignedUrlForPath(row.storage_path)
          }
        }

        const fromDb =
          fechoRow?.itens_impressos && typeof fechoRow.itens_impressos === 'object'
            ? fechoRow.itens_impressos
            : null
        const fromLocal = loadPrintedFromStorage(user.id, monthRef)
        const merged = { ...fromLocal, ...fromDb }

        setMovimentos(movs)
        setFecho(fechoRow)
        setExtras(extrasRows)
        setModelos(modelosRows)
        setMovimentoIdsComModelo(idsComModelo)
        setSignedUrls(urls)
        setPrinted(merged)
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [enabled, user?.id, monthRef])

  const items = useMemo(
    () =>
      buildEntregaItems({
        monthRef,
        movimentos,
        fecho,
        extras,
        modelos,
        movimentoIdsComModelo,
        signedUrls,
        temContaBancaria,
      }),
    [monthRef, movimentos, fecho, extras, modelos, movimentoIdsComModelo, signedUrls, temContaBancaria],
  )

  const progress = useMemo(() => countPrinted(items, printed), [items, printed])

  const persistPrinted = useCallback(
    async (next) => {
      if (!user?.id) return
      setPrinted(next)
      savePrintedToStorage(user.id, monthRef, next)
      setSaving(true)
      try {
        await supabase.from('fechos_mensais').upsert(
          {
            nucleo_id: user.id,
            month_ref: monthRef,
            itens_impressos: next,
          },
          { onConflict: 'nucleo_id,month_ref' },
        )
      } catch (err) {
        console.warn('Estado de impressao guardado localmente (coluna itens_impressos opcional).', err)
      } finally {
        setSaving(false)
      }
    },
    [user?.id, monthRef],
  )

  const togglePrinted = useCallback(
    (itemId) => {
      const next = { ...printed, [itemId]: !printed[itemId] }
      persistPrinted(next)
    },
    [printed, persistPrinted],
  )

  const markAllPrinted = useCallback(() => {
    const next = Object.fromEntries(items.map((it) => [it.id, true]))
    persistPrinted(next)
  }, [items, persistPrinted])

  const clearPrinted = useCallback(() => {
    persistPrinted({})
  }, [persistPrinted])

  return {
    loading,
    saving,
    items,
    printed,
    progress,
    togglePrinted,
    markAllPrinted,
    clearPrinted,
  }
}
