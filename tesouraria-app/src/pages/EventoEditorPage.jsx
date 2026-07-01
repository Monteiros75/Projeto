import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useEventoEditor } from '../hooks/useEventoEditor'
import {
  STATUS_EVENTO,
  TIPO_LINHA_EVENTO,
  linhasPorTipo,
  totaisEvento,
  totaisTipo,
} from '../lib/eventoCalculos'

function eur(value) {
  return Number(value || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  })
}

function LinhaOrcamento({ linha, placeholderNome, onSave, onRemover }) {
  const [local, setLocal] = useState(linha)

  useEffect(() => {
    setLocal(linha)
  }, [linha])

  function campoTexto(nome) {
    return {
      value: local[nome] ?? '',
      onChange: (e) => setLocal((prev) => ({ ...prev, [nome]: e.target.value })),
      onBlur: () => {
        if (local[nome] !== linha[nome]) onSave(linha.id, { [nome]: local[nome] })
      },
    }
  }

  function campoValor(nome) {
    return {
      type: 'number',
      min: '0',
      step: '0.01',
      value: local[nome] ?? 0,
      onChange: (e) => setLocal((prev) => ({ ...prev, [nome]: e.target.value })),
      onBlur: () => {
        const novo = Number(local[nome] || 0)
        if (novo !== Number(linha[nome] || 0)) onSave(linha.id, { [nome]: novo })
      },
    }
  }

  const inputBase =
    'w-full rounded border border-[#E5E7EB] px-2 py-1.5 text-[13px] text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#1F6FEB]'
  const inputValor = `${inputBase} text-right tabular-nums`
  const inputReal = `${inputValor} bg-[#F9FAFB] text-[#6B7280]`

  return (
    <tr className="border-t border-[#E5E7EB] align-top">
      <td className="p-1.5">
        <input className={inputBase} placeholder={placeholderNome} {...campoTexto('nome')} />
      </td>
      <td className="p-1.5">
        <input className={inputValor} {...campoValor('valor_estimado')} />
      </td>
      <td className="p-1.5">
        <input className={inputReal} title="Valor real (após o evento)" {...campoValor('valor_real')} />
      </td>
      <td className="p-1.5">
        <input
          className={inputBase}
          placeholder="Notas opcionais"
          {...campoTexto('observacoes')}
        />
      </td>
      <td className="p-1.5 text-center">
        <button
          type="button"
          onClick={() => onRemover(linha.id)}
          className="rounded p-1 text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
          title="Remover linha"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

function TabelaOrcamento({ tipo, linhas, onAdicionar, onSave, onRemover }) {
  const config = TIPO_LINHA_EVENTO[tipo]
  const linhasTipo = linhasPorTipo(linhas, tipo)
  const totalEstimado = totaisTipo(linhas, tipo, 'estimado')
  const totalReal = totaisTipo(linhas, tipo, 'real')
  const placeholderNome = tipo === 'despesa' ? 'Ex.: Bebidas, som, transporte' : 'Ex.: Bilhetes, patrocinio'

  async function handleAdicionar() {
    try {
      await onAdicionar(tipo)
    } catch {
      // Erro mostrado pelo hook (banner no topo da pagina).
    }
  }

  return (
    <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className={`text-[15px] font-medium ${config.corTitulo}`}>{config.label}</h3>
        <button
          type="button"
          onClick={handleAdicionar}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[13px] text-[#1F6FEB] hover:bg-[#EFF6FF]"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar {tipo === 'despesa' ? 'despesa' : 'receita'}
        </button>
      </div>

      {linhasTipo.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-[#6B7280]">
                <th className="p-1.5 font-medium">Nome</th>
                <th className="p-1.5 font-medium text-right">Estimado</th>
                <th className="p-1.5 font-medium text-right text-[#9CA3AF]">Real</th>
                <th className="p-1.5 font-medium">Observacoes</th>
                <th className="p-1.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {linhasTipo.map((linha) => (
                <LinhaOrcamento
                  key={linha.id}
                  linha={linha}
                  placeholderNome={placeholderNome}
                  onSave={onSave}
                  onRemover={onRemover}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#E5E7EB] font-medium text-[#111827]">
                <td className="p-1.5">Total</td>
                <td className="p-1.5 text-right">{eur(totalEstimado)}</td>
                <td className="p-1.5 text-right text-[#6B7280]">{eur(totalReal)}</td>
                <td className="p-1.5" colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#E5E7EB] px-4 py-6 text-center">
          <p className="text-[13px] text-[#9CA3AF]">
            Ainda não há {tipo === 'despesa' ? 'despesas' : 'receitas'} registadas.
          </p>
          <button
            type="button"
            onClick={handleAdicionar}
            className="mt-2 text-[13px] text-[#1F6FEB] hover:underline"
          >
            Adicionar {tipo === 'despesa' ? 'primeira despesa' : 'primeira receita'}
          </button>
        </div>
      )}
    </section>
  )
}

function EventoEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    evento,
    linhas,
    loading,
    error,
    guardarEvento,
    adicionarLinha,
    atualizarLinha,
    removerLinha,
  } = useEventoEditor(id)

  const [cabecalho, setCabecalho] = useState({ nome: '', data: '', status: 'planeado' })

  useEffect(() => {
    if (!evento) return
    setCabecalho({
      nome: evento.nome || '',
      data: evento.data || '',
      status: evento.status || 'planeado',
    })
  }, [evento])

  async function guardarCampoCabecalho(campo, valor) {
    if (!evento || evento[campo] === valor) return
    await guardarEvento({ [campo]: valor || null })
  }

  const totaisEstimado = totaisEvento(linhas, 'estimado')
  const totaisReal = totaisEvento(linhas, 'real')

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-[14px] text-[#6B7280]">A carregar orçamento...</p>
      </div>
    )
  }

  if (!evento) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-[14px] text-[#DC2626]">Evento não encontrado.</p>
        <Link to="/eventos" className="mt-4 inline-block text-[14px] text-[#1F6FEB] hover:underline">
          Voltar ao orçamento de eventos
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/eventos')}
          className="mb-4 inline-flex items-center gap-2 text-[14px] text-[#6B7280] hover:text-[#111827]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao orçamento de eventos
        </button>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-[13px] text-[#6B7280]">Nome do evento</span>
            <input
              type="text"
              value={cabecalho.nome}
              onChange={(e) => setCabecalho((prev) => ({ ...prev, nome: e.target.value }))}
              onBlur={() => guardarCampoCabecalho('nome', cabecalho.nome.trim())}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[15px] font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] text-[#6B7280]">Estado</span>
            <select
              value={cabecalho.status}
              onChange={async (e) => {
                const status = e.target.value
                setCabecalho((prev) => ({ ...prev, status }))
                await guardarCampoCabecalho('status', status)
              }}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            >
              {Object.entries(STATUS_EVENTO).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] text-[#6B7280]">Data</span>
            <input
              type="date"
              value={cabecalho.data}
              onChange={(e) => setCabecalho((prev) => ({ ...prev, data: e.target.value }))}
              onBlur={() => guardarCampoCabecalho('data', cabecalho.data || null)}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4 text-[14px] text-[#DC2626]">
          {error}
        </div>
      ) : null}

      <div className="mb-4">
        <h2 className="text-[16px] font-medium text-[#111827]">Orçamento previsto</h2>
        <p className="mt-0.5 text-[13px] text-[#6B7280]">
          Adiciona despesas e receitas em separado. A coluna Real é opcional (após o evento).
        </p>
      </div>

      <div className="space-y-6">
        <TabelaOrcamento
          tipo="despesa"
          linhas={linhas}
          onAdicionar={adicionarLinha}
          onSave={atualizarLinha}
          onRemover={removerLinha}
        />
        <TabelaOrcamento
          tipo="receita"
          linhas={linhas}
          onAdicionar={adicionarLinha}
          onSave={atualizarLinha}
          onRemover={removerLinha}
        />

        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <div className="grid gap-2 text-[14px] sm:grid-cols-3">
            <div className="flex justify-between sm:block">
              <span className="text-[#6B7280]">Despesas previstas</span>
              <span className="font-medium text-[#111827] sm:mt-0.5 sm:block">
                {eur(totaisEstimado.despesas)}
              </span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-[#6B7280]">Receitas previstas</span>
              <span className="font-medium text-[#111827] sm:mt-0.5 sm:block">
                {eur(totaisEstimado.receitas)}
              </span>
            </div>
            <div className="flex justify-between sm:block">
              <span className="text-[#6B7280]">Resultado previsto</span>
              <span
                className={`font-semibold sm:mt-0.5 sm:block ${
                  totaisEstimado.balanco < 0 ? 'text-[#DC2626]' : 'text-[#059669]'
                }`}
              >
                {eur(totaisEstimado.balanco)}
              </span>
            </div>
          </div>
          {linhas.length ? (
            <p className="mt-2 text-[12px] text-[#9CA3AF]">
              Resultado real (se preenchido): {eur(totaisReal.balanco)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default EventoEditorPage
