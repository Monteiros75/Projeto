import { STORAGE_BUCKET, supabase } from '../supabase/supabaseClient'

const DEFAULT_TTL_SECONDS = 60 * 60

export function sanitizeFileName(name) {
  return (name || 'ficheiro').replace(/[^\w.-]/g, '_')
}

export async function createSignedUrlForPath(path, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!path) return ''
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, ttlSeconds)
  if (error) {
    console.error(error)
    return ''
  }
  return data?.signedUrl || ''
}
