import { CheckCircle2, ExternalLink, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'

function EntregaRow({ item, checked, onToggle }) {
  const openUrl = item.viewUrl || item.printUrl

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:gap-3 ${
        checked ? 'border-[#10B981] bg-[#F0FDF4]' : 'border-[#E5E7EB] bg-white'
      }`}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 sm:items-center">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={() => onToggle(item.id)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D1D5DB] text-[#1F6FEB] focus:ring-[#1F6FEB]"
        />
        <span className="min-w-0">
          <span
            className={`block truncate text-[14px] ${checked ? 'text-[#166534]' : 'text-[#111827]'}`}
            title={item.label}
          >
            {item.label}
          </span>
          {item.detail ? (
            <span className="mt-0.5 block truncate text-[12px] text-[#6B7280]" title={item.detail}>
              {item.detail}
            </span>
          ) : null}
        </span>
      </label>
      <div className="flex shrink-0 flex-wrap gap-2 pl-7 sm:pl-0">
        {item.printUrl ? (
          <Link
            to={item.printUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Link>
        ) : null}
        {item.viewUrl ? (
          <a
            href={item.viewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#1F6FEB] hover:bg-[#EFF6FF]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver PDF
          </a>
        ) : openUrl && !item.printUrl ? (
          <Link
            to={openUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export default function EntregaImpressaoChecklist({
  loading,
  saving,
  items,
  printed,
  progress,
  togglePrinted,
  markAllPrinted,
  clearPrinted,
}) {
  const folhas = items.filter((it) => it.grupo === 'folhas')
  const documentos = items.filter((it) => it.grupo === 'documentos')

  if (loading) {
    return <p className="text-[14px] text-[#6B7280]">A preparar lista de entrega...</p>
  }

  if (items.length === 0) {
    return null
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-[#6B7280]">
            Marca cada item quando tiveres a versão em papel. Inclui as 2 folhas e todos os
            documentos do mês.
          </p>
          <p className="mt-2 text-[14px] font-medium text-[#111827]">
            {progress.done} de {progress.total} itens impressos
            {saving ? ' · a guardar...' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAllPrinted}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
          >
            Marcar tudo como impresso
          </button>
          <button
            type="button"
            onClick={clearPrinted}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
          >
            Limpar marcações
          </button>
        </div>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div
          className="h-full rounded-full bg-[#10B981] transition-all"
          style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
        />
      </div>

      {progress.complete ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#10B981] bg-[#DCFCE7] px-4 py-3 text-[14px] text-[#166534]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Pacote completo — pronto para entregar em papel à contabilidade.
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-[#6B7280]">Folhas ({folhas.length})</h3>
          <div className="space-y-2">
            {folhas.map((item) => (
              <EntregaRow
                key={item.id}
                item={item}
                checked={printed[item.id]}
                onToggle={togglePrinted}
              />
            ))}
          </div>
        </div>

        {documentos.length > 0 ? (
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-[#6B7280]">
              Documentos do mês ({documentos.length})
            </h3>
            <div className="space-y-2">
              {documentos.map((item) => (
                <EntregaRow
                  key={item.id}
                  item={item}
                  checked={printed[item.id]}
                  onToggle={togglePrinted}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
