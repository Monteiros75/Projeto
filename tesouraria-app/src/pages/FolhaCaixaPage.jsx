import FolhaContaView from '../components/FolhaContaView'
import { useAuth } from '../hooks/useAuth'
import { nucleoTemContaBancaria } from '../lib/contaBancaria'

function FolhaCaixaPage() {
  const { nucleoProfile } = useAuth()
  const temContaBancaria = nucleoTemContaBancaria(nucleoProfile)

  return (
    <FolhaContaView
      tipoConta="caixa"
      titulo="Folha de Caixa"
      descricao="Registo e consulta dos movimentos de caixa do mês"
      linhaPrefixo="C"
      outraFolhaTo={temContaBancaria ? '/folha-bancaria' : undefined}
      outraFolhaLabel={temContaBancaria ? 'Ver folha bancária →' : undefined}
    />
  )
}

export default FolhaCaixaPage
