import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Plus, Printer, Trash2 } from 'lucide-react'
import { usePlanoEditor } from '../hooks/usePlanoEditor'
import { usePlanos } from '../hooks/usePlanos'
import { useMovimentosMandato } from '../hooks/useMovimentosMandato'
import GestorSeccoes from '../components/plano/GestorSeccoes'
import ImportarMovimentosModal from '../components/plano/ImportarMovimentosModal'
import { TabelaOrcamentoGlobal } from '../components/plano/PlanoDocumentoViews'
import { dateToMonthInput, formatMandatoLabel } from '../lib/mandatoFormat'
import { getSeccoesDoPlano, TIPOS_PLANO } from '../lib/seccoes'
import { agruparPorSeccao, totaisGlobais, totaisSeccao } from '../lib/planoCalculos'
import { getPrevisaoSecao, tituloOrcamentoSecao } from '../lib/planoDocumento'

function eur(value) {
  return Number(value || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  })
}

function LinhaEditor({ linha, onSave, onRemover }) {
  const [local, setLocal] = useState(linha)

  useEffect(() => {
    setLocal(linha)
  }, [linha])

  function campo(nome) {
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
      step: '0.01',
      min: '0',
      value: local[nome] ?? 0,
      onChange: (e) => setLocal((prev) => ({ ...prev, [nome]: e.target.value })),
      onBlur: () => {
        const novo = Number(local[nome] || 0)
        if (novo !== Number(linha[nome] || 0)) onSave(linha.id, { [nome]: novo })
      },
    }
  }

  const inputBase =
    'w-full rounded border border-[#E5E7EB] px-2 py-1 text-[13px] text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#1F6FEB]'

  return (
    <tr className="border-t border-[#E5E7EB] align-top">
      <td className="p-1">
        <input className={inputBase} placeholder="Atividade" {...campo('designacao')} />
      </td>
      <td className="p-1">
        <input className={inputBase} placeholder="Ex.: Maio, Ano todo" {...campo('data_realizacao')} />
      </td>
      <td className="p-1">
        <input className={inputBase} placeholder="Designação despesa" {...campo('despesa_designacao')} />
      </td>
      <td className="p-1">
        <input className={`${inputBase} text-right`} {...campoValor('despesa_valor')} />
      </td>
      <td className="p-1">
        <input className={inputBase} placeholder="Designação receita" {...campo('receita_designacao')} />
      </td>
      <td className="p-1">
        <input className={`${inputBase} text-right`} {...campoValor('receita_valor')} />
      </td>
      <td className="p-1 text-center">
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

function SeccaoEditor({ seccao, plano, linhas, colunaValor, onSavePrevisao, onAdicionar, onSave, onRemover }) {
  const [previsaoLocal, setPrevisaoLocal] = useState(getPrevisaoSecao(plano, seccao))
  const totais = totaisSeccao(linhas)

  useEffect(() => {
    setPrevisaoLocal(getPrevisaoSecao(plano, seccao))
  }, [plano, seccao])

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-medium text-[#111827]">{seccao}</h3>
        <button
          type="button"
          onClick={() => onAdicionar(seccao)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-1 text-[13px] text-[#1F6FEB] hover:bg-[#EFF6FF]"
        >
          <Plus className="h-3.5 w-3.5" />
          Atividade
        </button>
      </div>

      <label className="mb-4 block">
        <span className="mb-1 block text-[12px] font-medium text-[#6B7280]">
          Atividades previstas nesta secção
        </span>
        <span className="mb-2 block text-[11px] text-[#9CA3AF]">
          Uma linha por atividade. Podes usar ∙ no início (opcional).
        </span>
        <textarea
          rows={4}
          value={previsaoLocal}
          onChange={(e) => setPrevisaoLocal(e.target.value)}
          onBlur={() => onSavePrevisao(seccao, previsaoLocal)}
          placeholder={'∙ Gala de Informática\n∙ Churrascadas do Núcleo\n∙ ...'}
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
        />
      </label>

      <h4 className="mb-2 text-[13px] font-medium text-[#374151]">{tituloOrcamentoSecao(seccao)}</h4>

      {linhas.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] text-[#6B7280]">
                <th className="p-1 font-medium" rowSpan={2}>
                  Designação da atividade
                </th>
                <th className="p-1 font-medium" rowSpan={2}>
                  Data de realização
                </th>
                <th className="p-1 text-center font-medium" colSpan={2}>
                  Despesas
                </th>
                <th className="p-1 text-center font-medium" colSpan={2}>
                  Receitas
                </th>
                <th className="p-1" rowSpan={2} />
              </tr>
              <tr className="text-left text-[11px] text-[#6B7280]">
                <th className="p-1 font-medium">Designação</th>
                <th className="p-1 font-medium text-right">{colunaValor}</th>
                <th className="p-1 font-medium">Designação</th>
                <th className="p-1 font-medium text-right">{colunaValor}</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <LinhaEditor
                  key={linha.id}
                  linha={linha}
                  onSave={onSave}
                  onRemover={onRemover}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#E5E7EB] text-[13px] font-medium text-[#111827]">
                <td className="p-1" colSpan={2}>
                  Total
                </td>
                <td className="p-1" />
                <td className="p-1 text-right">{eur(totais.despesas)}</td>
                <td className="p-1" />
                <td className="p-1 text-right">{eur(totais.receitas)}</td>
                <td className="p-1" />
              </tr>
              <tr className="text-[13px]">
                <td className="p-1 font-medium" colSpan={2}>
                  Balanço final
                </td>
                <td className="p-1 text-right font-medium" colSpan={4}>
                  <span className={totais.balanco < 0 ? 'text-[#DC2626]' : 'text-[#059669]'}>
                    {eur(totais.balanco)}
                  </span>
                </td>
                <td className="p-1" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[#E5E7EB] px-3 py-4 text-[13px] text-[#9CA3AF]">
          Sem linhas de orçamento. Adiciona atividades com despesas e receitas estimadas.
        </p>
      )}
    </div>
  )
}

function PlanoEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { planos } = usePlanos()
  const {
    plano,
    linhas,
    paoReferencia,
    loading,
    error,
    guardarCabecalho,
    guardarPrevisaoSecao,
    guardarPaoReferencia,
    guardarMandato,
    adicionarSeccao,
    renomearSeccao,
    removerSeccao,
    adicionarLinha,
    atualizarLinha,
    removerLinha,
    importarLinhas,
  } = usePlanoEditor(id)
  const {
    movimentos: movimentosMandato,
    resumo: resumoMandato,
    loading: loadingMovimentos,
    error: erroMovimentos,
  } = useMovimentosMandato(plano?.mandato_inicio, plano?.mandato_fim)

  const [cabecalho, setCabecalho] = useState({ titulo: '', introducao: '', nota_final: '' })
  const [mandatoInicio, setMandatoInicio] = useState('')
  const [mandatoFim, setMandatoFim] = useState('')
  const [mostrarImportar, setMostrarImportar] = useState(false)

  useEffect(() => {
    if (plano) {
      setCabecalho({
        titulo: plano.titulo || '',
        introducao: plano.introducao || '',
        nota_final: plano.nota_final || '',
      })
      setMandatoInicio(dateToMonthInput(plano.mandato_inicio))
      setMandatoFim(dateToMonthInput(plano.mandato_fim))
    }
  }, [plano])

  if (loading) {
    return <div className="p-8 text-[14px] text-[#6B7280]">A carregar...</div>
  }

  if (error || !plano) {
    return (
      <div className="p-8">
        <p className="text-[14px] text-[#DC2626]">{error || 'Documento não encontrado.'}</p>
        <button
          type="button"
          onClick={() => navigate(plano.tipo === 'relatorio' ? '/planos?tab=relatorio' : '/planos')}
          className="mt-4 text-[14px] text-[#1F6FEB] hover:underline"
        >
          Voltar
        </button>
      </div>
    )
  }

  const config = TIPOS_PLANO[plano.tipo] || TIPOS_PLANO.pao
  const isRelatorio = plano.tipo === 'relatorio'
  const colunaValor = config.colunaValor
  const seccoes = getSeccoesDoPlano(plano)
  const grupos = agruparPorSeccao(linhas, seccoes)
  const globais = totaisGlobais(linhas)
  const paosDisponiveis = planos.filter((p) => p.tipo === 'pao')

  function persistirCabecalho(campo) {
    if (cabecalho[campo] !== (plano[campo] || '')) {
      guardarCabecalho({ [campo]: cabecalho[campo] })
    }
  }

  function persistirMandato() {
    const inicioActual = dateToMonthInput(plano.mandato_inicio)
    const fimActual = dateToMonthInput(plano.mandato_fim)
    if (mandatoInicio !== inicioActual || mandatoFim !== fimActual) {
      guardarMandato(mandatoInicio, mandatoFim)
    }
  }

  async function handleRemoverSeccao(nome) {
    if (!window.confirm(`Remover a secção "${nome}"? As linhas de orçamento desta secção serão apagadas.`)) {
      return
    }
    await removerSeccao(nome)
  }

  function labelPlano(p) {
    const mandato = formatMandatoLabel(p.mandato_inicio, p.mandato_fim)
    return mandato !== 'Mandato não definido' ? `${p.titulo} (${mandato})` : p.titulo
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(plano.tipo === 'relatorio' ? '/planos?tab=relatorio' : '/planos')}
          className="flex items-center gap-2 text-[14px] text-[#6B7280] hover:text-[#111827]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <button
          type="button"
          onClick={() => navigate(`/planos/${id}/imprimir`)}
          className="flex items-center gap-2 rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white hover:bg-[#1557C0]"
        >
          <Printer className="h-4 w-4" />
          Pré-visualizar / Imprimir
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
        <span className="text-[12px] font-medium uppercase tracking-wide text-[#1F6FEB]">
          {config.label}
        </span>
        <input
          value={cabecalho.titulo}
          onChange={(e) => setCabecalho((p) => ({ ...p, titulo: e.target.value }))}
          onBlur={() => persistirCabecalho('titulo')}
          className="mt-2 w-full border-0 border-b border-transparent text-[22px] font-medium text-[#111827] focus:border-[#1F6FEB] focus:outline-none"
        />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] text-[#6B7280]">Início do mandato</span>
            <input
              type="month"
              value={mandatoInicio}
              onChange={(e) => setMandatoInicio(e.target.value)}
              onBlur={persistirMandato}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] text-[#6B7280]">Fim do mandato</span>
            <input
              type="month"
              value={mandatoFim}
              onChange={(e) => setMandatoFim(e.target.value)}
              onBlur={persistirMandato}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-[13px] text-[#6B7280]">Introdução</span>
          <textarea
            rows={4}
            value={cabecalho.introducao}
            onChange={(e) => setCabecalho((p) => ({ ...p, introducao: e.target.value }))}
            onBlur={() => persistirCabecalho('introducao')}
            placeholder="História do núcleo, objetivos do mandato, órgãos sociais..."
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
          />
        </label>

        {isRelatorio ? (
          <label className="mt-4 block">
            <span className="mb-1 block text-[13px] text-[#6B7280]">PAO de referência (valores previstos)</span>
            <select
              value={plano.pao_referencia_id || ''}
              onChange={(e) => guardarPaoReferencia(e.target.value || null)}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            >
              <option value="">Sem PAO ligado</option>
              {paosDisponiveis.map((pao) => (
                <option key={pao.id} value={pao.id}>
                  {labelPlano(pao)}
                </option>
              ))}
            </select>
            {paoReferencia ? (
              <p className="mt-1 text-[12px] text-[#6B7280]">
                No impresso aparece primeiro o orçamento global previsto deste PAO.
              </p>
            ) : null}
          </label>
        ) : null}
      </div>

      {isRelatorio ? (
        <div className="mb-6 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-[14px] font-medium text-[#1E40AF]">
                Movimentos da tesouraria no mandato
              </h3>
              <p className="mt-1 text-[13px] text-[#1E40AF]">
                {formatMandatoLabel(plano.mandato_inicio, plano.mandato_fim)} ·{' '}
                {resumoMandato.total} movimento(s) registado(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarImportar(true)}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-[#1F6FEB] px-4 py-2 text-[13px] text-white hover:bg-[#1557C0]"
            >
              <Download className="h-4 w-4" />
              Importar movimentos
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-white p-3">
              <p className="text-[12px] text-[#6B7280]">Receitas</p>
              <p className="text-[16px] font-medium text-[#059669]">{eur(resumoMandato.receitas)}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-[12px] text-[#6B7280]">Despesas</p>
              <p className="text-[16px] font-medium text-[#DC2626]">{eur(resumoMandato.despesas)}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-[12px] text-[#6B7280]">Balanço</p>
              <p className="text-[16px] font-medium text-[#111827]">{eur(resumoMandato.balanco)}</p>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-[#1E40AF]">
            Importa movimentos para criar linhas no relatório. Depois podes agrupar por atividade,
            mudar de secção ou ajustar valores manualmente.
          </p>
        </div>
      ) : null}

      <ImportarMovimentosModal
        aberto={isRelatorio && mostrarImportar}
        onFechar={() => setMostrarImportar(false)}
        movimentos={movimentosMandato}
        loading={loadingMovimentos}
        error={erroMovimentos}
        seccoes={seccoes}
        linhasExistentes={linhas}
        onImportar={importarLinhas}
      />

      <GestorSeccoes
        seccoes={seccoes}
        onAdicionar={adicionarSeccao}
        onRenomear={renomearSeccao}
        onRemover={handleRemoverSeccao}
      />

      <div className="space-y-4">
        {seccoes.map((seccao) => (
          <SeccaoEditor
            key={seccao}
            seccao={seccao}
            plano={plano}
            linhas={grupos.get(seccao) || []}
            colunaValor={colunaValor}
            onSavePrevisao={guardarPrevisaoSecao}
            onAdicionar={adicionarLinha}
            onSave={atualizarLinha}
            onRemover={removerLinha}
          />
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white p-4">
        <TabelaOrcamentoGlobal
          seccoes={seccoes}
          grupos={grupos}
          titulo={
            isRelatorio
              ? 'Orçamento Global Real das Atividades do Núcleo'
              : 'Orçamento Global das Atividades do Núcleo'
          }
        />
        {!globais.despesas && !globais.receitas ? (
          <p className="mt-2 text-center text-[13px] text-[#9CA3AF]">
            Preenche as secções acima para ver o resumo global.
          </p>
        ) : null}
      </div>

      {isRelatorio ? (
        <div className="mt-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
          <label className="block">
            <span className="mb-1 block text-[13px] text-[#6B7280]">
              Resumo das atividades realizadas / nota final
            </span>
            <textarea
              rows={6}
              value={cabecalho.nota_final}
              onChange={(e) => setCabecalho((p) => ({ ...p, nota_final: e.target.value }))}
              onBlur={() => persistirCabecalho('nota_final')}
              placeholder="Descreve as atividades realizadas e conclusões do mandato..."
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export default PlanoEditorPage
