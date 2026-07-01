import { useCallback, useState } from 'react'
import { ensureMesAberto } from '../lib/mesFechado'
import { linkDocumentoRecord } from '../lib/associarDocumentoMovimento'
import { sanitizeFileName } from '../lib/movimentoFiles'
import { formatSupabaseError } from '../lib/movimentoErrors'
import { STORAGE_BUCKET, supabase } from '../supabase/supabaseClient'
import { useAuth } from './useAuth'

export function useMovimentoActions() {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const createMovimento = useCallback(
    async ({
      monthRef,
      tipoConta,
      natureza,
      data,
      numeroDocumento,
      descricao,
      valor,
      documentoBaseTipo,
      faturaFile,
      comprovativoFile,
      existingBasePath,
      existingComprovativoPath,
      documentoExtraId,
      documentoModeloId,
    }) => {
      if (!user?.id) return null
      if (submitting) return null

      if (!Number.isFinite(Number(valor)) || Number(valor) < 0) {
        setError('Indica um valor válido para o movimento.')
        return null
      }
      if (!data || String(data).length < 7) {
        setError('Indica a data do movimento.')
        return null
      }

      const monthRefReal = String(data).slice(0, 7)

      setSubmitting(true)
      setError('')
      try {
        const aberto = await ensureMesAberto(user.id, monthRefReal)
        if (!aberto.ok) {
          setError(aberto.message)
          return null
        }

        const { data: insertedRow, error: insertError } = await supabase
          .from('movimentos')
          .insert({
            nucleo_id: user.id,
            tipo_conta: tipoConta,
            natureza,
            data,
            numero_documento: numeroDocumento.trim(),
            descricao: descricao.trim(),
            valor: Number(valor),
            month_ref: monthRefReal,
          })
          .select('id')
          .single()

        if (insertError) throw insertError

        const movimentoId = insertedRow.id

        let faturaPath = existingBasePath || ''
        if (faturaFile) {
          faturaPath = `${user.id}/${monthRefReal}/movimentos/${movimentoId}/${documentoBaseTipo}-${sanitizeFileName(faturaFile.name)}`
          const { error: faturaUploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(faturaPath, faturaFile, { upsert: true })
          if (faturaUploadError) throw faturaUploadError
        }

        let comprovativoPath = existingComprovativoPath || ''
        if (tipoConta === 'banco' && comprovativoFile) {
          comprovativoPath = `${user.id}/${monthRefReal}/movimentos/${movimentoId}/comprovativo-banco-${sanitizeFileName(comprovativoFile.name)}`
          const { error: compUploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(comprovativoPath, comprovativoFile, { upsert: true })
          if (compUploadError) throw compUploadError
        }

        const pathUpdate = {}
        if (faturaPath) {
          pathUpdate.fatura_ou_oficio_path = faturaPath
        }
        if (tipoConta === 'banco' && (comprovativoPath || comprovativoFile)) {
          pathUpdate.comprovativo_banco_path = comprovativoPath || null
        }

        if (Object.keys(pathUpdate).length > 0) {
          const { error: updateError } = await supabase
            .from('movimentos')
            .update(pathUpdate)
            .eq('id', movimentoId)
            .eq('nucleo_id', user.id)
          if (updateError) throw updateError
        }

        if (documentoExtraId || documentoModeloId) {
          await linkDocumentoRecord({
            movimentoId,
            documentoExtraId,
            documentoModeloId,
            nucleoId: user.id,
          })
        }

        return movimentoId
      } catch (submitError) {
        setError(
          formatSupabaseError(submitError, 'Falha ao guardar movimento. Verifica policies no Supabase.'),
        )
        console.error(submitError)
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [user?.id, submitting],
  )

  const updateMovimento = useCallback(
    async (movimento, editData) => {
      if (!movimento?.id || !user?.id || submitting) return false
      setSubmitting(true)
      setError('')
      try {
        const monthRefReal = String(editData.data).slice(0, 7)
        const abertoOrigem = await ensureMesAberto(user.id, movimento.month_ref)
        if (!abertoOrigem.ok) {
          setError(abertoOrigem.message)
          return false
        }
        if (monthRefReal !== movimento.month_ref) {
          const abertoDestino = await ensureMesAberto(user.id, monthRefReal)
          if (!abertoDestino.ok) {
            setError(abertoDestino.message)
            return false
          }
        }

        const { error: updateError } = await supabase
          .from('movimentos')
          .update({
            data: editData.data,
            numero_documento: editData.numeroDocumento.trim(),
            descricao: editData.descricao.trim(),
            natureza: editData.natureza,
            valor: Number(editData.valor),
            month_ref: String(editData.data).slice(0, 7),
          })
          .eq('id', movimento.id)
        if (updateError) throw updateError

        return true
      } catch (editError) {
        setError('Não foi possível editar movimento.')
        console.error(editError)
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [user?.id, submitting],
  )

  const deleteMovimento = useCallback(
    async (movimento) => {
      if (!movimento?.id || !user?.id || submitting) return false
      setSubmitting(true)
      setError('')
      try {
        const aberto = await ensureMesAberto(user.id, movimento.month_ref)
        if (!aberto.ok) {
          setError(aberto.message)
          return false
        }

        const { error: deleteError } = await supabase.from('movimentos').delete().eq('id', movimento.id)
        if (deleteError) throw deleteError
        return true
      } catch (deleteError) {
        setError('Não foi possível apagar movimento.')
        console.error(deleteError)
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [user?.id, submitting],
  )

  return {
    createMovimento,
    updateMovimento,
    deleteMovimento,
    submitting,
    error,
    setError,
  }
}
