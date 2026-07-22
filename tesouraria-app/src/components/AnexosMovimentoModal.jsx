import { ExternalLink, FileStack, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DocumentPreviewCard from './DocumentPreviewCard'
import { formatDatePt } from '../lib/folhaMensal'
import { createSignedUrlForPath } from '../lib/storageSignedUrl'

function SemDocumento({ monthRef, onClose, readOnly }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3">
      <p className="text-[13px] text-[#6B7280]">Sem documento anexado.</p>
      {!readOnly ? (
        <Link
          to={`/documentos?mes=${monthRef}`}
          onClick={onClose}
          className="shrink-0 text-[13px] font-medium text-[#1F6FEB] hover:underline"
        >
          Adicionar
        </Link>
      ) : null}
    </div>
  )
}

export default function AnexosMovimentoModal({ movimento, modelo, monthRef, onClose, readOnly = false }) {
  const [faturaUrl, setFaturaUrl] = useState('')
  const [comprovativoUrl, setComprovativoUrl] = useState('')
  const [loading, setLoading] = useState(true)

  const faturaPath = movimento.fatura_ou_oficio_path
  const comprovativoPath = movimento.comprovativo_banco_path

  useEffect(() => {
    let cancelled = false
    async function loadUrls() {
      setLoading(true)
      const [fatura, comprovativo] = await Promise.all([
        faturaPath ? createSignedUrlForPath(faturaPath) : Promise.resolve(''),
        comprovativoPath ? createSignedUrlForPath(comprovativoPath) : Promise.resolve(''),
      ])
      if (cancelled) return
      setFaturaUrl(fatura)
      setComprovativoUrl(comprovativo)
      setLoading(false)
    }
    loadUrls()
    return () => {
      cancelled = true
    }
  }, [faturaPath, comprovativoPath])

  const titulo = movimento.descricao || movimento.numero_documento || 'Movimento'
  const isBanco = movimento.tipo_conta === 'banco'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-[#111827]">Documentos do movimento</h3>
            <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">
              {movimento.linha ? `${movimento.linha} · ` : ''}
              {formatDatePt(movimento.data)} · {titulo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-[13px] text-[#6B7280]">A carregar documentos...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                Fatura / Ofício / Errata
              </p>
              {faturaUrl ? (
                <DocumentPreviewCard title={titulo} signedUrl={faturaUrl} fileName={faturaPath} />
              ) : modelo ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#111827]">
                      {modelo.titulo || 'Ofício / Errata'}
                    </p>
                    <p className="text-[12px] text-[#6B7280]">Gerado na app — abre para ver ou imprimir.</p>
                  </div>
                  {!readOnly ? (
                    <Link
                      to={`/documentos/modelo/${modelo.id}`}
                      onClick={onClose}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir
                    </Link>
                  ) : null}
                </div>
              ) : (
                <SemDocumento monthRef={monthRef} onClose={onClose} readOnly={readOnly} />
              )}
            </div>

            {isBanco ? (
              <div>
                <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                  Comprovativo bancário
                </p>
                {comprovativoUrl ? (
                  <DocumentPreviewCard
                    title={`Comprovativo — ${titulo}`}
                    signedUrl={comprovativoUrl}
                    fileName={comprovativoPath}
                  />
                ) : (
                  <SemDocumento monthRef={monthRef} onClose={onClose} readOnly={readOnly} />
                )}
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-4">
          {!readOnly ? (
            <Link
              to={`/documentos?mes=${monthRef}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1F6FEB] hover:underline"
            >
              <FileStack className="h-3.5 w-3.5" />
              Gerir documentos deste mês
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-[14px] text-[#111827] hover:bg-[#F9FAFB]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
