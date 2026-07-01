import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react'
import { useEventos } from '../hooks/useEventos'
import { STATUS_EVENTO } from '../lib/eventoCalculos'

function eur(value) {
  return Number(value || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  })
}

function formatDataPt(isoDate) {
  if (!isoDate) return 'Sem data'
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('pt-PT')
}

function NovoEventoForm({ onCriar, onCancelar }) {
  const [nome, setNome] = useState('')
  const [data, setData] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!nome.trim()) return
    setSubmitting(true)
    try {
      await onCriar({ nome, data: data || null })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 space-y-4 rounded-lg border border-[#E5E7EB] bg-white p-6"
    >
      <h3 className="text-[16px] font-medium text-[#111827]">Novo evento</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#6B7280]">Nome do evento</span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Semana de Integração"
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#6B7280]">Data (opcional)</span>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white hover:bg-[#1557C0] disabled:opacity-50"
        >
          {submitting ? 'A criar...' : 'Criar evento'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-[14px] text-[#111827] hover:bg-[#F9FAFB]"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function EventoCard({ evento, totais, onAbrir, onApagar }) {
  const status = STATUS_EVENTO[evento.status] || STATUS_EVENTO.planeado

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <button type="button" onClick={() => onAbrir(evento.id)} className="min-w-0 flex-1 text-left">
          <h3 className="mb-1 truncate text-[18px] font-medium text-[#111827]">{evento.nome}</h3>
          <div className="flex items-center gap-2 text-[14px] text-[#6B7280]">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span>{formatDataPt(evento.data)}</span>
          </div>
        </button>
        <div className="flex shrink-0 items-start gap-2">
          <span className={`rounded px-2 py-1 text-[12px] font-medium ${status.className}`}>
            {status.label}
          </span>
          <button
            type="button"
            onClick={() => onApagar(evento)}
            className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
            title="Apagar evento"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAbrir(evento.id)}
        className="w-full space-y-2 border-t border-[#E5E7EB] pt-4 text-left"
      >
        <div className="flex justify-between text-[14px]">
          <span className="text-[#6B7280]">Despesas previstas</span>
          <span className="text-[#111827]">{eur(totais?.despesas)}</span>
        </div>
        <div className="flex justify-between text-[14px]">
          <span className="text-[#6B7280]">Receitas previstas</span>
          <span className="text-[#111827]">{eur(totais?.receitas)}</span>
        </div>
        <div className="flex justify-between text-[14px] font-medium">
          <span className="text-[#6B7280]">Resultado previsto</span>
          <span className={totais?.balanco < 0 ? 'text-[#DC2626]' : 'text-[#059669]'}>
            {eur(totais?.balanco)}
          </span>
        </div>
      </button>
    </div>
  )
}

function EventosPage() {
  const navigate = useNavigate()
  const { eventos, totaisPorEvento, loading, error, criarEvento, apagarEvento } = useEventos()
  const [mostrarForm, setMostrarForm] = useState(false)

  async function handleCriar(dados) {
    const novo = await criarEvento(dados)
    setMostrarForm(false)
    if (novo?.id) {
      navigate(`/eventos/${novo.id}`)
    }
  }

  async function handleApagar(evento) {
    if (window.confirm(`Apagar "${evento.nome}"? Esta ação não pode ser anulada.`)) {
      await apagarEvento(evento.id)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium text-[#111827]">Orçamento de Eventos</h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            Planear despesas e receitas estimadas por atividade do núcleo
          </p>
        </div>
        {!mostrarForm ? (
          <button
            type="button"
            onClick={() => setMostrarForm(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white hover:bg-[#1557C0]"
          >
            <Plus className="h-4 w-4" />
            Criar evento
          </button>
        ) : null}
      </div>

      {mostrarForm ? (
        <NovoEventoForm onCriar={handleCriar} onCancelar={() => setMostrarForm(false)} />
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-[14px] text-[#DC2626]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-[14px] text-[#6B7280]">A carregar...</p>
      ) : eventos.length ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {eventos.map((evento) => (
            <EventoCard
              key={evento.id}
              evento={evento}
              totais={totaisPorEvento.get(evento.id) || { despesas: 0, receitas: 0, balanco: 0 }}
              onAbrir={(id) => navigate(`/eventos/${id}`)}
              onApagar={handleApagar}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[#E5E7EB] p-8 text-center text-[14px] text-[#9CA3AF]">
          Ainda não criaste nenhum evento. Cria um para planear o orçamento da atividade.
        </p>
      )}
    </div>
  )
}

export default EventosPage
