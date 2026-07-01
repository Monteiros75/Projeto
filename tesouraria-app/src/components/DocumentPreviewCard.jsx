import { ExternalLink, FileQuestion } from 'lucide-react'
import { useMemo } from 'react'

function previewKindFromName(name) {
  const ref = (name || '').toLowerCase()
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(ref)) return 'image'
  if (/\.pdf$/.test(ref)) return 'pdf'
  return 'other'
}

function fileExtensionLabel(name) {
  const match = String(name || '').match(/\.([a-z0-9]+)$/i)
  if (!match) return 'Ficheiro'
  return match[1].toUpperCase()
}

/** Esconde barra lateral e toolbar do leitor PDF integrado do browser */
export function buildPdfPreviewUrl(url) {
  if (!url) return ''
  const params = 'toolbar=0&navpanes=0&scrollbar=0&view=FitH'
  return url.includes('#') ? `${url}&${params}` : `${url}#${params}`
}

export default function DocumentPreviewCard({
  title,
  subtitle,
  signedUrl,
  fileName,
  className = '',
  actions = null,
  compact = false,
}) {
  const kind = useMemo(() => previewKindFromName(fileName || signedUrl || ''), [fileName, signedUrl])
  const pdfUrl = useMemo(
    () => (kind === 'pdf' ? buildPdfPreviewUrl(signedUrl) : signedUrl),
    [kind, signedUrl],
  )
  const previewHeight = compact ? 'h-[132px]' : 'h-[280px]'
  const extLabel = fileExtensionLabel(fileName)

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words text-[13px] font-medium leading-snug text-[#111827]" title={title}>
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 line-clamp-1 break-words text-[11px] text-[#6B7280]" title={subtitle}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {actions}
          {signedUrl ? (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-1.5 text-[#1F6FEB] hover:bg-[#EFF6FF]"
              title="Abrir num separador"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-white ${compact ? 'min-h-[132px]' : 'min-h-[160px]'}`}
      >
        {!signedUrl ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <FileQuestion className="h-8 w-8 text-[#9CA3AF]" />
            <p className="text-[13px] font-medium text-[#374151]">Modelo sem ficheiro</p>
            <p className="text-[12px] text-[#6B7280]">Abre o editor para gerar ou imprimir.</p>
          </div>
        ) : kind === 'image' ? (
          <img src={signedUrl} alt="" className={`${previewHeight} w-full object-contain`} />
        ) : kind === 'pdf' ? (
          <embed
            title={title}
            src={pdfUrl}
            type="application/pdf"
            className={`${previewHeight} w-full border-0 bg-white`}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F3F4F6] text-[13px] font-semibold text-[#6B7280]">
              {extLabel}
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#374151]">Ficheiro {extLabel}</p>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">Pré-visualização não disponível</p>
            </div>
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir ficheiro
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
