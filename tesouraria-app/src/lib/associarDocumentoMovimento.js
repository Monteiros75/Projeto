import { sanitizeFileName } from './movimentoFiles'
import { STORAGE_BUCKET, supabase } from '../supabase/supabaseClient'

export function tipoDocumentoToBaseTipo(tipoDocumento) {
  if (tipoDocumento === 'oficio') return 'oficio'
  if (tipoDocumento === 'errata') return 'errata'
  return 'fatura'
}

export function isComprovativoTipo(tipoDocumento) {
  return tipoDocumento === 'comprovativo_pagamento'
}

export function canAssociarATipoMovimento(tipoDocumento) {
  return tipoDocumento !== 'extrato_bancario'
}

/** Oficio/errata criados na app: associacao so por ligacao, sem ficheiro obrigatorio */
export function associacaoModeloSemFicheiro({ documentoModeloId, storagePath, anexoFile }) {
  return Boolean(documentoModeloId) && !storagePath && !anexoFile
}

export function movimentoTemDocumentoBase(movimento, movimentoIdsComModelo = new Set()) {
  return Boolean(movimento?.fatura_ou_oficio_path) || movimentoIdsComModelo.has(movimento?.id)
}

export function isDocumentoExtraStoragePath(path) {
  return String(path || '').includes('/documentos-extras/')
}

/** Remove ligação documento ↔ movimento (path na folha + movimento_id nas tabelas de documentos). */
export async function desligarDocumentoDoMovimento({
  movimentoId,
  nucleoId,
  path,
  tipoDocumento,
}) {
  if (!movimentoId) return

  const isComprovativo = isComprovativoTipo(tipoDocumento)
  const column = isComprovativo ? 'comprovativo_banco_path' : 'fatura_ou_oficio_path'

  const { data: movimento, error: fetchError } = await supabase
    .from('movimentos')
    .select(`id, ${column}`)
    .eq('id', movimentoId)
    .maybeSingle()
  if (fetchError) throw fetchError

  if (movimento && (!path || movimento[column] === path)) {
    let query = supabase.from('movimentos').update({ [column]: null }).eq('id', movimentoId)
    if (nucleoId) query = query.eq('nucleo_id', nucleoId)
    const { error: updError } = await query
    if (updError) throw updError
  }

  let extraQuery = supabase
    .from('documentos_extras')
    .update({ movimento_id: null })
    .eq('movimento_id', movimentoId)
  if (nucleoId) extraQuery = extraQuery.eq('nucleo_id', nucleoId)
  if (path) extraQuery = extraQuery.eq('storage_path', path)
  const { error: extraError } = await extraQuery
  if (extraError) throw extraError

  if (!isComprovativo) {
    let modeloQuery = supabase
      .from('documentos_modelos')
      .update({ movimento_id: null })
      .eq('movimento_id', movimentoId)
    if (nucleoId) modeloQuery = modeloQuery.eq('nucleo_id', nucleoId)
    const { error: modeloError } = await modeloQuery
    if (modeloError) throw modeloError
  }
}

export async function linkDocumentoRecord({
  movimentoId,
  documentoExtraId,
  documentoModeloId,
  nucleoId,
}) {
  if (documentoExtraId) {
    let query = supabase
      .from('documentos_extras')
      .update({ movimento_id: movimentoId })
      .eq('id', documentoExtraId)
    if (nucleoId) query = query.eq('nucleo_id', nucleoId)
    const { error } = await query
    if (error) throw error
  }
  if (documentoModeloId) {
    let query = supabase
      .from('documentos_modelos')
      .update({ movimento_id: movimentoId })
      .eq('id', documentoModeloId)
    if (nucleoId) query = query.eq('nucleo_id', nucleoId)
    const { error } = await query
    if (error) throw error
  }
}

export async function uploadAnexoParaMovimento({
  userId,
  monthRef,
  movimentoId,
  file,
  documentoBaseTipo,
  kind,
}) {
  const prefix =
    kind === 'comprovativo'
      ? `comprovativo-banco-${sanitizeFileName(file.name)}`
      : `${documentoBaseTipo}-${sanitizeFileName(file.name)}`
  const path = `${userId}/${monthRef}/movimentos/${movimentoId}/${prefix}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  return path
}

export async function associarDocumentoAMovimento({
  movimentoId,
  tipoDocumento,
  storagePath,
  documentoExtraId,
  documentoModeloId,
  anexoFile,
  userId,
  monthRef,
}) {
  const { data: movimento, error: movError } = await supabase
    .from('movimentos')
    .select('id, tipo_conta, fatura_ou_oficio_path, comprovativo_banco_path')
    .eq('id', movimentoId)
    .single()

  if (movError) throw movError

  const updates = {}
  const baseTipo = tipoDocumentoToBaseTipo(tipoDocumento)

  if (isComprovativoTipo(tipoDocumento)) {
    if (movimento.tipo_conta !== 'banco') {
      throw new Error('Comprovativos só podem ser associados a movimentos bancários.')
    }
    if (anexoFile && userId && monthRef) {
      updates.comprovativo_banco_path = await uploadAnexoParaMovimento({
        userId,
        monthRef,
        movimentoId,
        file: anexoFile,
        documentoBaseTipo: baseTipo,
        kind: 'comprovativo',
      })
    } else if (storagePath) {
      updates.comprovativo_banco_path = storagePath
    } else {
      throw new Error('Seleciona um ficheiro de comprovativo.')
    }
  } else if (canAssociarATipoMovimento(tipoDocumento)) {
    if (anexoFile && userId && monthRef) {
      updates.fatura_ou_oficio_path = await uploadAnexoParaMovimento({
        userId,
        monthRef,
        movimentoId,
        file: anexoFile,
        documentoBaseTipo: baseTipo,
        kind: 'base',
      })
    } else if (storagePath) {
      updates.fatura_ou_oficio_path = storagePath
    } else if (documentoModeloId) {
      // Modelo oficio/errata na app: ligacao na BD, sem PDF obrigatorio
    } else {
      throw new Error('Anexa o PDF ou ficheiro do documento para o movimento.')
    }
  } else {
    throw new Error('Este tipo de documento não se associa a um movimento.')
  }

  if (Object.keys(updates).length > 0) {
    let query = supabase.from('movimentos').update(updates).eq('id', movimentoId)
    if (userId) query = query.eq('nucleo_id', userId)
    const { error: updateError } = await query
    if (updateError) throw updateError
  }

  await linkDocumentoRecord({
    movimentoId,
    documentoExtraId,
    documentoModeloId,
    nucleoId: userId,
  })

  return movimentoId
}
