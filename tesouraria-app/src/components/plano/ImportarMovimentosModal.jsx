import { useEffect, useMemo, useState } from 'react'
import { Download, Search, X } from 'lucide-react'
import { formatDatePt, formatEur } from '../../lib/folhaMensal'
import { formatMonthLabel } from '../../lib/monthRef'
import {
  computeMovimentosImportadosIds,
  filtrarMovimentos,
  mesesDosMovimentos,
  movimentosParaLinhas,
} from '../../lib/racImport'

function ImportarMovimentosModal({
  aberto,
  onFechar,
  movimentos,
  loading,
  error,
  seccoes,
  linhasExistentes,
  onImportar,
}) {
  const [seccaoAlvo, setSeccaoAlvo] = useState(seccoes[0] || '')
  const [pesquisa, setPesquisa] = useState('')
  const [filtroNatureza, setFiltroNatureza] = useState('todos')
  const [filtroConta, setFiltroConta] = useState('todos')
  const [filtroMes, setFiltroMes] = useState('todos')
  const [ocultarImportados, setOcultarImportados] = useState(false)
  const [agrupar, setAgrupar] = useState(false)
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [importando, setImportando] = useState(false)

  const mesesDisponiveis = useMemo(() => mesesDosMovimentos(movimentos), [movimentos])

  useEffect(() => {
    if (seccoes.length && !seccoes.includes(seccaoAlvo)) {
      setSeccaoAlvo(seccoes[0])
    }
  }, [seccoes, seccaoAlvo])

  useEffect(() => {
    if (!aberto) {
      setSelecionados(new Set())
      setPesquisa('')
      setFiltroNatureza('todos')
      setFiltroConta('todos')
      setFiltroMes('todos')
      setOcultarImportados(false)
      setAgrupar(false)
    }
  }, [aberto])

  const filtrosActivos =
    pesquisa.trim() ||
    filtroNatureza !== 'todos' ||
    filtroConta !== 'todos' ||
    filtroMes !== 'todos' ||
    ocultarImportados

  const movimentosVisiveis = useMemo(
    () =>
      filtrarMovimentos(
        movimentos,
        {
          pesquisa,
          natureza: filtroNatureza,
          conta: filtroConta,
          mes: filtroMes,
          ocultarImportados,
        },
        linhasExistentes,
      ),
    [
      movimentos,
      pesquisa,
      filtroNatureza,
      filtroConta,
      filtroMes,
      ocultarImportados,
      linhasExistentes,
    ],
  )

  const idsVisiveis = useMemo(
    () => new Set(movimentosVisiveis.map((m) => m.id)),
    [movimentosVisiveis],
  )

  const selecionadosVisiveis = useMemo(
    () => [...selecionados].filter((id) => idsVisiveis.has(id)),
    [selecionados, idsVisiveis],
  )

  const importadosIds = useMemo(
    () => computeMovimentosImportadosIds(movimentos, linhasExistentes),
    [movimentos, linhasExistentes],
  )

  const importadosVisiveis = useMemo(
    () => movimentosVisiveis.filter((m) => importadosIds.has(m.id)).length,
    [movimentosVisiveis, importadosIds],
  )

  function toggle(id) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selecionarTodosVisiveis() {
    setSelecionados((prev) => {
      const next = new Set(prev)
      for (const m of movimentosVisiveis) next.add(m.id)
      return next
    })
  }

  function limparSelecao() {
    setSelecionados(new Set())
  }

  function limparFiltros() {
    setPesquisa('')
    setFiltroNatureza('todos')
    setFiltroConta('todos')
    setFiltroMes('todos')
    setOcultarImportados(false)
  }

  async function handleImportar() {
    const escolhidos = movimentos.filter((m) => selecionados.has(m.id))
    if (!escolhidos.length || !seccaoAlvo) return

    setImportando(true)
    try {
      const drafts = movimentosParaLinhas(escolhidos, seccaoAlvo, { agrupar })
      await onImportar(drafts)
      onFechar()
    } finally {
      setImportando(false)
    }
  }

  if (!aberto) return null

  const totalMandato = movimentos?.length || 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[#E5E7EB] px-5 py-4">
          <div>
            <h2 className="text-[17px] font-medium text-[#111827]">Importar movimentos</h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              {totalMandato} movimento(s) no mandato · {movimentosVisiveis.length} visível(is)
              {importadosVisiveis > 0
                ? ` · ${importadosVisiveis} já importado${importadosVisiveis === 1 ? '' : 's'}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
            <p className="mb-3 text-[12px] font-medium text-[#374151]">Filtros</p>

            <label className="relative mb-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="search"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Pesquisar descrição, n.º documento ou valor..."
                className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#6B7280]">Tipo</span>
                <select
                  value={filtroNatureza}
                  onChange={(e) => setFiltroNatureza(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
                >
                  <option value="todos">Todos</option>
                  <option value="receitas">Só receitas</option>
                  <option value="despesas">Só despesas</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] text-[#6B7280]">Conta</span>
                <select
                  value={filtroConta}
                  onChange={(e) => setFiltroConta(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
                >
                  <option value="todos">Todas</option>
                  <option value="caixa">Caixa</option>
                  <option value="banco">Banco</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] text-[#6B7280]">Mês</span>
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
                >
                  <option value="todos">Todos os meses</option>
                  {mesesDisponiveis.map((ref) => (
                    <option key={ref} value={ref}>
                      {formatMonthLabel(ref, { long: true })}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-end gap-2">
                <input
                  type="checkbox"
                  checked={ocultarImportados}
                  onChange={(e) => setOcultarImportados(e.target.checked)}
                  className="rounded border-[#D1D5DB]"
                />
                <span className="pb-2 text-[13px] text-[#374151]">Ocultar já importados</span>
              </label>
            </div>

            {filtrosActivos ? (
              <button
                type="button"
                onClick={limparFiltros}
                className="mt-3 text-[12px] text-[#1F6FEB] hover:underline"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#6B7280]">Secção de destino</span>
              <select
                value={seccaoAlvo}
                onChange={(e) => setSeccaoAlvo(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              >
                {seccoes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-end gap-2">
              <input
                type="checkbox"
                checked={agrupar}
                onChange={(e) => setAgrupar(e.target.checked)}
                className="rounded border-[#D1D5DB]"
              />
              <span className="pb-2 text-[13px] text-[#374151]">
                Agrupar descrições iguais numa linha
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selecionarTodosVisiveis}
              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[12px] text-[#374151] hover:bg-[#F9FAFB]"
            >
              Selecionar visíveis ({movimentosVisiveis.length})
            </button>
            <button
              type="button"
              onClick={limparSelecao}
              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[12px] text-[#374151] hover:bg-[#F9FAFB]"
            >
              Limpar seleção
            </button>
            <span className="text-[12px] text-[#6B7280]">
              {selecionadosVisiveis.length} selecionado(s)
            </span>
          </div>

          {error ? (
            <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#DC2626]">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="text-[13px] text-[#6B7280]">A carregar movimentos...</p>
          ) : movimentosVisiveis.length ? (
            <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
              <div className="max-h-[340px] overflow-y-auto">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-[#F9FAFB] text-left text-[11px] text-[#6B7280]">
                    <tr>
                      <th className="w-10 p-2" />
                      <th className="p-2 font-medium">Data</th>
                      <th className="p-2 font-medium">Descrição</th>
                      <th className="p-2 font-medium">Conta</th>
                      <th className="p-2 font-medium">Tipo</th>
                      <th className="p-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentosVisiveis.map((m) => {
                      const importado = importadosIds.has(m.id)
                      const isReceita = m.natureza === 'recebimento'
                      return (
                        <tr
                          key={m.id}
                          className={
                            importado
                              ? 'border-t border-[#D6D3D1] bg-[#E7E5E4] text-[#57534E]'
                              : 'border-t border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]'
                          }
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={selecionados.has(m.id)}
                              onChange={() => toggle(m.id)}
                              className="rounded border-[#D1D5DB]"
                            />
                          </td>
                          <td
                            className={`whitespace-nowrap p-2 ${
                              importado ? 'text-[#78716C]' : 'text-[#374151]'
                            }`}
                          >
                            {formatDatePt(m.data)}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={
                                  importado ? 'text-[#57534E] line-through decoration-[#A8A29E]' : 'text-[#111827]'
                                }
                              >
                                {m.descricao || '—'}
                              </span>
                              {importado ? (
                                <span className="inline-flex shrink-0 items-center rounded-md bg-[#57534E] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FAFAF9]">
                                  Já importado
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td
                            className={`p-2 capitalize ${
                              importado ? 'text-[#78716C]' : 'text-[#6B7280]'
                            }`}
                          >
                            {m.tipo_conta}
                          </td>
                          <td className="p-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] ${
                                importado
                                  ? 'bg-[#D6D3D1] text-[#57534E]'
                                  : isReceita
                                    ? 'bg-[#DCFCE7] text-[#059669]'
                                    : 'bg-[#FEE2E2] text-[#DC2626]'
                              }`}
                            >
                              {isReceita ? 'Receita' : 'Despesa'}
                            </span>
                          </td>
                          <td
                            className={`p-2 text-right font-medium ${
                              importado
                                ? 'text-[#78716C]'
                                : isReceita
                                  ? 'text-[#059669]'
                                  : 'text-[#DC2626]'
                            }`}
                          >
                            {formatEur(m.valor)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[#E5E7EB] px-4 py-8 text-center text-[13px] text-[#9CA3AF]">
              {totalMandato
                ? 'Nenhum movimento corresponde aos filtros. Tenta alargar a pesquisa.'
                : 'Não há movimentos no período deste mandato.'}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E5E7EB] px-5 py-4">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-[14px] text-[#111827] hover:bg-[#F9FAFB]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImportar}
            disabled={importando || !selecionadosVisiveis.length || !seccaoAlvo}
            className="flex items-center gap-2 rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] text-white hover:bg-[#1557C0] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {importando
              ? 'A importar...'
              : `Importar ${selecionadosVisiveis.length} movimento(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportarMovimentosModal
