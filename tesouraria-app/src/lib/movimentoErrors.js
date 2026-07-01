export function formatSupabaseError(error, fallback = 'Ocorreu um erro.') {
  if (!error) return fallback
  const code = String(error.code || '')
  const message = String(error.message || error.details || error.hint || '')
  const lower = message.toLowerCase()

  if (
    code === 'PGRST204' ||
    code === '42703' ||
    (lower.includes('movimento_id') &&
      (lower.includes('does not exist') || lower.includes('could not find') || lower.includes('schema cache')))
  ) {
    return 'Falta a coluna movimento_id nas tabelas de documentos. No Supabase SQL Editor, corre o bloco final do ficheiro supabase/schema.sql (alter table documentos_extras / documentos_modelos).'
  }

  if (code === 'PGRST205' || (lower.includes('does not exist') && lower.includes('relation'))) {
    return 'Tabela em falta no Supabase. Corre a secção Documentos do supabase/schema.sql no SQL Editor.'
  }

  if (message) return message
  return fallback
}
