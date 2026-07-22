import { ArrowRight, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useConselhoNucleos } from '../hooks/useConselhoNucleos'
import { formatMonthLabel } from '../lib/monthRef'

const ESTADO_LABEL = {
  rascunho: { label: 'Sem submissão', className: 'bg-[#F3F4F6] text-[#374151]' },
  submetido: { label: 'Aguarda revisão', className: 'bg-[#DBEAFE] text-[#1E40AF]' },
  aprovado: { label: 'Aprovado', className: 'bg-[#DCFCE7] text-[#166534]' },
  reprovado: { label: 'Correções pedidas', className: 'bg-[#FEE2E2] text-[#991B1B]' },
}

function EstadoBadge({ estado }) {
  const info = ESTADO_LABEL[estado] || ESTADO_LABEL.rascunho
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${info.className}`}>
      {info.label}
    </span>
  )
}

function ConselhoDashboardPage() {
  const { nucleos, loading, error } = useConselhoNucleos()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-[24px] font-medium text-[#111827]">Núcleos atribuídos</h1>
        <p className="mt-1 text-[14px] text-[#6B7280]">
          Revisão online do fecho mensal antes da entrega em papel.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-[14px] text-[#6B7280]">A carregar...</p>
      ) : nucleos.length === 0 ? (
        <p className="rounded-lg border border-[#E5E7EB] bg-white p-6 text-[14px] text-[#6B7280]">
          Ainda não tens núcleos atribuídos.
        </p>
      ) : (
        <div className="space-y-3">
          {nucleos.map((nucleo) => {
            const fecho = nucleo.ultimoFecho
            const mesRef = fecho?.month_ref
            const pendente = fecho?.estado_validacao === 'submetido'
            return (
              <Link
                key={nucleo.id}
                to={mesRef ? `/concelho/nucleos/${nucleo.id}?mes=${mesRef}` : `/concelho/nucleos/${nucleo.id}`}
                className={`flex items-center justify-between gap-4 rounded-lg border bg-white p-4 transition-colors hover:bg-[#F9FAFB] ${
                  pendente ? 'border-[#1F6FEB]' : 'border-[#E5E7EB]'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-[#111827]">
                    {nucleo.nomeNucleo || 'Núcleo sem nome'}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">
                    Tesoureiro: {nucleo.nomeTesoureiro || '-'}
                  </p>
                  {mesRef ? (
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                      <Clock className="h-3.5 w-3.5" />
                      {formatMonthLabel(mesRef, { long: true })}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <EstadoBadge estado={fecho?.estado_validacao || 'rascunho'} />
                  <ArrowRight className="h-4 w-4 text-[#9CA3AF]" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ConselhoDashboardPage
