import { useState } from 'react'
import {
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  PlayCircle,
  Settings,
} from 'lucide-react'

/**
 * URLs dos vídeos por secção (YouTube, Loom, etc.).
 * Grava um vídeo curto (~2–4 min) por tema quando a app estiver finalizada.
 * Deixa vazio enquanto não houver gravação — o texto do guia fica visível na mesma.
 */
const VIDEOS_AJUDA = {
  perfil: 'https://youtu.be/PCmuoPIKXJE',
  dashboard: 'https://youtu.be/v99itISX_Zg',
  movimentos: 'https://youtu.be/7Fq7Qjxiu4o',
  documentos: 'https://youtu.be/7Eu1bGOajsc',
  fecho: 'https://youtu.be/82t1wQPMGso',
  eventos: 'https://youtu.be/egU1IcDt_I4',
  pao: 'https://youtu.be/VnrkGCUVOW0',
  rac: 'https://youtu.be/wYWoL6v1brQ',
}

const primeirosPassos = [
  'Configura o perfil do núcleo (nome, tesoureiro, saldos iniciais).',
  'Regista os movimentos do mês na Folha de Caixa e/ou Folha Bancária.',
  'Anexa faturas, ofícios e comprovativos a cada movimento.',
  'No fim do mês, faz o Fecho Mensal e entrega à contabilidade.',
]

const guias = [
  {
    id: 'perfil',
    icon: Settings,
    titulo: 'Perfil e configuração inicial',
    resumo: 'Primeiro passo obrigatório antes de usar a aplicação.',
    passos: [
      'No primeiro acesso és redirecionado para o Perfil. Preenche o nome do núcleo, associação académica, tesoureiro e presidente.',
      'Indica se o núcleo tem conta bancária. Se sim, define os saldos iniciais de caixa e banco e a data de referência desses saldos.',
      'A partir da data de referência, os saldos passam a ser calculados automaticamente com base nos movimentos registados.',
      'Podes alterar estes dados a qualquer momento em Perfil, no menu lateral.',
    ],
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    titulo: 'Dashboard',
    resumo: 'Visão geral rápida da situação financeira do núcleo.',
    passos: [
      'Mostra os saldos atuais de caixa, banco e total.',
      'Apresenta receitas e despesas do mês corrente, com gráfico da evolução dos últimos meses.',
      'Lista os movimentos mais recentes para consulta rápida.',
      'Se o mês anterior ainda não foi fechado, aparece um aviso com ligação directa ao Fecho Mensal.',
    ],
  },
  {
    id: 'movimentos',
    icon: FileText,
    titulo: 'Folha de Caixa e Folha Bancária',
    resumo: 'Onde registas todas as entradas e saídas de dinheiro.',
    passos: [
      'Usa a Folha de Caixa para movimentos em numerário e a Folha Bancária para transferências, MB Way, etc.',
      'Clica em adicionar movimento, escolhe recebimento ou pagamento, e preenche data, valor, descrição e n.º do documento.',
      'Anexa sempre a fatura ou ofício. Nos movimentos de banco, anexa também o comprovativo bancário.',
      'O saldo acumulado é calculado linha a linha. Podes editar ou apagar movimentos enquanto o mês estiver aberto.',
      'Usa o selector de mês no topo para consultar ou imprimir folhas de meses anteriores.',
    ],
  },
  {
    id: 'documentos',
    icon: FolderOpen,
    titulo: 'Documentos',
    resumo: 'Arquivo de faturas, ofícios, extratos e modelos.',
    passos: [
      'Carrega ficheiros manualmente (faturas, ofícios, extratos, erratas) ou associa-os directamente ao registar um movimento.',
      'Filtra por mês e por tipo de documento para encontrar o que precisas.',
      'Usa os modelos de ofício e errata para gerar documentos já formatados com os dados do núcleo.',
      'Podes associar cada documento a um movimento específico, para manter tudo organizado.',
    ],
  },
  {
    id: 'fecho',
    icon: CheckSquare,
    titulo: 'Fecho Mensal',
    resumo: 'Validação e entrega do mês à contabilidade.',
    passos: [
      'Abre o Fecho Mensal do mês que queres entregar.',
      'A aplicação mostra uma checklist automática: movimentos registados, documentos em todos os movimentos, comprovativos nos movimentos de banco e extrato bancário carregado.',
      'Carrega o extrato bancário do mês na área indicada.',
      'Confere que o saldo final da folha coincide com o saldo real da conta antes de fechar.',
      'Quando todos os itens estiverem validados, o mês fica pronto para entrega em papel ou digital.',
    ],
  },
  {
    id: 'eventos',
    icon: Calendar,
    titulo: 'Orçamento de Eventos',
    resumo: 'Planear despesas e receitas estimadas de cada evento.',
    passos: [
      'Cria um evento (ex.: Gala, Churrasco) com nome e data prevista.',
      'Adiciona linhas de despesas e receitas estimadas, com valores previstos e observações.',
      'Durante o evento, podes atualizar os valores reais para comparar com o orçamento.',
      'Útil para planear actividades antes de as registar na tesouraria.',
    ],
  },
  {
    id: 'pao',
    icon: ClipboardList,
    titulo: 'PAO — Plano de Atividades e Orçamento',
    resumo: 'Documento formal de previsão no início do mandato.',
    passos: [
      'Em PAO e Relatório, abre o separador PAO e cria um novo documento.',
      'Define o início e fim do mandato (ex.: Dezembro 2025 a Dezembro 2026) — não precisas de indicar o dia.',
      'Personaliza as secções do documento (Direção, Secção Pedagógica, etc.) — podes renomear, remover ou adicionar novas.',
      'Em cada secção, escreve as atividades previstas e preenche o orçamento estimado (despesas e receitas por atividade).',
      'Usa Pré-visualizar / Imprimir para gerar o PDF formal.',
    ],
  },
  {
    id: 'rac',
    icon: Building2,
    titulo: 'RAC — Relatório Anual de Contas',
    resumo: 'Contas reais do mandato, com apoio dos movimentos registados.',
    passos: [
      'No separador Relatório Anual de Contas, cria um documento para o mesmo mandato do PAO.',
      'Liga o PAO de referência para comparar valores previstos com os reais no impresso.',
      'Clica em Importar movimentos para trazer automaticamente entradas e saídas da tesouraria — filtra por mês, tipo ou conta, escolhe a secção e importa.',
      'Depois de importar, podes agrupar, renomear actividades ou ajustar valores manualmente.',
      'No fim, preenche a nota final com o resumo das actividades realizadas e imprime.',
    ],
  },
].map((guia) => ({ ...guia, videoUrl: VIDEOS_AJUDA[guia.id] || '' }))

const boasPraticas = [
  {
    titulo: 'Prazos',
    texto: 'Entrega a contabilidade até ao dia 10 do mês seguinte. Usa o aviso no Dashboard para não te esqueceres do fecho do mês anterior.',
  },
  {
    titulo: 'Documentos no momento',
    texto: 'Anexa fatura e comprovativo quando registas o movimento — é muito mais fácil do que procurar ficheiros depois.',
  },
  {
    titulo: 'Descrições claras',
    texto: 'Escreve descrições que qualquer pessoa perceba (ex.: "Quotas janeiro — João Silva" em vez de "transferência"). Facilita a transição para o próximo tesoureiro.',
  },
  {
    titulo: 'Conferir saldos',
    texto: 'Antes de fechar o mês, compara o saldo da folha com o saldo real da conta bancária e do dinheiro em caixa.',
  },
  {
    titulo: 'Corrigir erros',
    texto: 'Se já entregaste um documento com erro, usa o modelo de errata na área de Documentos.',
  },
  {
    titulo: 'PAO e RAC',
    texto: 'Elabora o PAO no início do mandato (previsão) e o Relatório Anual no fim (valores reais). Importa os movimentos da tesouraria para poupar tempo no RAC.',
  },
  {
    titulo: 'Meses fechados',
    texto: 'Não podes alterar movimentos de meses já fechados. Se precisares de corrigir algo, fala com a contabilidade ou regista uma errata.',
  },
]

function youtubeEmbedUrl(url) {
  if (url.includes('watch?v=')) return url.replace('watch?v=', 'embed/')
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/')
  if (url.includes('youtube.com/embed/')) return url
  return url
}

function VideoSecao({ titulo, videoUrl }) {
  if (videoUrl) {
    const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')

    if (isYoutube) {
      return (
        <div className="mb-4 w-full max-w-sm sm:max-w-md">
          <div className="aspect-video overflow-hidden rounded-lg border border-[#E5E7EB] bg-black">
            <iframe
              src={youtubeEmbedUrl(videoUrl)}
              title={`Vídeo — ${titulo}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[#1F6FEB] hover:underline"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Abrir em ecrã completo no YouTube
          </a>
        </div>
      )
    }

    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#EFF6FF] p-3 hover:border-[#1F6FEB]"
      >
        <PlayCircle className="h-6 w-6 shrink-0 text-[#1F6FEB]" />
        <span className="text-[13px] text-[#1F6FEB]">Ver vídeo desta secção</span>
      </a>
    )
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
      <PlayCircle className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
      <p className="text-[12px] text-[#6B7280]">
        Vídeo desta secção em breve — quando a aplicação estiver finalizada.
      </p>
    </div>
  )
}

function AjudaPage() {
  const [aberto, setAberto] = useState('perfil')
  const videosDisponiveis = guias.filter((g) => g.videoUrl).length

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF]">
            <HelpCircle className="h-5 w-5 text-[#1F6FEB]" />
          </span>
          <div>
            <h1 className="text-[24px] font-medium text-[#111827]">Ajuda</h1>
            <p className="text-[14px] text-[#6B7280]">
              Como usar a aplicação e boas práticas de tesouraria estudantil
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-[#E5E7EB] bg-white p-6">
        <h2 className="text-[16px] font-medium text-[#111827]">Por onde começar</h2>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          Se estás a ver a aplicação pela primeira vez, segue estes passos por ordem.
          {videosDisponiveis ? (
            <> Cada secção abaixo tem um vídeo curto só sobre esse tema.</>
          ) : (
            <>
              {' '}
              Quando a aplicação estiver pronta, cada secção terá o seu próprio vídeo curto — mais
              fácil de consultar do que um vídeo longo.
            </>
          )}
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] text-[#374151]">
          {primeirosPassos.map((passo, idx) => (
            <li key={idx}>{passo}</li>
          ))}
        </ol>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-[16px] font-medium text-[#111827]">Guia por secção</h2>
        <div className="space-y-3">
          {guias.map((item) => {
            const Icon = item.icon
            const isOpen = aberto === item.id
            const temVideo = Boolean(item.videoUrl)
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white"
              >
                <button
                  type="button"
                  onClick={() => setAberto(isOpen ? '' : item.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#F9FAFB]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0 text-[#1F6FEB]" />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-medium text-[#111827]">{item.titulo}</span>
                        {temVideo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-medium text-[#059669]">
                            <PlayCircle className="h-3 w-3" />
                            Vídeo
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[12px] text-[#6B7280]">{item.resumo}</span>
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#9CA3AF] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen ? (
                  <div className="border-t border-[#E5E7EB] px-4 py-4">
                    <VideoSecao titulo={item.titulo} videoUrl={item.videoUrl} />
                    <ol className="list-decimal space-y-2 pl-5 text-[14px] text-[#374151]">
                      {item.passos.map((passo, idx) => (
                        <li key={idx}>{passo}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[#F59E0B]" />
          <h2 className="text-[16px] font-medium text-[#111827]">Boas práticas de tesouraria</h2>
        </div>
        <ul className="space-y-4">
          {boasPraticas.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1F6FEB]" />
              <span className="text-[14px] text-[#374151]">
                <strong className="font-medium text-[#111827]">{item.titulo}.</strong>{' '}
                {item.texto}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default AjudaPage
