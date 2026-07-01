import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { usePlanoEditor } from '../hooks/usePlanoEditor'
import { useAuth } from '../hooks/useAuth'
import {
  PrevisaoAtividades,
  TabelaOrcamentoGlobal,
  TabelaOrcamentoSeccao,
} from '../components/plano/PlanoDocumentoViews'
import { formatMandatoLabel } from '../lib/mandatoFormat'
import { getSeccoesDoPlano, TIPOS_PLANO } from '../lib/seccoes'
import { agruparPorSeccao } from '../lib/planoCalculos'
import { seccaoTemConteudo } from '../lib/planoDocumento'

function PlanoPrintPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { plano, linhas, paoReferencia, linhasPaoReferencia, loading, error } = usePlanoEditor(id)
  const { nucleoProfile } = useAuth()

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">A carregar...</div>
  }
  if (error || !plano) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error || 'Documento não encontrado.'}</p>
        <button
          type="button"
          onClick={() => navigate('/planos')}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Voltar
        </button>
      </div>
    )
  }

  const config = TIPOS_PLANO[plano.tipo] || TIPOS_PLANO.pao
  const isRelatorio = plano.tipo === 'relatorio'
  const seccoes = getSeccoesDoPlano(plano)
  const seccoesPao = paoReferencia ? getSeccoesDoPlano(paoReferencia) : seccoes
  const grupos = agruparPorSeccao(linhas, seccoes)
  const gruposPao = agruparPorSeccao(linhasPaoReferencia, seccoesPao)
  const nomeNucleo = nucleoProfile?.nomeNucleo || 'Núcleo'
  const colunaValor = isRelatorio ? 'Valor real' : 'Valor'
  const mandatoLabel = formatMandatoLabel(plano.mandato_inicio, plano.mandato_fim)

  const seccoesVisiveis = seccoes.filter((seccao) =>
    seccaoTemConteudo(seccao, plano, grupos.get(seccao) || []),
  )

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="mx-auto max-w-[800px] p-4 print:hidden">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(`/planos/${id}`)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à edição
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[800px] bg-white p-10 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-8 border-b border-gray-300 pb-6 text-center">
          {nucleoProfile?.logoUrl ? (
            <div className="mb-4 flex justify-center print:mb-3">
              <img
                src={nucleoProfile.logoUrl}
                alt=""
                className="h-20 w-20 object-contain print:h-[72px] print:w-[72px]"
              />
            </div>
          ) : null}
          {nucleoProfile?.associacaoAcademica ? (
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-700">
              {nucleoProfile.associacaoAcademica}
            </p>
          ) : null}
          <p className="text-sm uppercase tracking-wide text-gray-500">{nomeNucleo}</p>
          <h1 className="mt-2 text-2xl font-bold text-black">{plano.titulo}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {config.label}
            {mandatoLabel !== 'Mandato não definido' ? ` · ${mandatoLabel}` : ''}
          </p>
        </header>

        {plano.introducao ? (
          <section className="mb-8">
            <h2 className="mb-2 text-lg font-semibold text-black">Introdução</h2>
            <p className="whitespace-pre-line text-justify text-[13px] leading-relaxed text-gray-800">
              {plano.introducao}
            </p>
          </section>
        ) : null}

        {isRelatorio && paoReferencia ? (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-black">
              Orçamento global previsto (início do mandato)
            </h2>
            <p className="mb-4 text-[12px] text-gray-600">
              Valores do {paoReferencia.titulo || 'PAO de referência'}.
            </p>
            <TabelaOrcamentoGlobal
              seccoes={seccoesPao}
              grupos={gruposPao}
              titulo="Orçamento Global Previsto das Atividades do Núcleo"
            />
          </section>
        ) : null}

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-black">
            {isRelatorio ? 'Receitas e despesas reais por secção' : 'Plano de Atividades e Orçamento'}
          </h2>

          {seccoesVisiveis.length ? (
            seccoesVisiveis.map((seccao) => {
              const linhasSeccao = grupos.get(seccao) || []
              return (
                <div key={seccao} className="mb-8 break-inside-avoid">
                  <h3 className="mb-2 text-[16px] font-semibold text-black">{seccao}</h3>
                  <PrevisaoAtividades plano={plano} seccao={seccao} />
                  {linhasSeccao.length ? (
                    <TabelaOrcamentoSeccao
                      seccao={seccao}
                      linhas={linhasSeccao}
                      colunaValor={colunaValor}
                    />
                  ) : null}
                </div>
              )
            })
          ) : (
            <p className="text-sm text-gray-500">Sem atividades registadas.</p>
          )}
        </section>

        <TabelaOrcamentoGlobal
          seccoes={seccoes}
          grupos={grupos}
          titulo={
            isRelatorio
              ? 'Orçamento Global Real das Atividades do Núcleo'
              : 'Orçamento Global das Atividades do Núcleo'
          }
        />

        {plano.nota_final ? (
          <section className="mt-8 break-inside-avoid">
            <h2 className="mb-2 text-lg font-semibold text-black">
              Resumo das Atividades Realizadas
            </h2>
            <p className="whitespace-pre-line text-justify text-[13px] leading-relaxed text-gray-800">
              {plano.nota_final}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  )
}

export default PlanoPrintPage
