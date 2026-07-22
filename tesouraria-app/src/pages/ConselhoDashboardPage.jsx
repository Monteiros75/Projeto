import { ArrowRight, Clock, Plus, X } from 'lucide-react'
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
  const {
    nucleos,
    disponiveis,
    loading,
    error,
    actionError,
    actionSubmitting,
    associar,
    desassociar,
  } = useConselhoNucleos()

  async function handleDesassociar(event, nucleo) {
    event.preventDefault()
    event.stopPropagation()
    if (!window.confirm(`Desassociar-te de "${nucleo.nomeNucleo || 'este núcleo'}"?`)) return
    await desassociar(nucleo.id)
  }

  async function handleAssociar(nucleo) {
    await associar(nucleo.id)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-[24px] font-medium text-[#111827]">Concelho Fiscal</h1>
        <p className="mt-1 text-[14px] text-[#6B7280]">
          Revisão online do fecho mensal antes da entrega em papel.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          {error}
        </p>
      ) : null}

      {actionError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
          {actionError}
        </p>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-[16px] font-medium text-[#111827]">Os meus núcleos</h2>
        {loading ? (
          <p className="text-[14px] text-[#6B7280]">A carregar...</p>
        ) : nucleos.length === 0 ? (
          <p className="rounded-lg border border-[#E5E7EB] bg-white p-6 text-[14px] text-[#6B7280]">
            Ainda não tens núcleos associados. Escolhe um em baixo, em "Núcleos disponíveis".
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
                  to={
                    mesRef
                      ? `/concelho/nucleos/${nucleo.id}?mes=${mesRef}`
                      : `/concelho/nucleos/${nucleo.id}`
                  }
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
                    <button
                      type="button"
                      onClick={(event) => handleDesassociar(event, nucleo)}
                      disabled={actionSubmitting}
                      title="Desassociar"
                      className="rounded-lg border border-[#E5E7EB] p-1.5 text-[#6B7280] hover:bg-[#FEE2E2] hover:text-[#991B1B] disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <ArrowRight className="h-4 w-4 text-[#9CA3AF]" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-[16px] font-medium text-[#111827]">Núcleos disponíveis</h2>
        {loading ? null : disponiveis.length === 0 ? (
          <p className="rounded-lg border border-[#E5E7EB] bg-white p-6 text-[14px] text-[#6B7280]">
            Não há núcleos por atribuir de momento.
          </p>
        ) : (
          <div className="space-y-3">
            {disponiveis.map((nucleo) => (
              <div
                key={nucleo.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-[#E5E7EB] bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-[#111827]">
                    {nucleo.nomeNucleo || 'Núcleo sem nome'}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">
                    Tesoureiro: {nucleo.nomeTesoureiro || '-'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAssociar(nucleo)}
                  disabled={actionSubmitting}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1F6FEB] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#1557C0] disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Associar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ConselhoDashboardPage
