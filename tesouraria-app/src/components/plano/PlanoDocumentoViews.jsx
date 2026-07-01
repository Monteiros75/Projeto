import { totaisGlobais, totaisSeccao } from '../../lib/planoCalculos'
import { getPrevisaoSecao, parsePrevisaoLinhas, tituloOrcamentoSecao } from '../../lib/planoDocumento'

function eur(value) {
  return Number(value || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  })
}

export function PrevisaoAtividades({ plano, seccao, className = '' }) {
  const linhas = parsePrevisaoLinhas(getPrevisaoSecao(plano, seccao))
  if (!linhas.length) return null

  return (
    <ul className={`mb-3 list-none space-y-0.5 text-[13px] leading-relaxed text-gray-800 ${className}`}>
      {linhas.map((linha, index) => {
        const texto = linha.replace(/^[-*•∙]\s*/, '')
        return (
          <li key={`${seccao}-${index}`} className="flex gap-2">
            <span className="shrink-0">∙</span>
            <span>{texto}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function TabelaOrcamentoSeccao({ seccao, linhas, colunaValor = 'Valor' }) {
  const totais = totaisSeccao(linhas)

  return (
    <div className="mb-6 break-inside-avoid">
      <h4 className="mb-2 text-[14px] font-semibold text-black">{tituloOrcamentoSecao(seccao)}</h4>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-gray-100 text-center text-[11px]">
            <th className="border border-gray-400 p-1.5" rowSpan={2}>
              Designação da Atividade
            </th>
            <th className="border border-gray-400 p-1.5" rowSpan={2}>
              Data de Realização
            </th>
            <th className="border border-gray-400 p-1.5" colSpan={2}>
              Despesas
            </th>
            <th className="border border-gray-400 p-1.5" colSpan={2}>
              Receitas
            </th>
          </tr>
          <tr className="bg-gray-100 text-center text-[11px]">
            <th className="border border-gray-400 p-1.5">Designação</th>
            <th className="border border-gray-400 p-1.5">{colunaValor}</th>
            <th className="border border-gray-400 p-1.5">Designação</th>
            <th className="border border-gray-400 p-1.5">{colunaValor}</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.id}>
              <td className="border border-gray-400 p-1.5 align-top">{linha.designacao}</td>
              <td className="border border-gray-400 p-1.5 align-top whitespace-pre-line">
                {linha.data_realizacao}
              </td>
              <td className="border border-gray-400 p-1.5 align-top">{linha.despesa_designacao}</td>
              <td className="border border-gray-400 p-1.5 align-top text-right whitespace-nowrap">
                {linha.despesa_valor ? eur(linha.despesa_valor) : ''}
              </td>
              <td className="border border-gray-400 p-1.5 align-top">{linha.receita_designacao}</td>
              <td className="border border-gray-400 p-1.5 align-top text-right whitespace-nowrap">
                {linha.receita_valor ? eur(linha.receita_valor) : ''}
              </td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="border border-gray-400 p-1.5" colSpan={2}>
              Total
            </td>
            <td className="border border-gray-400 p-1.5" />
            <td className="border border-gray-400 p-1.5 text-right">{eur(totais.despesas)}</td>
            <td className="border border-gray-400 p-1.5" />
            <td className="border border-gray-400 p-1.5 text-right">{eur(totais.receitas)}</td>
          </tr>
          <tr className="font-semibold">
            <td className="border border-gray-400 p-1.5" colSpan={2}>
              Balanço Final
            </td>
            <td className="border border-gray-400 p-1.5 text-right" colSpan={4}>
              {eur(totais.balanco)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function TabelaOrcamentoGlobal({ seccoes, grupos, titulo = 'Orçamento Global das Atividades do Núcleo' }) {
  const seccoesComDados = seccoes.filter((seccao) => (grupos.get(seccao) || []).length)
  const globais = totaisGlobais([...grupos.values()].flat())

  if (!seccoesComDados.length) return null

  return (
    <section className="mb-8 break-inside-avoid">
      <h2 className="mb-1 text-center text-lg font-semibold text-black">Orçamento Global</h2>
      <h3 className="mb-3 text-center text-[13px] font-medium text-gray-700">{titulo}</h3>
      <table className="mx-auto w-full max-w-[520px] border-collapse text-[12px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-1.5 text-left" colSpan={3}>
              Orçamento Global
            </th>
          </tr>
          <tr className="bg-gray-100 text-left">
            <th className="border border-gray-400 p-1.5">Secção</th>
            <th className="border border-gray-400 p-1.5 text-right">Valor das Despesas</th>
            <th className="border border-gray-400 p-1.5 text-right">Valor das Receitas</th>
          </tr>
        </thead>
        <tbody>
          {seccoesComDados.map((seccao) => {
            const t = totaisSeccao(grupos.get(seccao))
            return (
              <tr key={seccao}>
                <td className="border border-gray-400 p-1.5">{seccao}</td>
                <td className="border border-gray-400 p-1.5 text-right">{eur(t.despesas)}</td>
                <td className="border border-gray-400 p-1.5 text-right">{eur(t.receitas)}</td>
              </tr>
            )
          })}
          <tr className="font-semibold">
            <td className="border border-gray-400 p-1.5">Total</td>
            <td className="border border-gray-400 p-1.5 text-right">{eur(globais.despesas)}</td>
            <td className="border border-gray-400 p-1.5 text-right">{eur(globais.receitas)}</td>
          </tr>
          <tr className="font-semibold">
            <td className="border border-gray-400 p-1.5">Balanço Final</td>
            <td className="border border-gray-400 p-1.5 text-right" colSpan={2}>
              {eur(globais.balanco)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
