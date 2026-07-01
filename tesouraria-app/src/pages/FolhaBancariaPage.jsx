import { Navigate } from 'react-router-dom'
import FolhaContaView from '../components/FolhaContaView'
import { useAuth } from '../hooks/useAuth'
import { nucleoTemContaBancaria } from '../lib/contaBancaria'

function FolhaBancariaPage() {
  const { nucleoProfile, profileLoading } = useAuth()

  if (!profileLoading && !nucleoTemContaBancaria(nucleoProfile)) {
    return <Navigate to="/folha-caixa" replace />
  }

  return (
    <FolhaContaView
      tipoConta="banco"
      titulo="Folha Bancária"
      descricao="Registo e consulta dos movimentos bancários do mês"
      linhaPrefixo="B"
      outraFolhaTo="/folha-caixa"
      outraFolhaLabel="← Ver folha de caixa"
    />
  )
}

export default FolhaBancariaPage
