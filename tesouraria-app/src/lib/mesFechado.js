import { supabase } from '../supabase/supabaseClient'

/** Verifica na BD se o mes esta fechado (bloqueia CRUD de movimentos) */
export async function fetchMesFechado(nucleoId, monthRef) {
  if (!nucleoId || !monthRef) return false
  const { data, error } = await supabase
    .from('fechos_mensais')
    .select('fechado_em')
    .eq('nucleo_id', nucleoId)
    .eq('month_ref', monthRef)
    .maybeSingle()
  if (error) {
    console.error(error)
    return false
  }
  return Boolean(data?.fechado_em)
}

export async function ensureMesAberto(nucleoId, monthRef) {
  const fechado = await fetchMesFechado(nucleoId, monthRef)
  if (fechado) {
    return {
      ok: false,
      message: 'Este mês está fechado. Reabre-o em Fecho Mensal para fazer alterações.',
    }
  }
  return { ok: true }
}
