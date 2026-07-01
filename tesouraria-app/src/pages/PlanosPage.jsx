import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardList, FileBarChart, Plus, Trash2 } from 'lucide-react'
import { usePlanos } from '../hooks/usePlanos'
import {
  formatMandatoLabel,
  mandatoPadraoSugerido,
  tituloPadraoPlano,
} from '../lib/mandatoFormat'
import { TIPOS_PLANO } from '../lib/seccoes'

const ABAS = [
  {
    id: 'pao',
    label: 'Plano de Atividades e Orçamento',
    sigla: 'PAO',
    descricao: 'Previsão de atividades e orçamento no início do mandato',
    empty: 'Ainda não criaste nenhum PAO. Cria um para planear o mandato.',
    botaoNovo: 'Novo PAO',
  },
  {
    id: 'relatorio',
    label: 'Relatório Anual de Contas',
    sigla: 'RAC',
    descricao: 'Receitas e despesas reais ao longo do mandato',
    empty: 'Ainda não criaste nenhum Relatório Anual de Contas.',
    botaoNovo: 'Novo relatório',
  },
]

function labelPlano(plano) {
  const mandato = formatMandatoLabel(plano.mandato_inicio, plano.mandato_fim)
  if (mandato !== 'Mandato não definido') {
    return `${plano.titulo} (${mandato})`
  }
  return plano.titulo
}

function NovoPlanoForm({ tipo, onCriar, onCancelar, paos }) {
  const config = TIPOS_PLANO[tipo]
  const padrao = mandatoPadraoSugerido()
  const [mandatoInicio, setMandatoInicio] = useState(padrao.inicio)
  const [mandatoFim, setMandatoFim] = useState(padrao.fim)
  const [titulo, setTitulo] = useState('')
  const [paoReferenciaId, setPaoReferenciaId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [erroForm, setErroForm] = useState('')

  const paosDoMandato = paos.filter(
    (p) =>
      p.mandato_inicio?.startsWith(mandatoInicio) &&
      p.mandato_fim?.startsWith(mandatoFim),
  )

  useEffect(() => {
    if (tipo === 'relatorio' && paosDoMandato.length === 1) {
      setPaoReferenciaId(paosDoMandato[0].id)
    }
  }, [tipo, mandatoInicio, mandatoFim, paosDoMandato])

  async function handleSubmit(e) {
    e.preventDefault()
    setErroForm('')
    if (!mandatoInicio || !mandatoFim) {
      setErroForm('Indica o início e o fim do mandato.')
      return
    }
    if (mandatoFim < mandatoInicio) {
      setErroForm('O fim do mandato deve ser posterior ou igual ao início.')
      return
    }
    setSubmitting(true)
    try {
      const tituloFinal =
        titulo.trim() ||
        tituloPadraoPlano(config.label, `${mandatoInicio}-01`, `${mandatoFim}-01`)
      await onCriar({
        tipo,
        mandatoInicio,
        mandatoFim,
        titulo: tituloFinal,
        paoReferenciaId: tipo === 'relatorio' ? paoReferenciaId || null : null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-4 rounded-lg border border-[#E5E7EB] bg-white p-6"
    >
      <h3 className="text-[16px] font-medium text-[#111827]">Novo {config.sigla}</h3>
      <p className="text-[13px] text-[#6B7280]">{config.descricao}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#6B7280]">Início do mandato</span>
          <input
            type="month"
            value={mandatoInicio}
            onChange={(e) => setMandatoInicio(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#6B7280]">Fim do mandato</span>
          <input
            type="month"
            value={mandatoFim}
            onChange={(e) => setMandatoFim(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            required
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-[13px] text-[#6B7280]">Título (opcional)</span>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={tituloPadraoPlano(
            config.label,
            `${mandatoInicio}-01`,
            `${mandatoFim}-01`,
          )}
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
        />
      </label>

      {tipo === 'relatorio' ? (
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#6B7280]">
            PAO de referência (orçamento previsto)
          </span>
          <select
            value={paoReferenciaId}
            onChange={(e) => setPaoReferenciaId(e.target.value)}
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
          >
            <option value="">Detetar automaticamente pelo mandato</option>
            {paos.map((pao) => (
              <option key={pao.id} value={pao.id}>
                {labelPlano(pao)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {erroForm ? (
        <p className="text-[13px] text-[#DC2626]">{erroForm}</p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white hover:bg-[#1557C0] disabled:opacity-50"
        >
          {submitting ? 'A criar...' : `Criar ${config.sigla}`}
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

function PlanoCard({ plano, onAbrir, onApagar }) {
  const config = TIPOS_PLANO[plano.tipo] || TIPOS_PLANO.pao
  const Icon = plano.tipo === 'pao' ? ClipboardList : FileBarChart
  const mandato = formatMandatoLabel(plano.mandato_inicio, plano.mandato_fim)
  const subtitulo =
    mandato !== 'Mandato não definido' ? mandato : plano.ano ? String(plano.ano) : 'Sem mandato'
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white p-4 hover:border-[#1F6FEB]">
      <button
        type="button"
        onClick={() => onAbrir(plano.id)}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF]">
          <Icon className="h-5 w-5 text-[#1F6FEB]" />
        </span>
        <span>
          <span className="block text-[15px] font-medium text-[#111827]">{plano.titulo}</span>
          <span className="block text-[13px] text-[#6B7280]">
            {config.sigla} · {subtitulo}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onApagar(plano)}
        className="rounded-lg p-2 text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
        title="Apagar"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function PlanosPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { planos, loading, error, criarPlano, apagarPlano } = usePlanos()
  const [mostrarForm, setMostrarForm] = useState(false)

  const abaAtiva = searchParams.get('tab') === 'relatorio' ? 'relatorio' : 'pao'
  const abaConfig = ABAS.find((a) => a.id === abaAtiva) || ABAS[0]

  const paos = planos.filter((p) => p.tipo === 'pao')
  const relatorios = planos.filter((p) => p.tipo === 'relatorio')
  const documentos = abaAtiva === 'pao' ? paos : relatorios

  function mudarAba(id) {
    setSearchParams(id === 'pao' ? {} : { tab: id }, { replace: true })
    setMostrarForm(false)
  }

  async function handleCriar(dados) {
    const novo = await criarPlano(dados)
    setMostrarForm(false)
    if (novo?.id) {
      navigate(`/planos/${novo.id}`)
    }
  }

  async function handleApagar(plano) {
    if (window.confirm(`Apagar "${plano.titulo}"? Esta ação não pode ser anulada.`)) {
      await apagarPlano(plano.id)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-[24px] font-medium text-[#111827]">Plano e Contas do Mandato</h1>
        <p className="mt-1 text-[14px] text-[#6B7280]">
          Documentos formais do mandato — previsão (PAO) e contas reais (Relatório)
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-[#E5E7EB]">
        {ABAS.map((aba) => {
          const ativa = abaAtiva === aba.id
          const Icon = aba.id === 'pao' ? ClipboardList : FileBarChart
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => mudarAba(aba.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[14px] transition-colors ${
                ativa
                  ? 'border-[#1F6FEB] font-medium text-[#1F6FEB]'
                  : 'border-transparent text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{aba.label}</span>
              <span className="sm:hidden">{aba.sigla}</span>
            </button>
          )
        })}
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[14px] text-[#6B7280]">{abaConfig.descricao}</p>
        {!mostrarForm ? (
          <button
            type="button"
            onClick={() => setMostrarForm(true)}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white hover:bg-[#1557C0]"
          >
            <Plus className="h-4 w-4" />
            {abaConfig.botaoNovo}
          </button>
        ) : null}
      </div>

      {mostrarForm ? (
        <NovoPlanoForm
          tipo={abaAtiva}
          onCriar={handleCriar}
          onCancelar={() => setMostrarForm(false)}
          paos={paos}
        />
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-[14px] text-[#DC2626]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-[14px] text-[#6B7280]">A carregar...</p>
      ) : documentos.length ? (
        <div className="space-y-2">
          {documentos.map((plano) => (
            <PlanoCard
              key={plano.id}
              plano={plano}
              onAbrir={(id) => navigate(`/planos/${id}`)}
              onApagar={handleApagar}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[#E5E7EB] p-8 text-center text-[14px] text-[#9CA3AF]">
          {abaConfig.empty}
        </p>
      )}
    </div>
  )
}

export default PlanosPage
